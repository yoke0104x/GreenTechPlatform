"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Script from 'next/script'
import { flushSync } from 'react-dom'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuthContext } from '@/components/auth/auth-provider'
import { createContactMessage } from '@/lib/supabase/contact-messages'
import { isValidEmail, isValidPhone } from '@/lib/validators'
import { wechatAuthApi } from '@/api/wechat'

type ContactCategory = '技术对接' | '用户反馈' | '园区对接' | '政策咨询'

interface MobileContactUsModalProps {
  isOpen: boolean
  onClose: () => void
  technologyId?: string
  technologyName?: string
  companyName?: string
  locale?: string
  category?: ContactCategory
  source?: string
}

interface ContactFormData {
  contactName: string
  contactPhone: string
  contactEmail: string
  message: string
}

function isWeChatEnv() {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent || '')
}

function getWeChatSignUrl() {
  if (typeof window === 'undefined') return ''
  const currentUrl = window.location.href.split('#')[0]
  const ua = window.navigator?.userAgent || ''
  const isIOS = /iphone|ipad|ipod/i.test(ua)

  // iOS 微信：签名 URL 通常以首次进入页面 URL 为准（SPA 路由切换会导致签名不匹配）
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

async function ensureWxOpenTagReady() {
  if (typeof window === 'undefined') return false
  let wx = (window as any).wx
  if (!wx) {
    // 等待 Script 注入完成（避免用户快速提交后立即打开弹窗时 wx 还未挂载）
    const start = Date.now()
    while (!wx && Date.now() - start < 2500) {
      await new Promise((r) => setTimeout(r, 50))
      wx = (window as any).wx
    }
  }
  if (!wx) throw new Error('微信能力加载中，请稍后再试')

  const signUrl = getWeChatSignUrl()
  const cfgRes = await fetch(`/api/wechat/js-sdk-config?url=${encodeURIComponent(signUrl)}`, { cache: 'no-store' })
  const cfgJson = (await cfgRes.json().catch(() => null)) as any
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
        jsApiList: ['checkJsApi'],
        openTagList: ['wx-open-subscribe'],
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

  return true
}

export function MobileContactUsModal({
  isOpen,
  onClose,
  technologyId,
  technologyName,
  companyName,
  locale = 'zh',
  category,
  source,
}: MobileContactUsModalProps) {
  const { user } = useAuthContext()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [allowWeChatReply, setAllowWeChatReply] = useState(true)
  const [wechatPrepared, setWeChatPrepared] = useState(false)
  const [subscribeTemplateId, setSubscribeTemplateId] = useState<string | null>(null)
  const [openTagReady, setOpenTagReady] = useState(false)
  const [prepareError, setPrepareError] = useState<string | null>(null)
  const [prepareNonce, setPrepareNonce] = useState(0)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const subscribeTagRef = useRef<HTMLElement | null>(null)
  const autoClickRef = useRef(false)

  const translations = {
    zh: {
      contactUs: '联系我们',
      aboutTechnology: '关于技术：',
      contactName: '联系人姓名',
      contactPhone: '联系电话',
      contactEmail: '联系邮箱',
      message: '留言内容',
      allowWeChatReply: '允许回复消息发送到我的微信',
      allowWeChatDesc: '勾选后，回复将以微信通知推送到您的服务号。',
      required: '*',
      cancel: '取消',
      submit: '提交留言',
      submitting: '提交中...',
      placeholders: {
        name: '请输入您的姓名',
        phone: '请输入您的联系电话',
        email: '请输入您的邮箱地址',
        message: '请详细描述您的需求或问题...',
      },
      validation: {
        title: '验证失败',
        nameRequired: '请填写联系人姓名',
        phoneRequired: '请填写联系电话',
        emailRequired: '请填写联系邮箱',
        emailFormat: '请填写正确的邮箱格式',
        messageRequired: '请填写留言内容',
      },
      submitError: '提交失败',
      loginRequired: '请先登录后再联系我们',
      submitSuccess: '提交成功',
      successMessage: '您的留言已成功提交，我们会尽快与您联系！',
      errorMessage: '提交失败，请稍后重试',
      subscribeTitle: '开启微信通知',
      subscribeDesc: '为了将管理员回复推送到你的微信，请在微信弹窗中确认订阅通知。',
      skip: '取消',
      done: '完成',
    },
    en: {
      contactUs: 'Contact Us',
      aboutTechnology: 'About Technology: ',
      contactName: 'Contact Name',
      contactPhone: 'Phone Number',
      contactEmail: 'Email Address',
      message: 'Message',
      allowWeChatReply: 'Allow replies to be sent to my WeChat',
      allowWeChatDesc: 'If checked, admin replies will be pushed to your WeChat official account notifications.',
      required: '*',
      cancel: 'Cancel',
      submit: 'Submit Message',
      submitting: 'Submitting...',
      placeholders: {
        name: 'Please enter your name',
        phone: 'Please enter your phone number',
        email: 'Please enter your email address',
        message: 'Please describe your needs or questions in detail...',
      },
      validation: {
        title: 'Validation Failed',
        nameRequired: 'Please fill in contact name',
        phoneRequired: 'Please fill in phone number',
        emailRequired: 'Please fill in email address',
        emailFormat: 'Please enter a valid email format',
        messageRequired: 'Please fill in message content',
      },
      submitError: 'Submission Failed',
      loginRequired: 'Please login first to contact us',
      submitSuccess: 'Submitted Successfully',
      successMessage: 'Your message has been submitted successfully, we will contact you soon!',
      errorMessage: 'Submission failed, please try again later',
      subscribeTitle: 'Enable WeChat Notice',
      subscribeDesc: 'To receive admin replies on WeChat, please confirm the subscription in the WeChat popup.',
      skip: 'Cancel',
      done: 'Done',
    },
  }

  const t = translations[locale as keyof typeof translations] || translations.zh
  const isPolicyContext = category === '政策咨询' || source === 'policy'
  const isParkContext = category === '园区对接' || source === 'park'
  const subjectPrefix =
    locale === 'en'
      ? isPolicyContext
        ? 'About Policy: '
        : isParkContext
          ? 'About Park: '
          : t.aboutTechnology
      : isPolicyContext
        ? '关于政策：'
        : isParkContext
          ? '关于园区：'
          : t.aboutTechnology

  const [formData, setFormData] = useState<ContactFormData>({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    message: '',
  })

  useEffect(() => {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      contactName: user.name || '',
      contactPhone: user.phone || '',
      contactEmail: user.email || '',
    }))
  }, [user])

  // 关闭弹窗时重置状态（注意：提交后会关闭弹窗但需要继续展示订阅按钮，所以 showSubscribe 时不要清理）
  useEffect(() => {
    if (isOpen || showSubscribe) return
    setWeChatPrepared(false)
    setSubscribeTemplateId(null)
    setOpenTagReady(false)
    setPrepareError(null)
  }, [isOpen, showSubscribe])

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.contactName.trim()) {
      toast({ title: t.validation.title, description: t.validation.nameRequired, variant: 'destructive' })
      return false
    }
    if (!formData.contactPhone.trim()) {
      toast({ title: t.validation.title, description: t.validation.phoneRequired, variant: 'destructive' })
      return false
    }
    if (!formData.contactEmail.trim()) {
      toast({ title: t.validation.title, description: t.validation.emailRequired, variant: 'destructive' })
      return false
    }
    if (!isValidEmail(formData.contactEmail)) {
      toast({ title: t.validation.title, description: t.validation.emailFormat, variant: 'destructive' })
      return false
    }
    if (!isValidPhone(formData.contactPhone, '+86')) {
      toast({
        title: t.validation.title,
        description: locale === 'en' ? 'Please enter a valid phone number' : '请输入正确的手机号码',
        variant: 'destructive',
      })
      return false
    }
    if (!formData.message.trim()) {
      toast({ title: t.validation.title, description: t.validation.messageRequired, variant: 'destructive' })
      return false
    }
    return true
  }

  const shouldPromptSubscribe = useMemo(() => Boolean(isWeChatEnv() && allowWeChatReply), [allowWeChatReply])

  useEffect(() => {
    if (!showSubscribe) return
    if (typeof document === 'undefined') return

    const el = document.getElementById('subscribe-btn') as any
    if (!el) return

    subscribeTagRef.current = el

    const onSuccess = (e: any) => {
      const detail = e?.detail || {}
      const decision = subscribeTemplateId ? detail?.[subscribeTemplateId] : undefined
      if (decision === 'accept') {
        toast({ title: locale === 'en' ? 'Subscribed' : '订阅成功' })
      } else if (decision === 'reject') {
        toast({
          title: locale === 'en' ? 'Not enabled' : '未开启',
          description: locale === 'en' ? 'You can enable it later.' : '你可以稍后再开启。',
        })
      } else {
        toast({ title: locale === 'en' ? 'Done' : '已完成' })
      }
      setShowSubscribe(false)
    }
    const onError = (e: any) => {
      const detail = e?.detail || {}
      const code = detail.errCode ? String(detail.errCode) : ''
      const msg = detail.errMsg ? String(detail.errMsg) : 'subscribe error'
      toast({
        title: locale === 'en' ? 'Failed' : '订阅失败',
        description: `${code ? `${code} ` : ''}${msg}`.trim(),
        variant: 'destructive',
      })
    }

    el.addEventListener('success', onSuccess as any)
    el.addEventListener('error', onError as any)
    return () => {
      el.removeEventListener('success', onSuccess as any)
      el.removeEventListener('error', onError as any)
    }
  }, [showSubscribe, subscribeTemplateId, locale, toast])

  // 打开弹窗/展示订阅按钮时预热：拿模板ID + wx.config（openTagList）
  useEffect(() => {
    if (!isOpen && !showSubscribe) return
    if (!isWeChatEnv()) return
    if (typeof window === 'undefined') return
    if (!allowWeChatReply) return

    let cancelled = false
    setOpenTagReady(false)
    setPrepareError(null)
    ;(async () => {
      try {
        const origin = window.location.origin
        const from = isParkContext ? 'parks' : isPolicyContext ? 'policy' : ''
        const redirect = `${origin}/${locale}/m/chat${from ? `?from=${from}` : ''}`
        const resp = await wechatAuthApi.getSubscribeUrl(redirect)
        const dataAny = (resp as any)?.data as any
        if (!cancelled && resp.success && dataAny?.templateId) {
          setSubscribeTemplateId(String(dataAny.templateId))
        }

        try {
          await ensureWxOpenTagReady()
        } catch (e) {
          // iOS 微信常见问题：首次进入 URL 与当前 URL 不一致导致签名失败；清理缓存并重试一次
          const msg = e instanceof Error ? e.message : String(e)
          if (msg.includes('invalid signature')) {
            try {
              window.sessionStorage.removeItem('wx_sign_url')
              window.sessionStorage.setItem('wx_sign_url', window.location.href.split('#')[0])
            } catch {
              // ignore
            }
            await ensureWxOpenTagReady()
          } else {
            throw e
          }
        }

        if (!cancelled) {
          setWeChatPrepared(true)
          setOpenTagReady(true)
        }
      } catch (e) {
        if (cancelled) return
        setWeChatPrepared(false)
        setOpenTagReady(false)
        setPrepareError(e instanceof Error ? e.message : String(e))
        toast({
          title: locale === 'en' ? 'Failed' : '操作失败',
          description: e instanceof Error ? e.message : String(e),
          variant: 'destructive',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, showSubscribe, allowWeChatReply, locale, toast, isParkContext, isPolicyContext, prepareNonce])

  // 订阅按钮出现后：尝试自动触发一次（若被微信拦截，用户仍可手动点击按钮）
  useEffect(() => {
    if (!showSubscribe) {
      autoClickRef.current = false
      return
    }
    if (!openTagReady || !subscribeTemplateId) return
    if (autoClickRef.current) return
    if (typeof document === 'undefined') return

    const el = document.getElementById('subscribe-btn') as any
    if (!el?.click) return
    autoClickRef.current = true
    setTimeout(() => {
      try {
        el.click()
      } catch {
        // ignore
      }
    }, 0)
  }, [showSubscribe, openTagReady, subscribeTemplateId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({ title: t.submitError, description: t.loginRequired, variant: 'destructive' })
      return
    }
    if (!validateForm()) return

    setLoading(true)
    try {
      await createContactMessage({
        technology_id: technologyId,
        technology_name: technologyName,
        company_name: companyName,
        contact_name: formData.contactName,
        contact_phone: formData.contactPhone,
        contact_email: formData.contactEmail,
        message: formData.message,
        category: category ?? '技术对接',
        source,
      })

      toast({ title: t.submitSuccess, description: t.successMessage })
      setFormData({
        contactName: user.name || '',
        contactPhone: user.phone || '',
        contactEmail: user.email || '',
        message: '',
      })

      if (shouldPromptSubscribe) {
        // 先显示订阅按钮再关闭弹窗，避免状态被关闭回调清空
        flushSync(() => setShowSubscribe(true))
        onClose()
      } else {
        onClose()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t.errorMessage
      toast({ title: t.submitError, description: errorMessage, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      contactName: user?.name || '',
      contactPhone: user?.phone || '',
      contactEmail: user?.email || '',
      message: '',
    })
    setShowSubscribe(false)
    autoClickRef.current = false
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setWeChatPrepared(false)
      setSubscribeTemplateId(null)
      setOpenTagReady(false)
      setPrepareError(null)
      setShowSubscribe(false)
      autoClickRef.current = false
      onClose()
    }
  }

  return (
    <>
      {/* 确保微信 JS-SDK 可用（开放标签也依赖该脚本） */}
      <Script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js" strategy="afterInteractive" />

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{t.contactUs}</DialogTitle>
            {technologyName && (
              <p className="text-sm text-gray-600 mt-2">
                {subjectPrefix}
                <span className="font-medium">{technologyName}</span>
                {companyName && <span className="text-gray-500"> - {companyName}</span>}
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              <div className="space-y-1.5">
              <Label htmlFor="contactName">
                {t.contactName} <span className="text-red-500">{t.required}</span>
              </Label>
              <Input
                id="contactName"
                type="text"
                placeholder={t.placeholders.name}
                value={formData.contactName}
                onChange={(e) => handleInputChange('contactName', e.target.value)}
                required
                className="h-10"
              />
              </div>

              <div className="space-y-1.5">
              <Label htmlFor="contactPhone">
                {t.contactPhone} <span className="text-red-500">{t.required}</span>
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder={t.placeholders.phone}
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                required
                className="h-10"
              />
              </div>

              <div className="space-y-1.5">
              <Label htmlFor="contactEmail">
                {t.contactEmail} <span className="text-red-500">{t.required}</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder={t.placeholders.email}
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                required
                className="h-10"
              />
              </div>

              <div className="space-y-1.5">
              <Label htmlFor="message">
                {t.message} <span className="text-red-500">{t.required}</span>
              </Label>
              <Textarea
                id="message"
                placeholder={t.placeholders.message}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={3}
                className="resize-none"
                required
              />
              </div>

              {isWeChatEnv() && (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={allowWeChatReply}
                      onChange={(e) => setAllowWeChatReply(e.target.checked)}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-900">{t.allowWeChatReply}</div>
                      <div className="text-[12px] text-gray-500">{t.allowWeChatDesc}</div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2 pt-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#00b899] hover:bg-[#00a77f]">
                {loading ? t.submitting : t.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 提交后：在页面底部呈现官方示例的 wx-open-subscribe（用于触发微信原生授权面板） */}
      {showSubscribe && shouldPromptSubscribe && (
        <div className="fixed left-0 right-0 bottom-0 z-[9999] px-4 pb-6">
          <div className="mx-auto max-w-md rounded-2xl bg-white/95 backdrop-blur border border-gray-200 p-4 shadow-lg">
            <div className="text-[14px] font-medium text-gray-900">{t.subscribeTitle}</div>
            <div className="mt-1 text-[12px] text-gray-600">{t.subscribeDesc}</div>

            {prepareError && <div className="mt-2 text-[12px] text-red-600 break-all">{prepareError}</div>}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowSubscribe(false)}>
                {t.skip}
              </Button>
              {subscribeTemplateId && openTagReady ? (
                React.createElement(
                  'wx-open-subscribe' as any,
                  {
                    template: subscribeTemplateId,
                    id: 'subscribe-btn',
                    ref: (node: any) => {
                      subscribeTagRef.current = node
                    },
                  },
                  // 注意：按官方文档顺序与写法：slot="style" 内包一层 <style>
                  React.createElement('script', {
                    type: 'text/wxtag-template',
                    slot: 'style',
                    dangerouslySetInnerHTML: {
                      __html:
                        `<style>` +
                        `.subscribe-btn{color:#fff;background-color:#07c160;border:none;border-radius:12px;height:44px;width:100%;font-size:14px;}` +
                        `.subscribe-btn:active{opacity:.9;}` +
                        `</style>`,
                    },
                  }),
                  React.createElement('script', {
                    type: 'text/wxtag-template',
                    dangerouslySetInnerHTML: {
                      __html: `<button class="subscribe-btn">${locale === 'en' ? 'Agree' : '同意订阅'}</button>`,
                    },
                  }),
                )
              ) : (
                <Button
                  type="button"
                  className="w-full bg-[#07c160] hover:bg-[#06ad57] text-white"
                  disabled={!prepareError}
                  onClick={() => setPrepareNonce((v) => v + 1)}
                >
                  {prepareError ? (locale === 'en' ? 'Retry' : '重试') : locale === 'en' ? 'Preparing…' : '准备中…'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
