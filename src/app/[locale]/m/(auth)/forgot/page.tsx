'use client'

import { Suspense, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { isValidEmail, isValidPhone, emailError, phoneError } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { ArrowLeft } from 'lucide-react'

// 强制动态渲染，避免预渲染时的 searchParams/Suspense 报错
export const dynamic = 'force-dynamic'

export default function MobileForgotPasswordPage() {
  return (
    <Suspense fallback={<section className="min-h-dvh" />}>
      <section className="min-h-dvh relative flex flex-col bg-[radial-gradient(120%_60%_at_50%_-10%,#e9e7ff_0%,#ffffff_60%)]">
        {/* 顶部右侧语言切换（iPhone 安全区适配） */}
        <div
          className="fixed z-50"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 8px)'
          }}
        >
          <LanguageSwitcher className="text-[12px]" hideIcon />
        </div>

        <ForgotContent />
      </section>
    </Suspense>
  )
}

function ForgotContent() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('auth')
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'

  // 1=选择方式, 2=验证码, 3=设置新密码
  const [step, setStep] = useState<1|2|3>(1)
  const [method, setMethod] = useState<'email'|'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  const sendCode = async () => {
    const target = method === 'email' ? email : phone
    if (!target) {
      alert(method==='email' ? (locale==='en'?'Please enter email address':'请输入邮箱地址') : (locale==='en'?'Please enter phone number':'请输入手机号'))
      return
    }
    if (method==='email') {
      if (!isValidEmail(email)) { alert(emailError(locale as any)); return }
    } else {
      if (!isValidPhone(phone, '+86')) { alert(phoneError(locale as any)); return }
    }
    setSending(true)
    try {
      const r = method==='email'
        ? await authApi.sendEmailCode({ email, purpose: 'reset_password' })
        : await authApi.sendPhoneCode({ phone, purpose: 'reset_password', countryCode: '+86' })
      if (r.success) {
        setCountdown(60)
        const timer = setInterval(() => setCountdown(p=>{ if(p<=1){ clearInterval(timer); return 0 } return p-1 }), 1000)
        setStep(2)
        alert(locale==='en'?'Verification code sent':'验证码已发送')
      } else {
        const err = 'error' in r ? (r as any).error : ('message' in r ? (r as any).message : undefined)
        alert(err || (locale==='en'?'Failed to send code':'发送验证码失败'))
      }
    } finally { setSending(false) }
  }

  const verifyThenNext = async () => {
    if (!code) { alert(locale==='en'?'Please enter verification code':'请输入验证码'); return }
    const vr = await authApi.verifyCode({ code, email: method==='email'?email:undefined, phone: method==='phone'?phone:undefined, purpose: 'reset_password' })
    if (vr.success && 'data' in vr && (vr as any).data?.valid) {
      setStep(3)
    } else {
      const msg = 'data' in vr && (vr as any).data?.message
      alert(msg || (locale==='en'?'Invalid verification code':'验证码错误'))
    }
  }

  const submitReset = async () => {
    if (!newPassword || !confirmPassword) { alert(locale==='en'?'Please fill in all information':'请填写完整信息'); return }
    if (newPassword !== confirmPassword) { alert(locale==='en'?'Passwords do not match':'两次输入的密码不一致'); return }
    if (newPassword.length < 6) { alert(locale==='en'?'Password must be at least 6 characters':'密码长度至少6位'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: method==='email'?email:undefined, phone: method==='phone'?phone:undefined, newPassword })
      })
      const result = await resp.json()
      if (resp.ok && result.success) {
        alert(locale==='en'?'Password reset successful! Please log in again':'密码重置成功！请重新登录')
        router.replace(`/${locale}/m/login`)
      } else {
        alert(result.error || (locale==='en'?'Password reset failed':'密码重置失败'))
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="px-3 pt-12 pb-6 flex-1">
      {/* 顶部左侧返回按钮（iPhone 安全区适配，固定视口） */}
      <div
        className="fixed z-50"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 8px)'
        }}
      >
        <button
          onClick={() => {
            try {
              // Prefer history back if available and referrer is same-origin
              // @ts-ignore idx from Next.js
              const idx = (window.history as any)?.state?.idx
              const sameOriginReferrer = document.referrer && (() => { try { return new URL(document.referrer).origin === window.location.origin } catch { return false } })()
              if ((typeof idx === 'number' && idx > 0) || sameOriginReferrer) {
                router.back()
              } else {
                router.replace(`/${locale}/m/login`)
              }
            } catch {
              router.replace(`/${locale}/m/login`)
            }
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 backdrop-blur border border-gray-200 text-gray-700 hover:bg-white"
          aria-label={locale==='en' ? 'Back' : '返回'}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[12px]">{locale==='en' ? 'Back' : '返回'}</span>
        </button>
      </div>
      <div className="mx-auto w-full max-w-[360px] rounded-[18px] bg-white/70 backdrop-blur-md p-4 shadow-sm border border-white/50">
        <h1 className="text-[16px] font-semibold text-gray-900 text-center mb-3">{locale==='en'?'Password Recovery':'密码找回'}</h1>

        {step===1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 bg-[#f5f6ff] rounded-full p-0.5">
              <button onClick={()=>setMethod('email')} className={`h-9 rounded-full text-[13px] font-medium ${method==='email'?'bg-white text-gray-900 shadow':'text-gray-500'}`}>{locale==='en'?'Email':'邮箱'}</button>
              <button onClick={()=>setMethod('phone')} className={`h-9 rounded-full text-[13px] font-medium ${method==='phone'?'bg-white text-gray-900 shadow':'text-gray-500'}`}>{locale==='en'?'Phone (SMS)':'手机(SMS)'}</button>
            </div>
            {method==='email' ? (
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={locale==='en'?'Email address':'邮箱地址'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
            ) : (
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder={locale==='en'?'Phone number':'输入手机号'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
            )}
            <button onClick={sendCode} disabled={sending} className={`w-full h-11 rounded-xl text-white font-medium text-[14px] ${sending?'bg-gray-400':'bg-[#00b899] hover:bg-[#009a7a] active:opacity-90'}`}>{countdown>0?`${countdown}s`:(locale==='en'?'Send Code':'发送验证码')}</button>
          </div>
        )}

        {step===2 && (
          <div className="space-y-3">
            <input type="text" value={code} onChange={e=>setCode(e.target.value)} placeholder={locale==='en'?'6-digit code':'6位验证码'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
            <button onClick={verifyThenNext} className="w-full h-11 rounded-xl text-white font-medium text-[14px] bg-[#00b899] hover:bg-[#009a7a] active:opacity-90">{locale==='en'?'Next':'下一步'}</button>
            <button onClick={()=>setStep(1)} className="w-full h-11 rounded-xl text-[14px] border border-gray-200 text-gray-700 bg-white">{locale==='en'?'Back':'返回'}</button>
          </div>
        )}

        {step===3 && (
          <form className="space-y-3" onSubmit={(e)=>{e.preventDefault(); submitReset()}}>
            <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder={locale==='en'?'New password':'新密码'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={locale==='en'?'Confirm password':'确认新密码'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
            <button type="submit" disabled={loading} className={`w-full h-11 rounded-xl text-white font-medium text-[14px] ${loading?'bg-gray-400':'bg-[#00b899] hover:bg-[#009a7a] active:opacity-90'}`}>{locale==='en'?'Reset Password':'重置密码'}</button>
            <button type="button" onClick={()=>router.replace(`/${locale}/m/login`)} className="w-full h-11 rounded-xl text-[14px] border border-gray-200 text-gray-700 bg-white">{locale==='en'?'Back to Login':'返回登录'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
