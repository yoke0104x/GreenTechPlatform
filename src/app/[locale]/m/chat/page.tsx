"use client"

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useUnreadMessage } from '@/components/message/unread-message-context'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
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
      <MobileChatPage />
    </Suspense>
  )
}

function MobileChatPage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale: 'en' | 'zh' = pathname.startsWith('/en') ? 'en' : 'zh'
  const [isParkContext, setIsParkContext] = useState(false)
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { refreshUnreadCount, decrementUnreadCount, setUnreadCount: setGlobalUnreadCount } = useUnreadMessage()
  const { showLoading, hideLoading } = useLoadingOverlay()

  const allowedCategories = useMemo(
    () =>
      isParkContext
        ? [...PARK_MESSAGE_CATEGORIES, ...SHARED_MESSAGE_CATEGORIES]
        : undefined,
    [isParkContext],
  )
  const includeNullCategories = useMemo(() => !isParkContext, [isParkContext])

  const [messages, setMessages] = useState<InternalMessage[]>([])
  const [filtered, setFiltered] = useState<InternalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [filters, setFilters] = useState<MessageFilters>({ category: 'all', status: 'all', searchKeyword: '' })

  // 在客户端解析 ?from=parks，避免使用 useSearchParams
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsParkContext(false)
      return
    }
    try {
      const sp = new URLSearchParams(window.location.search)
      setIsParkContext(sp.get('from') === 'parks')
    } catch {
      setIsParkContext(false)
    }
  }, [pathname])

  // Category display mapping（园区入口下将“技术对接/发布审核”文案替换为“园区对接/用户反馈”）
  const categoryMap = useMemo(
    () => ({
      technical:
        locale === 'en'
          ? isParkContext
            ? 'Park Connection'
            : 'Technical Connection'
          : isParkContext
          ? '园区对接'
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
    [locale, isParkContext],
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
    setLoading(true)
    showLoading()
    try {
      const [list, unread] = await Promise.all([
        getReceivedInternalMessages(
          allowedCategories
            ? { categories: allowedCategories, includeNull: includeNullCategories }
            : { excludeCategories: PARK_MESSAGE_CATEGORIES, includeNull: includeNullCategories },
        ),
        getUnreadInternalMessageCount(
          allowedCategories
            ? { categories: allowedCategories, includeNull: includeNullCategories }
            : { excludeCategories: PARK_MESSAGE_CATEGORIES, includeNull: includeNullCategories },
        ),
      ])
      setMessages(list)
      setUnreadCount(unread)
    } catch (e) {
      console.error('加载消息失败:', e)
      toast({
        title: locale === 'en' ? 'Loading Failed' : '加载失败',
        description: locale === 'en' ? 'Unable to load messages' : '无法加载消息列表',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      hideLoading()
    }
  }

  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allowedCategories, includeNullCategories])

  // Apply filters
  useEffect(() => {
    let list = [...messages]
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
        label: locale === 'en' ? (isParkContext ? 'Park Connection' : 'Technical') : categoryMap.technical,
        count: countByCategory('technical'),
        color: '#2563eb',
      },
    ]

    if (!isParkContext) {
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
  }, [messages, locale, isParkContext, categoryMap])

  const renderCategoryBadge = (category?: string) => {
    const cat = (category ?? '').trim()
    const normalize = (val: string) => {
      if (['发布审核', 'Publication Review', '用户反馈', 'User Feedback'].includes(val)) return 'audit'
      if (['我的关注', 'My Following'].includes(val)) return 'following'
      if (['安全消息', 'Security Messages'].includes(val)) return 'security'
      if (['其他', 'Other'].includes(val)) return 'other'
      if (['园区对接', 'Park Connection'].includes(val)) return 'park'
      // default to technical
      return 'technical'
    }
    const kind = normalize(cat || (isParkContext ? '园区对接' : '技术对接'))
    const classNameMap: Record<string, string> = {
      technical: 'bg-blue-50 text-blue-700 border-blue-100',
      park: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      audit: 'bg-orange-50 text-orange-700 border-orange-100',
      following: 'bg-green-50 text-green-700 border-green-100',
      security: 'bg-red-50 text-red-700 border-red-100',
      other: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    const label =
      kind === 'park'
        ? locale === 'en'
          ? 'Park Connection'
          : '园区对接'
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
        <h1 className="text-[18px] font-bold text-gray-900 mb-2">
          {locale === 'en' ? 'My Messages' : '我的消息'}
        </h1>
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
        {loading ? (
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
