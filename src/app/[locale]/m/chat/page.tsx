"use client"

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Mail } from 'lucide-react'
import Script from 'next/script'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useUnreadMessage } from '@/components/message/unread-message-context'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
import { wechatAuthApi } from '@/api/wechat'
import {
  type InternalMessage,
  getReceivedInternalMessages,
  markInternalMessageAsRead,
  getUnreadInternalMessageCount,
  markInternalMessagesAsRead,
  markAllInternalMessagesAsRead,
  deleteInternalMessages,
  PARK_MESSAGE_CATEGORIES,
  SHARED_MESSAGE_CATEGORIES,
  DEFAULT_MESSAGE_CATEGORIES,
  POLICY_MESSAGE_CATEGORIES,
} from '@/lib/supabase/contact-messages'

type CategoryKey = 'all' | 'technical' | 'audit' | 'following' | 'security' | 'other'

interface MessageFilters {
  category: CategoryKey
  status: 'all' | 'read' | 'unread'
  searchKeyword: string
}
// Page-level wrapper to ensure useSearchParams is inside Suspense
export default function MobileChatPageWrapper() {
  return (
    <Suspense fallback={<section className="min-h-dvh" />}>
      <Script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js" strategy="afterInteractive" />
      <MobileChatPage />
    </Suspense>
  )
}

function MobileChatPage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale: 'en' | 'zh' = pathname.startsWith('/en') ? 'en' : 'zh'
  const [context, setContext] = useState<'default' | 'parks' | 'policy'>('default')
  const { user, loading: authLoading, checkUser } = useAuthContext()
  const { toast } = useToast()
  const { refreshUnreadCount, decrementUnreadCount, setUnreadCount: setGlobalUnreadCount } = useUnreadMessage()
  const { showLoading, hideLoading, resetLoading } = useLoadingOverlay()
  const isParkContext = context === 'parks'
  const isPolicyContext = context === 'policy'

  const allowedCategories = useMemo(() => {
    if (isParkContext) {
      return [...PARK_MESSAGE_CATEGORIES, ...SHARED_MESSAGE_CATEGORIES]
    }
    if (isPolicyContext) {
      return [...POLICY_MESSAGE_CATEGORIES, ...SHARED_MESSAGE_CATEGORIES]
    }
    return undefined
  }, [isParkContext, isPolicyContext])

  const includeNullCategories = useMemo(() => !isParkContext && !isPolicyContext, [isParkContext, isPolicyContext])

  const [messages, setMessages] = useState<InternalMessage[]>([])
  const [filtered, setFiltered] = useState<InternalMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [filters, setFilters] = useState<MessageFilters>({ category: 'all', status: 'all', searchKeyword: '' })
  const requestIdRef = useRef(0)
  const authRetryRef = useRef(false)
  const [subscribeLoading, setSubscribeLoading] = useState(false)

  const isWeChatEnv = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /MicroMessenger/i.test(navigator.userAgent || '')
  }, [])

  const formatWeChatSubscribeError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    const lower = msg.toLowerCase()
    if (lower.includes('self-signed certificate') || lower.includes('self signed certificate')) {
      return locale === 'en'
        ? 'WeChat gateway TLS verification failed (self-signed certificate). Please fix the gateway image CA/SSL settings and redeploy.'
        : '微信云托管网关 TLS 校验失败（self-signed certificate）。请在云托管镜像安装 CA 证书/修复 SSL 环境后重新部署。'
    }
    return msg
  }

  const getWeChatSignUrl = () => {
    if (typeof window === 'undefined') return ''
    const currentUrl = window.location.href.split('#')[0]
    const ua = window.navigator?.userAgent || ''
    const isIOS = /iphone|ipad|ipod/i.test(ua)

    // iOS WKWebView 下，微信 JS-SDK 签名 URL 常以首次进入页面 URL 为准（SPA 路由切换会导致签名不匹配）
    try {
      const key = 'wx_sign_url'
      const stored = window.sessionStorage.getItem(key)
      if (!stored) {
        window.sessionStorage.setItem(key, currentUrl)
        return currentUrl
      }
      return isIOS ? stored : currentUrl
    } catch {
      return currentUrl
    }
  }

  const openWeChatSubscribe = async (templateId?: string) => {
    if (typeof window === 'undefined') return false
    const wx = (window as any).wx
    if (!wx || !templateId) return false
    if (typeof wx.openSubscribeMessage !== 'function') {
      throw new Error(locale === 'en' ? 'Current WeChat version does not support subscribe dialog' : '当前微信版本不支持订阅授权弹窗')
    }

    const signUrl = getWeChatSignUrl()
    const cfgRes = await fetch(`/api/wechat/js-sdk-config?url=${encodeURIComponent(signUrl)}`, { cache: 'no-store' })
    const cfgJson = await cfgRes.json().catch(() => null) as any
    if (!cfgRes.ok || !cfgJson?.success || !cfgJson?.data) {
      const msg = cfgJson?.error || cfgJson?.message || '获取微信 JS-SDK 配置失败'
      throw new Error(msg)
    }

    const cfg = cfgJson.data as { appId: string; timestamp: number; nonceStr: string; signature: string }

    const wxDebug = typeof window !== 'undefined' && window.location.search.includes('wxdebug=1')

    await new Promise<void>((resolve, reject) => {
      try {
        wx.config({
          debug: wxDebug,
          appId: cfg.appId,
          timestamp: cfg.timestamp,
          nonceStr: cfg.nonceStr,
          signature: cfg.signature,
          jsApiList: ['openSubscribeMessage'],
        })
        wx.ready(() => resolve())
        wx.error((err: any) => {
          const em = err?.errMsg || err?.message || 'wx.config error'
          reject(new Error(`${em}${signUrl ? ` (signUrl=${signUrl})` : ''}`))
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error('wx.config error'))
      }
    })

    const apiOk: boolean = await new Promise((resolve) => {
      try {
        wx.checkJsApi({
          jsApiList: ['openSubscribeMessage'],
          success: (res: any) => resolve(Boolean(res?.checkResult?.openSubscribeMessage)),
          fail: () => resolve(false),
        })
      } catch {
        resolve(false)
      }
    })

    if (!apiOk) {
      throw new Error(locale === 'en' ? 'WeChat JS API not available: openSubscribeMessage' : '微信能力不可用：openSubscribeMessage')
    }

    await new Promise<void>((resolve, reject) => {
      try {
        wx.openSubscribeMessage({
          tmplIds: [templateId],
          success: () => resolve(),
          fail: (err: any) => {
            const em = err?.errMsg || err?.message || 'openSubscribeMessage failed'
            reject(new Error(em))
          },
          complete: () => {},
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error('openSubscribeMessage failed'))
      }
    })

    return true
  }

  useEffect(() => {
    resetLoading()
  }, [resetLoading])

  // 在客户端解析 ?from=parks / ?from=policy，避免使用 useSearchParams
  useEffect(() => {
    if (typeof window === 'undefined') {
      setContext('default')
      return
    }
    try {
      const sp = new URLSearchParams(window.location.search)
      const from = sp.get('from')
      if (from === 'parks') setContext('parks')
      else if (from === 'policy') setContext('policy')
      else {
        // 兜底：读取 sessionStorage 中最近的上下文
        const stored = window.sessionStorage.getItem('m_chat_context')
        if (stored === 'parks') setContext('parks')
        else if (stored === 'policy') setContext('policy')
        else setContext('default')
      }
    } catch {
      setContext('default')
    }
  }, [pathname])

  const maybeRecoverAuthOnce = async (error: unknown) => {
    if (authRetryRef.current) return false
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('未登录') && !message.includes('Invalid token')) return false

    authRetryRef.current = true

    if (typeof window !== 'undefined') {
      const customToken = window.localStorage.getItem('custom_auth_token')
      if (customToken) {
        const refreshToken = window.localStorage.getItem('custom_refresh_token')
        if (refreshToken) {
          try {
            const { customAuthApi } = await import('@/api/customAuth')
            await customAuthApi.refreshToken()
          } catch {
            // ignore
          }
        }

        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            window.localStorage.removeItem('custom_auth_token')
          }
        } catch {
          // ignore
        }
      }
    }

    try {
      await checkUser()
    } catch {
      // ignore
    }
    return true
  }

  // Category display mapping（园区入口下将“技术对接/发布审核”文案替换为“园区对接/用户反馈”）
  const categoryMap = useMemo(
    () => ({
      technical:
        locale === 'en'
          ? isParkContext
            ? 'Park Connection'
            : isPolicyContext
            ? 'Policy Consultation'
            : 'Technical Connection'
          : isParkContext
          ? '园区对接'
          : isPolicyContext
          ? '政策咨询'
          : '技术对接',
      audit:
        locale === 'en'
          ? isParkContext
            ? 'User Feedback'
            : 'Publication Review'
          : isParkContext
          ? '用户反馈'
          : '发布审核',
      following: locale === 'en' ? 'My Following' : '我的关注',
      security: locale === 'en' ? 'Security Messages' : '安全消息',
      other: locale === 'en' ? 'Other' : '其他',
    }),
    [locale, isParkContext, isPolicyContext],
  )

  const matchCategory = (m: InternalMessage, key: CategoryKey) => {
    const cat = (m.category ?? '').trim()
    switch (key) {
      case 'technical':
        // 技术对接 & 园区对接类消息（兼容历史数据）
        return (
          cat === '技术对接' ||
          cat === 'Technical Connection' ||
          cat === '园区对接' ||
          cat === 'Park Connection' ||
          cat === '政策咨询' ||
          cat === 'Policy Consultation' ||
          cat === '' ||
          cat === 'undefined'
        )
      case 'audit':
        // 发布审核 & 用户反馈
        return (
          cat === '发布审核' ||
          cat === 'Publication Review' ||
          cat === '用户反馈' ||
          cat === 'User Feedback'
        )
      case 'following':
        return cat === '我的关注' || cat === 'My Following'
      case 'security':
        return cat === '安全消息' || cat === 'Security Messages'
      case 'other':
        return cat === '其他' || cat === 'Other'
      case 'all':
      default:
        return true
    }
  }

  const loadMessages = async () => {
    if (!user) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    showLoading()
    try {
      let rawList: InternalMessage[] = []
      let unread = 0

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await Promise.all([
            getReceivedInternalMessages(
              allowedCategories
                ? { categories: allowedCategories, includeNull: includeNullCategories }
                : { excludeCategories: [...PARK_MESSAGE_CATEGORIES, ...POLICY_MESSAGE_CATEGORIES], includeNull: includeNullCategories },
            ),
            getUnreadInternalMessageCount(
              allowedCategories
                ? { categories: allowedCategories, includeNull: includeNullCategories }
                : { excludeCategories: [...PARK_MESSAGE_CATEGORIES, ...POLICY_MESSAGE_CATEGORIES], includeNull: includeNullCategories },
            ),
          ])
          rawList = res[0]
          unread = res[1]
          break
        } catch (e) {
          const recovered = attempt === 0 && (await maybeRecoverAuthOnce(e))
          if (!recovered) throw e
        }
      }

      // 保险起见：在策略上下文里再次在前端过滤，只保留“政策咨询 + 通用（安全消息/其他）”
      let list = rawList
      if (isPolicyContext && rawList.length) {
        list = rawList.filter((m) => {
          const c = (m.category ?? '').trim()
          return POLICY_MESSAGE_CATEGORIES.includes(c) || SHARED_MESSAGE_CATEGORIES.includes(c)
        })
      } else if (isParkContext && rawList.length) {
        list = rawList.filter((m) => {
          const c = (m.category ?? '').trim()
          return PARK_MESSAGE_CATEGORIES.includes(c) || SHARED_MESSAGE_CATEGORIES.includes(c)
        })
      }

      if (requestId === requestIdRef.current) {
        setMessages(list)
        setUnreadCount(unread)
      }
    } catch (e) {
      console.error('加载消息失败:', e)
      toast({
        title: locale === 'en' ? 'Loading Failed' : '加载失败',
        description: locale === 'en' ? 'Unable to load messages' : '无法加载消息列表',
        variant: 'destructive',
      })
    } finally {
      hideLoading()
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setMessages([])
      setUnreadCount(0)
      setSelectedIds(new Set())
      setIsAllSelected(false)
      setLoading(false)
      return
    }
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, allowedCategories, includeNullCategories])

  // Apply filters
  useEffect(() => {
    let list = [...messages]

    // 强制按上下文过滤，避免意外混入技术平台消息
    if (isPolicyContext) {
      list = list.filter((m) => {
        const c = (m.category ?? '').trim()
        return POLICY_MESSAGE_CATEGORIES.includes(c) || SHARED_MESSAGE_CATEGORIES.includes(c)
      })
    } else if (isParkContext) {
      list = list.filter((m) => {
        const c = (m.category ?? '').trim()
        return PARK_MESSAGE_CATEGORIES.includes(c) || SHARED_MESSAGE_CATEGORIES.includes(c)
      })
    }

    if (filters.category !== 'all') {
      list = list.filter((m) => matchCategory(m, filters.category))
    }
    if (filters.status === 'read') list = list.filter((m) => m.is_read)
    else if (filters.status === 'unread') list = list.filter((m) => !m.is_read)

    // 移动端不提供搜索框，省略关键词过滤
    setFiltered(list)
    setSelectedIds(new Set())
    setIsAllSelected(false)
  }, [messages, filters, categoryMap])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map((m) => m.id)))
      setIsAllSelected(true)
    } else {
      setSelectedIds(new Set())
      setIsAllSelected(false)
    }
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
    setIsAllSelected(next.size === filtered.length && filtered.length > 0)
  }

  const markAsReadOne = async (m: InternalMessage) => {
    if (m.is_read) return
    try {
      showLoading()
      await markInternalMessageAsRead(m.id)
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      decrementUnreadCount(1) // 更新全局未读数量
    } catch (e) {
      console.error('标记已读失败', e)
    } finally {
      hideLoading()
    }
  }

  const batchMarkAsRead = async () => {
    if (selectedIds.size === 0) {
      toast({ title: locale === 'en' ? 'Notice' : '提示', description: locale === 'en' ? 'Select messages first' : '请先选择消息' })
      return
    }
    setBatchLoading(true)
    showLoading()
    try {
      const ids = Array.from(selectedIds)
      await markInternalMessagesAsRead(ids)
      setMessages((prev) => prev.map((m) => (selectedIds.has(m.id) ? { ...m, is_read: true, read_at: new Date().toISOString() } : m)))
      const dec = messages.filter((m) => selectedIds.has(m.id) && !m.is_read).length
      setUnreadCount((c) => Math.max(0, c - dec))
      decrementUnreadCount(dec) // 更新全局未读数量
      setSelectedIds(new Set())
      setIsAllSelected(false)
      toast({ title: locale === 'en' ? 'Success' : '操作成功', description: locale === 'en' ? 'Marked as read' : '已标记为已读' })
    } catch (e) {
      console.error('批量标记已读失败', e)
      toast({ title: locale === 'en' ? 'Operation Failed' : '操作失败', description: locale === 'en' ? 'Failed to mark as read' : '标记已读失败', variant: 'destructive' })
    } finally {
      setBatchLoading(false)
      hideLoading()
    }
  }

  const batchDelete = async () => {
    if (selectedIds.size === 0) {
      toast({ title: locale === 'en' ? 'Notice' : '提示', description: locale === 'en' ? 'Select messages first' : '请先选择消息' })
      return
    }
    setBatchLoading(true)
    showLoading()
    try {
      const ids = Array.from(selectedIds)
      await deleteInternalMessages(ids)
      const dec = messages.filter((m) => selectedIds.has(m.id) && !m.is_read).length
      setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)))
      setUnreadCount((c) => Math.max(0, c - dec))
      decrementUnreadCount(dec) // 更新全局未读数量
      setSelectedIds(new Set())
      setIsAllSelected(false)
      toast({ title: locale === 'en' ? 'Success' : '操作成功', description: locale === 'en' ? 'Deleted messages' : '已删除所选消息' })
    } catch (e) {
      console.error('批量删除失败', e)
      toast({ title: locale === 'en' ? 'Operation Failed' : '操作失败', description: locale === 'en' ? 'Failed to delete' : '删除失败', variant: 'destructive' })
    } finally {
      setBatchLoading(false)
      hideLoading()
    }
  }

  const markAllAsRead = async () => {
    setBatchLoading(true)
    showLoading()
    try {
      await markAllInternalMessagesAsRead()
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
      setGlobalUnreadCount(0) // 更新全局未读数量为0
      toast({ title: locale === 'en' ? 'Success' : '操作成功', description: locale === 'en' ? 'All read' : '全部已读' })
    } catch (e) {
      console.error('全部已读失败', e)
      toast({ title: locale === 'en' ? 'Operation Failed' : '操作失败', description: locale === 'en' ? 'Failed to mark all' : '全部标记失败', variant: 'destructive' })
    } finally {
      setBatchLoading(false)
      hideLoading()
    }
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    // Mobile compact date like 10/15/24 in screenshot
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', { year: '2-digit', month: '2-digit', day: '2-digit' })
  }

  const chips: { key: CategoryKey; label: string; count?: number; color?: string }[] = useMemo(() => {
    const countByCategory = (key: CategoryKey) => messages.filter((m) => matchCategory(m, key)).length
    const list: { key: CategoryKey; label: string; count?: number; color?: string }[] = [
      { key: 'all', label: locale === 'en' ? 'All' : '全部', count: messages.length },
      {
        key: 'technical',
        label:
          locale === 'en'
            ? isParkContext
              ? 'Park Connection'
              : isPolicyContext
              ? 'Policy'
              : 'Technical'
            : categoryMap.technical,
        count: countByCategory('technical'),
        color: '#2563eb',
      },
    ]

    if (!isParkContext && !isPolicyContext) {
      list.push({
        key: 'audit',
        label: locale === 'en' ? 'Review' : categoryMap.audit,
        count: countByCategory('audit'),
        color: '#ea580c',
      })
    }

    list.push(
      {
        key: 'following',
        label: locale === 'en' ? 'Following' : categoryMap.following,
        count: countByCategory('following'),
        color: '#16a34a',
      },
      {
        key: 'security',
        label: locale === 'en' ? 'Security' : categoryMap.security,
        count: countByCategory('security'),
        color: '#dc2626',
      },
      {
        key: 'other',
        label: locale === 'en' ? 'Other' : categoryMap.other,
        count: countByCategory('other'),
        color: '#6b7280',
      },
    )

    return list
  }, [messages, locale, isParkContext, isPolicyContext, categoryMap])

  const renderCategoryBadge = (category?: string) => {
    const cat = (category ?? '').trim()
    const normalize = (val: string) => {
      if (['发布审核', 'Publication Review', '用户反馈', 'User Feedback'].includes(val)) return 'audit'
      if (['我的关注', 'My Following'].includes(val)) return 'following'
      if (['安全消息', 'Security Messages'].includes(val)) return 'security'
      if (['其他', 'Other'].includes(val)) return 'other'
      if (['园区对接', 'Park Connection'].includes(val)) return 'park'
      if (['政策咨询', 'Policy Consultation'].includes(val)) return 'policy'
      // default to technical
      return 'technical'
    }
    const kind = normalize(cat || (isParkContext ? '园区对接' : isPolicyContext ? '政策咨询' : '技术对接'))
    const classNameMap: Record<string, string> = {
      technical: 'bg-blue-50 text-blue-700 border-blue-100',
      park: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      audit: 'bg-orange-50 text-orange-700 border-orange-100',
      following: 'bg-green-50 text-green-700 border-green-100',
      security: 'bg-red-50 text-red-700 border-red-100',
      other: 'bg-gray-100 text-gray-700 border-gray-200',
      policy: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    }
    const label =
      kind === 'park'
        ? locale === 'en'
          ? 'Park Connection'
          : '园区对接'
        : kind === 'policy'
          ? locale === 'en'
            ? 'Policy Consultation'
            : '政策咨询'
          : kind === 'technical'
            ? locale === 'en'
              ? 'Technical Connection'
              : '技术对接'
            : kind === 'audit'
              ? locale === 'en'
                ? isParkContext
                  ? 'User Feedback'
                  : 'Publication Review'
                : isParkContext
                  ? '用户反馈'
                  : '发布审核'
              : kind === 'following'
                ? locale === 'en'
                  ? 'My Following'
                  : '我的关注'
                : kind === 'security'
                  ? locale === 'en'
                    ? 'Security'
                    : '安全消息'
                  : locale === 'en'
                    ? 'Other'
                    : '其他'

    return (
      <Badge className={`shrink-0 whitespace-nowrap border text-[11px] font-medium rounded-lg px-2 py-1 ${classNameMap[kind]}`}>
        {label}
      </Badge>
    )
  }

  if (!user) {
    return (
      <section className="min-h-dvh flex items-center justify-center">
        <div className="text-center text-gray-600">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="mb-4">{locale === 'en' ? 'Please login to view messages' : '请先登录查看消息'}</p>
          <button
            onClick={() => router.push(`/${locale}/m/login`)}
            className="h-11 px-5 rounded-xl bg-[#00b899] text-white"
          >
            {locale === 'en' ? 'Go to Login' : '前往登录'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-dvh" style={{ backgroundColor: '#edeef7' }}>
      {/* Header with title and tabs */}
      <div className="sticky top-0 z-40 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h1 className="text-[18px] font-bold text-gray-900">
            {locale === 'en' ? 'My Messages' : '我的消息'}
          </h1>
          {isWeChatEnv && (
            <button
              type="button"
              disabled={subscribeLoading}
              onClick={async () => {
                if (typeof window === 'undefined') return
                if (subscribeLoading) return
                setSubscribeLoading(true)
                try {
                  const origin = window.location.origin
                  const redirect = `${origin}/${locale}/m/chat${isParkContext ? '?from=parks' : isPolicyContext ? '?from=policy' : ''}`
                  const resp = await wechatAuthApi.getSubscribeUrl(redirect)
                  if (!resp.success || !resp.data?.url) {
                    throw new Error(resp.error || '获取订阅通知链接失败')
                  }

                  // 优先使用 JS-SDK 订阅接口（更稳定）
                  const wx = (window as any).wx
                  if (!wx) {
                    toast({
                      title: locale === 'en' ? 'Please retry' : '请稍后重试',
                      description: locale === 'en' ? 'WeChat JS-SDK is loading' : '微信能力加载中，请稍后再试',
                    })
                    return
                  }

                  const templateId = (resp.data as any).templateId as string | undefined
                  const usedJsSdk = await openWeChatSubscribe(templateId).catch((err) => {
                    toast({
                      title: locale === 'en' ? 'Failed' : '操作失败',
                      description: formatWeChatSubscribeError(err),
                      variant: 'destructive',
                    })
                    return false
                  })

                  if (!usedJsSdk) {
                    toast({
                      title: locale === 'en' ? 'Failed' : '订阅失败',
                      description: locale === 'en' ? 'Unable to open subscribe dialog' : '无法打开订阅授权弹窗，请稍后再试',
                      variant: 'destructive',
                    })
                  }
                } catch (e) {
                  toast({
                    title: locale === 'en' ? 'Failed' : '操作失败',
                    description: formatWeChatSubscribeError(e) || (locale === 'en' ? 'Failed to subscribe' : '订阅失败，请稍后再试'),
                    variant: 'destructive',
                  })
                } finally {
                  setSubscribeLoading(false)
                }
              }}
              className="h-8 px-3 rounded-full bg-white border border-gray-200 text-[12px] text-gray-700 disabled:opacity-60"
            >
              {subscribeLoading ? (locale === 'en' ? 'Opening…' : '打开中…') : (locale === 'en' ? 'Enable WeChat Notice' : '开启微信通知')}
            </button>
          )}
        </div>
        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {chips.map((c) => {
            const active = filters.category === c.key
            return (
              <button
                key={c.key}
                onClick={() => setFilters((p) => ({ ...p, category: c.key }))}
                className={`shrink-0 h-8 px-3 rounded-full border text-[12px] transition-colors ${
                  active ? 'bg-[#00b899] text-white border-[#00b899]' : 'bg-white text-gray-700 border-gray-200'
                }`}
                aria-pressed={active}
              >
                <span className="inline-flex items-center gap-1">
                  <span>{c.label}</span>
                  {typeof c.count === 'number' && (
                    <span
                      className={`font-semibold ${
                        active ? 'text-white' : 'text-blue-600'
                      }`}
                    >
                      ({c.count})
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
        {/* Status row (no search) */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-2 text-[12px] text-gray-600">
            <span>
              {locale === 'en' ? 'Selected' : '已选择'}: {selectedIds.size}
            </span>
            <span className="w-px h-3 bg-gray-300" />
            <span>
              {locale === 'en' ? 'Total' : '总条数'}: {filtered.length}
            </span>
            {unreadCount > 0 && (
              <span className="ml-1 text-red-600">
                {locale === 'en' ? 'Unread' : '未读'}: {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="px-3 pb-28 pt-3 max-w-md mx-auto">
        {authLoading || loading ? (
          <div className="py-16 text-center text-gray-500">{locale === 'en' ? 'Loading...' : '加载中...'}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            {locale === 'en' ? 'No messages' : '暂无消息'}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((m) => {
              const unread = !m.is_read
              const displayCategory = m.category || (locale === 'en' ? 'Technical Connection' : '技术对接')
              return (
                <li key={m.id}>
                  <div
                    className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const base = `${pathname}/${m.id}`
                      router.push(base)
                    }}
                  >
                    <div className="w-full text-left">
                      {/* Single-row aligned: checkbox, dot, icon, title, status */}
                      <div className="grid grid-cols-[58px_1fr_auto] items-center gap-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300"
                            checked={selectedIds.has(m.id)}
                            onChange={(e) => toggleSelectOne(m.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={`w-2 h-2 rounded-full ${unread ? 'bg-blue-500' : 'bg-transparent'}`} />
                          <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#2563eb] to-[#1e40af] flex items-center justify-center shadow-sm ring-1 ring-white/40">
                            <Mail className="w-4 h-4 text-white" strokeWidth={2.2} />
                          </div>
                        </div>
                        <div className={`text-left text-[14px] font-semibold leading-tight truncate ${unread ? 'text-gray-900' : 'text-gray-400'}`}>
                          {m.title}
                        </div>
                        {renderCategoryBadge(displayCategory)}
                      </div>
                      {/* content and date aligned with title (second column start) */}
                      <div className="mt-1.5 pl-[62px] text-[12px] text-gray-500 truncate">{m.content}</div>
                      <div className="mt-1.5 pl-[62px] text-[12px] text-gray-700">{formatDate(m.created_at)}</div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Bottom action bar - sits above tab bar */}
      <div className="fixed left-0 right-0 bottom-14 z-40">
        <div className="mx-auto max-w-md px-3 pb-3">
          <div className="h-12 rounded-2xl bg-white shadow border border-gray-100 flex items-center px-3 gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300"
                checked={isAllSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                disabled={filtered.length === 0}
              />
              <span>{locale === 'en' ? 'Select All' : '全选'}</span>
            </label>
            <span className="h-6 w-px bg-gray-200" />
            <button
              onClick={batchMarkAsRead}
              disabled={selectedIds.size === 0 || batchLoading}
              className={`px-3 h-8 rounded-full text-[12px] ${
                selectedIds.size === 0 || batchLoading
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {batchLoading ? (locale === 'en' ? 'Processing...' : '处理中...') : locale === 'en' ? 'Mark Read' : '标为已读'}
            </button>
            <button
              onClick={batchDelete}
              disabled={selectedIds.size === 0 || batchLoading}
              className={`px-3 h-8 rounded-full text-[12px] ${
                selectedIds.size === 0 || batchLoading
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {locale === 'en' ? 'Delete' : '删除'}
            </button>
            <button
              onClick={markAllAsRead}
              disabled={batchLoading || unreadCount === 0}
              className={`ml-auto px-3 h-8 rounded-full text-[12px] ${
                batchLoading || unreadCount === 0
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {locale === 'en' ? 'All Read' : '全部已读'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
