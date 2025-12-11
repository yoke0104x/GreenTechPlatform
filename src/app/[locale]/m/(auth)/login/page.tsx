'use client'

import { useState, useMemo, Suspense, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { isValidEmail, isValidPhone, emailError, phoneError } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { customAuthApi } from '@/api/customAuth'
import { tencentSmsAuthApi } from '@/api/tencentSmsAuth'
import { useAuthContext } from '@/components/auth/auth-provider'
import { emailVerificationApi } from '@/api/emailVerification'
import { supabase } from '@/lib/supabase'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { wechatAuthApi } from '@/api/wechat'

export default function MobileLoginPage() {
  // Wrap searchParams consumer in Suspense to satisfy Next.js requirement
  return (
    <Suspense fallback={<section className="min-h-dvh" />}> 
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('auth')
  const th = useTranslations('home')
  const tf = useTranslations('footer')
  const { checkUser } = useAuthContext()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'

  // 0 = 验证码登录，1 = 密码登录
  const [tab, setTab] = useState<0 | 1>(0)
  const [isRegister, setIsRegister] = useState(false)
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 注册相关状态（沿用 Web 端逻辑，仅调整样式）
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCode, setRegCode] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regShowPassword, setRegShowPassword] = useState(false)
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false)
  const [regSending, setRegSending] = useState(false)
  const [regCountdown, setRegCountdown] = useState(0)
  const [countryCode] = useState('+86')

  // 使用全局 Supabase 客户端，确保会话能被全局 AuthProvider 识别

  const goAfterLogin = () => router.replace(`/${locale}/m/home`)
  const goAfterRegister = () => router.push(`/${locale}/company-profile`)

  // 从 URL 解析 ?register=1，避免使用 useSearchParams 触发 Suspense 限制
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsRegister(false)
      return
    }
    try {
      const sp = new URLSearchParams(window.location.search)
      setIsRegister(sp.get('register') === '1')
    } catch {
      setIsRegister(false)
    }
  }, [pathname])

  // 微信登录
  async function handleWeChatLogin() {
    try {
      // 简单检测是否在微信内置浏览器
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
      const inWeChat = ua.includes('micromessenger')
      if (!inWeChat) {
        alert(locale === 'en' ? 'Please open in WeChat to continue' : '请在微信内打开完成登录')
        return
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectUri = `${origin}/${locale}/m/wechat/callback`
      const resp = await wechatAuthApi.getOAuthUrl(redirectUri)
      if (resp.success && resp.data?.url) {
        window.location.href = resp.data.url
      } else {
        alert(resp.error || (locale==='en' ? 'Failed to start WeChat login' : '获取微信登录链接失败'))
      }
    } catch (e) {
      alert(locale==='en' ? 'Failed to start WeChat login' : '发起微信登录失败')
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!account || !password) {
      alert(locale === 'en' ? 'Please fill account and password' : '请填写账号和密码')
      return
    }
    const type = isValidEmail(account) ? 'email' : 'phone'
    if (type === 'email') {
      if (!isValidEmail(account)) { alert(emailError(locale as any)); return }
    } else {
      if (!isValidPhone(account, '+86')) { alert(phoneError(locale as any)); return }
    }
    setLoading(true)
    try {
      let ok = false
      if (type === 'phone') {
        try {
          const r = await customAuthApi.phoneLogin({ phone: account, password, countryCode: '+86' })
          if (r.success && r.data) ok = true
        } catch {}
      }
      if (!ok) {
        const r = await authApi.passwordLogin({ account, password, type })
        if (r.success && 'data' in r && r.data) {
          localStorage.setItem('access_token', r.data.token)
          if (r.data.refreshToken) localStorage.setItem('refresh_token', r.data.refreshToken)
          ok = true
        } else if ('error' in r) {
          alert(r.error)
        }
      }
      if (ok) { await checkUser(); alert(locale==='en'?'Login successful':'登录成功'); goAfterLogin() }
      else { alert(locale==='en'?'Login failed, please check your account and password':'登录失败，请检查账号与密码') }
    } finally { setLoading(false) }
  }

  async function handleSendCode() {
    if (!isValidPhone(phone, '+86')) { alert(phoneError(locale as any)); return }
    setSending(true)
    try {
      const r = await tencentSmsAuthApi.sendPhoneCode({ phone, purpose: 'login', countryCode: '+86' })
      if (r.success) {
        setCountdown(60)
        const timer = setInterval(() => setCountdown(p => { if (p <= 1) { clearInterval(timer); return 0 } return p - 1 }), 1000)
      } else {
        const errMsg = ('error' in r ? (r as any).error : ('message' in r ? (r as any).message : undefined)) as string | undefined
        alert(errMsg || (locale==='en'?'Failed to send code':'发送验证码失败'))
      }
    } finally { setSending(false) }
  }

  async function handleSmsLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidPhone(phone, '+86')) { alert(phoneError(locale as any)); return }
    if (!code) { alert(locale==='en'?'Please enter verification code':'请输入验证码'); return }
    setLoading(true)
    try {
      const r = await tencentSmsAuthApi.phoneCodeLogin({ phone, code, countryCode: '+86' })
      if (r.success && r.data) {
        localStorage.setItem('access_token', r.data.token)
        if (r.data.refreshToken) localStorage.setItem('refresh_token', r.data.refreshToken)
        await checkUser(); alert(locale==='en'?'Login successful':'登录成功'); goAfterLogin()
      } else {
        const errMsg = ('error' in r ? (r as any).error : ('message' in r ? (r as any).message : undefined)) as string | undefined
        alert(errMsg || (locale==='en'?'Login failed':'登录失败'))
      }
    } finally { setLoading(false) }
  }

  // 发送注册验证码（tab 0: 邮箱验证码；tab 1: 手机验证码）
  async function handleSendRegisterCode() {
    const phoneMode = tab === 1
    const target = phoneMode ? regPhone : regEmail
    if (!target) {
      alert(phoneMode ? (locale==='en'?'Please enter phone number':'请输入手机号') : (locale==='en'?'Please enter email address':'请输入邮箱地址'))
      return
    }
    if (phoneMode) {
      if (!isValidPhone(regPhone, countryCode)) { alert(phoneError(locale as any)); return }
    } else {
      if (!isValidEmail(regEmail)) { alert(emailError(locale as any)); return }
    }

    setRegSending(true)
    try {
      let r
      if (phoneMode) {
        r = await authApi.sendPhoneCode({ phone: regPhone, purpose: 'register', countryCode })
      } else {
        r = await emailVerificationApi.sendCode({ email: regEmail })
      }
      if (r.success) {
        setRegCountdown(60)
        const timer = setInterval(() => setRegCountdown(p => { if (p<=1) { clearInterval(timer); return 0 } return p-1 }), 1000)
        const devCode = (r as any).data?.debugCode || (r as any).data?.devOTP
        if (devCode) {
          alert(locale==='en'?`Verification code sent! Dev: ${devCode}`:`验证码已发送！开发码：${devCode}`)
        } else {
          alert(locale==='en'?'Verification code sent':'验证码已发送')
        }
      } else {
        const errMsg = ('error' in r ? (r as any).error : ('message' in r ? (r as any).message : undefined)) as string | undefined
        alert(errMsg || (locale==='en'?'Failed to send code':'发送验证码失败'))
      }
    } finally {
      setRegSending(false)
    }
  }

  // 提交注册（tab 0: 邮箱注册；tab 1: 手机注册）
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const phoneMode = tab === 1
    if (!regCode || !regPassword || !regConfirmPassword) {
      alert(locale==='en'?'Please fill in all information':'请填写完整信息')
      return
    }
    if (regPassword !== regConfirmPassword) {
      alert(locale==='en'?'Passwords do not match':'两次输入的密码不一致')
      return
    }
    if (regPassword.length < 6) {
      alert(locale==='en'?'Password must be at least 6 characters':'密码长度至少6位')
      return
    }
    try {
      setLoading(true)
      let result
      if (phoneMode) {
        if (!isValidPhone(regPhone, countryCode)) { alert(phoneError(locale as any)); return }
        result = await customAuthApi.phoneRegister({
          phone: regPhone,
          phoneCode: regCode,
          password: regPassword,
          name: undefined,
          countryCode,
        })
      } else {
        if (!isValidEmail(regEmail)) { alert(emailError(locale as any)); return }
        result = await emailVerificationApi.register({
          email: regEmail,
          code: regCode,
          password: regPassword,
        })
        // 邮箱注册：若返回 token，同步设置全局 Supabase 会话
        if (result.success && 'data' in result && (result as any).data?.token) {
          const data: any = (result as any).data
          try { localStorage.setItem('access_token', data.token); if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken) } catch {}
          try { await supabase.auth.setSession({ access_token: data.token, refresh_token: data.refreshToken || '' }) } catch {}
        }
      }
      if (result.success && 'data' in result && result.data) {
        // 手机注册：如果带 token，一并持久化，保证后续页面立即识别为登录态
        const data: any = (result as any).data
        if (data?.token) {
          try { localStorage.setItem('access_token', data.token); if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken) } catch {}
        }
        await checkUser()
        alert(locale==='en'?'Registration successful!':'注册成功！')
        // 直接跳转完善企业信息页（已改为移动端路由）
        router.replace(`/${locale}/m/company-profile`)
      } else {
        alert('error' in result ? (result as any).error : (locale==='en'?'Registration failed':'注册失败'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-dvh relative flex flex-col bg-[radial-gradient(120%_60%_at_50%_-10%,#e9e7ff_0%,#ffffff_60%)]">
      {/* 顶部右侧语言切换（iPhone 安全区适配，固定视口） */}
      <div
        className="fixed z-50"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 8px)'
        }}
      >
        <LanguageSwitcher className="text-[12px]" hideIcon />
      </div>
      {/* 顶部 Logo 与标题（更紧凑） */}
      <div className="px-4 pt-10 pb-4 text-center">
        <div className="mx-auto w-12 h-12 relative rounded-md overflow-hidden shadow-sm">
          <Image src="/images/logo/绿盟logo.png" alt="logo" fill className="object-contain" />
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-gray-900">{th('heroTitle')}</h1>
      </div>

      {/* 卡片容器（更靠下 + 毛玻璃效果） */}
      <div className="px-3 mt-4">
        <div className="mx-auto w-full max-w-[360px] rounded-[18px] bg-white/60 backdrop-blur-md p-4 shadow-sm border border-white/40">
          {/* Tabs：根据模式切换标题（国际化） */}
          <div className="mb-3 grid grid-cols-2 bg-[#f5f6ff] rounded-full p-0.5">
            <button onClick={() => setTab(0)} className={`h-9 rounded-full text-[13px] font-medium ${tab===0?'bg-white text-gray-900 shadow':'text-gray-500'}`}>
              {isRegister ? (locale==='en' ? 'Email Register' : '邮箱注册') : t('loginWithPassword')}
            </button>
            <button onClick={() => setTab(1)} className={`h-9 rounded-full text-[13px] font-medium ${tab===1?'bg-white text-gray-900 shadow':'text-gray-500'}`}>
              {isRegister ? (locale==='en' ? 'SMS Register' : '手机验证码注册') : (locale==='en' ? 'Login with SMS' : t('loginWithVerification'))}
            </button>
          </div>

          {!isRegister ? (
            tab === 0 ? (
            <form className="space-y-3" onSubmit={handlePasswordLogin}>
              <input type="text" value={account} onChange={(e)=>setAccount(e.target.value)} placeholder={locale==='en'?'Phone / Email':'手机号 / 邮箱'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
              <div className="relative">
                <input type={showPassword?'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={locale==='en'?'Password':'密码'} className="w-full h-11 px-3 pr-9 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setShowPassword(v=>!v)} aria-label="toggle password">{showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
              </div>
              {/* 辅助链接：注册 / 忘记密码 */}
              <div className="flex items-center justify-between text-[13px] mt-1">
                <button type="button" onClick={() => router.push(`/${locale}/m/login?register=1`)} className="text-gray-600">
                  {locale==='en' ? (<><span>Don't have an account? </span><span className="text-[#00b899]">Sign up</span></>) : (<><span>还没有账户？</span><span className="text-[#00b899]">立即注册</span></>)}
                </button>
                <button type="button" onClick={() => router.push(`/${locale}/m/forgot`)} className="text-[#00b899]">{locale==='en' ? 'Forgot Password?' : '忘记密码'}</button>
              </div>
              <button type="submit" disabled={loading} className={`w-full h-11 rounded-xl text-white font-medium text-[14px] ${loading?'bg-gray-400':'bg-[#00b899] hover:bg-[#009a7a] active:opacity-90'}`}>{t('login')}</button>
            </form>
            ) : (
              <form className="space-y-3" onSubmit={handleSmsLogin}>
              <input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder={locale==='en'?'Phone number':'输入手机号'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
              {/* 内嵌按钮的验证码输入框 */}
              <div className="flex items-center h-11 rounded-xl bg-gray-50 border border-transparent focus-within:border-[#00b899]">
                <input type="text" value={code} onChange={(e)=>setCode(e.target.value)} placeholder={locale==='en'?'6-digit code':'6位短信验证码'} className="flex-1 h-full px-3 bg-transparent outline-none text-[14px]" />
                <button type="button" onClick={handleSendCode} disabled={sending||countdown>0||!isValidPhone(phone,'+86')} className={`mr-1 my-1 h-[38px] px-3 rounded-lg text-[13px] border ${sending||countdown>0?'text-gray-400 border-gray-200 bg-gray-100':'text-[#6b6ee2] border-[#d7d8fb] bg-[#eef0ff]'}`}>{countdown>0?`${countdown}s`:t('sendVerificationCode')}</button>
              </div>
              {/* 辅助链接（验证码登录不显示“忘记密码”） */}
              <div className="flex items-center justify-start text-[13px] mt-1 gap-3">
                <button type="button" onClick={() => router.push(`/${locale}/m/login?register=1`)} className="text-gray-600">
                  {locale==='en' ? (<><span>Don't have an account? </span><span className="text-[#00b899]">Sign up</span></>) : (<><span>还没有账户？</span><span className="text-[#00b899]">立即注册</span></>)}
                </button>
              </div>
              <button type="submit" disabled={loading} className={`w-full h-11 rounded-xl text-white font-medium text-[14px] ${loading?'bg-gray-400':'bg-[#00b899] hover:bg-[#009a7a] active:opacity-90'}`}>{t('login')}</button>
            </form>
            )
          ) : (
            tab === 0 ? (
              <form className="space-y-3" onSubmit={handleRegister}>
                <input type="email" value={regEmail} onChange={(e)=>setRegEmail(e.target.value)} placeholder={locale==='en'?'Email address':'邮箱地址'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                <div className="flex items-center h-11 rounded-xl bg-gray-50 border border-transparent focus-within:border-[#00b899]">
                  <input type="text" value={regCode} onChange={(e)=>setRegCode(e.target.value)} placeholder={locale==='en'?'Email code':'邮箱验证码'} className="flex-1 h-full px-3 bg-transparent outline-none text-[14px]" />
                  <button type="button" onClick={handleSendRegisterCode} disabled={regSending||regCountdown>0||!isValidEmail(regEmail)} className={`mr-1 my-1 h-[38px] px-3 rounded-lg text-[13px] border ${regSending||regCountdown>0?'text-gray-400 border-gray-200 bg-gray-100':'text-[#6b6ee2] border-[#d7d8fb] bg-[#eef0ff]'}`}>{regCountdown>0?`${regCountdown}s`:t('sendVerificationCode')}</button>
                </div>
                <div className="relative">
                  <input type={regShowPassword?'text':'password'} value={regPassword} onChange={(e)=>setRegPassword(e.target.value)} placeholder={locale==='en'?'Set password':'设置密码'} className="w-full h-11 px-3 pr-9 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setRegShowPassword(v=>!v)} aria-label="toggle password">{regShowPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
                <div className="relative">
                  <input type={regShowConfirmPassword?'text':'password'} value={regConfirmPassword} onChange={(e)=>setRegConfirmPassword(e.target.value)} placeholder={locale==='en'?'Confirm password':'确认密码'} className="w-full h-11 px-3 pr-9 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setRegShowConfirmPassword(v=>!v)} aria-label="toggle password">{regShowConfirmPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-1">
                  <button type="button" onClick={() => router.replace(`/${locale}/m/login`)} className="text-gray-600">
                    {locale==='en' ? (<><span>Already have an account? </span><span className="text-[#00b899]">Sign in</span></>) : (<><span>已有账户？</span><span className="text-[#00b899]">立即登录</span></>)}
                  </button>
                </div>
                <button type="submit" disabled={loading} className={`w-full h-11 rounded-xl text-white font-medium text-[14px] ${loading?'bg-gray-400':'bg-[#00b899] hover:bg-[#009a7a] active:opacity-90'}`}>{t('register')}</button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={handleRegister}>
                <input type="tel" value={regPhone} onChange={(e)=>setRegPhone(e.target.value)} placeholder={locale==='en'?'Phone number':'输入手机号'} className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                <div className="flex items-center h-11 rounded-xl bg-gray-50 border border-transparent focus-within:border-[#00b899]">
                  <input type="text" value={regCode} onChange={(e)=>setRegCode(e.target.value)} placeholder={locale==='en'?'6-digit code':'6位短信验证码'} className="flex-1 h-full px-3 bg-transparent outline-none text-[14px]" />
                  <button type="button" onClick={handleSendRegisterCode} disabled={regSending||regCountdown>0||!isValidPhone(regPhone,countryCode)} className={`mr-1 my-1 h-[38px] px-3 rounded-lg text-[13px] border ${regSending||regCountdown>0?'text-gray-400 border-gray-200 bg-gray-100':'text-[#6b6ee2] border-[#d7d8fb] bg-[#eef0ff]'}`}>{regCountdown>0?`${regCountdown}s`:t('sendVerificationCode')}</button>
                </div>
                <div className="relative">
                  <input type={regShowPassword?'text':'password'} value={regPassword} onChange={(e)=>setRegPassword(e.target.value)} placeholder={locale==='en'?'Set password':'设置密码'} className="w-full h-11 px-3 pr-9 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setRegShowPassword(v=>!v)} aria-label="toggle password">{regShowPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
                <div className="relative">
                  <input type={regShowConfirmPassword?'text':'password'} value={regConfirmPassword} onChange={(e)=>setRegConfirmPassword(e.target.value)} placeholder={locale==='en'?'Confirm password':'确认密码'} className="w-full h-11 px-3 pr-9 rounded-xl bg-gray-50 border border-transparent focus:border-[#00b899] outline-none text-[14px]" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setRegShowConfirmPassword(v=>!v)} aria-label="toggle password">{regShowConfirmPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-1">
                  <button type="button" onClick={() => router.replace(`/${locale}/m/login`)} className="text-gray-600">
                    {locale==='en' ? (
                      <>
                        <span>Already have an account? </span>
                        <span className="text-[#00b899]">Sign in</span>
                      </>
                    ) : (
                      <>
                        <span>已有账户？</span>
                        <span className="text-[#00b899]">立即登录</span>
                      </>
                    )}
                  </button>
                </div>
                <button type="submit" disabled={loading} className={`w-full h-11 rounded-xl text-white font-medium text-[14px] ${loading?'bg-gray-400':'bg-[#00b899] hover:bg-[#009a7a] active:opacity-90'}`}>{t('register')}</button>
              </form>
            )
          )}

      {!isRegister && (
        <>
          {/* 微信登录（仅登录模式显示） */}
          <div className="mt-5 text-center">
            <button type="button" onClick={handleWeChatLogin} className="inline-flex items-center gap-2 text-gray-700 text-[14px]">
              <img src="/images/icons/微信.png" alt="wechat" className="w-4 h-4"/>
              <span className="text-[12px]">{locale==='en' ? 'WeChat Login' : '微信登录'}</span>
            </button>
          </div>
        </>
      )}

        </div>
      </div>

      {/* 协议固定在页面底部（登录页无底部导航） */}
      <div className="px-3 mt-auto pb-6 text-[11px] text-gray-500 text-center">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-[#6b6ee2] w-3.5 h-3.5 rounded" />
          <span>
            {locale==='en' ? 'I have read and agree to the' : '我已阅读并同意'}
            <a href={`/${locale}/terms-of-service`} target="_blank" className="mx-1 text-[#6b6ee2] underline">《{tf('termsOfService')}》</a>
            <a href={`/${locale}/privacy-policy`} target="_blank" className="text-[#6b6ee2] underline">《{tf('privacyPolicy')}》</a>
          </span>
        </label>
      </div>

      <div className="mt-2 py-3 text-center text-[11px] text-gray-400">© {new Date().getFullYear()} — Green Tech Platform</div>
    </section>
  )
}
