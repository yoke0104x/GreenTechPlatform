"use client"

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { wechatAuthApi } from '@/api/wechat'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useLoadingOverlay } from '@/components/common/loading-overlay'

export const dynamic = 'force-dynamic'

export default function WechatCallbackPage() {
  return (
    <Suspense fallback={<section className="min-h-dvh flex items-center justify-center"><span className="text-sm text-gray-600">Loading...</span></section>}>
      <WechatCallbackContent />
    </Suspense>
  )
}

function WechatCallbackContent() {
  const router = useRouter()
  const pathname = usePathname()
  const { checkUser } = useAuthContext()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const { showLoading, hideLoading } = useLoadingOverlay()

  const [message, setMessage] = useState(locale === 'en' ? 'Signing in with WeChat...' : '正在通过微信登录...')

  useEffect(() => {
    if (typeof window === 'undefined') {
      setMessage(locale === 'en' ? 'Missing code parameter' : '缺少code参数')
      return
    }
    let code = ''
    let state = ''
    try {
      const sp = new URLSearchParams(window.location.search)
      code = sp.get('code') || ''
      state = sp.get('state') || ''
    } catch {
      code = ''
      state = ''
    }
    if (!code) {
      setMessage(locale === 'en' ? 'Missing code parameter' : '缺少code参数')
      return
    }

    (async () => {
      try {
        showLoading(locale === 'en' ? 'Signing in...' : '正在登录...')
        const res = await wechatAuthApi.loginByCode({ code, state })
        if (res.success && res.data) {
          await checkUser()
          if (res.data.isNewUser) {
            router.replace(`/${locale}/m/company-profile`)
          } else {
            router.replace(`/${locale}/m/home`)
          }
        } else {
          setMessage(res.error || (locale === 'en' ? 'WeChat login failed' : '微信登录失败'))
        }
      } catch (e) {
        setMessage(locale === 'en' ? 'WeChat login failed' : '微信登录失败')
      } finally {
        hideLoading()
      }
    })()
    return () => hideLoading()
  }, [searchParams, router, checkUser, locale, showLoading, hideLoading])

  return (
    <section className="min-h-dvh flex items-center justify-center">
      <div className="text-sm text-gray-600">{message}</div>
    </section>
  )
}
