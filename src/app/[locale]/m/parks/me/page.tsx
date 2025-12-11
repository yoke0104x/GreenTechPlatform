"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/auth/auth-provider'
import { ChevronRight, User, Shield, Building, Heart, MessageSquare, LogOut, Crown } from 'lucide-react'

export default function MobileParksMePage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const basePath = locale === 'en' ? '/en' : '/zh'
  const { user, logout } = useAuthContext()

  const displayName = user
    ? user.name || user.email || user.phone || (locale === 'en' ? 'Guest' : '访客')
    : locale === 'en'
      ? 'Not logged in'
      : '未登录'
  const initial = user ? (displayName?.charAt(0)?.toUpperCase() || 'U') : null
  const needsBinding = !!user && !user.phone && !user.email

  return (
    <div className="min-h-dvh" style={{ backgroundColor: '#edeef7' }}>
      <div className="px-3 pt-4 pb-6">
        {/* User Card (same as 技术平台“我的”) */}
        <div className="rounded-3xl bg-gradient-to-br from-[#10b981] to-[#059669] px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <div className="relative w-14 h-14 rounded-full bg-white/95 overflow-hidden shadow">
                <div className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold text-[#007f66]">
                  {initial}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget.style.display = 'none') }}
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center text-[18px] font-semibold text-[#007f66] shadow">
                {user ? initial : <User className="w-7 h-7" />}
              </div>
            )}
            <div className="min-w-0 text-white flex-1">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-[18px] font-semibold truncate">{displayName}</div>
                  {user && (
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white/20 text-[12px]">
                      {locale==='en'?'Regular User':'普通用户'} <Crown className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                {!user && (
                  <button
                    onClick={()=>router.push(`${basePath}/m/login`)}
                    className="h-8 px-3 rounded-lg bg-white/20 text-white text-[12px] font-medium border border-white/30 hover:bg-white/30 transition-colors"
                  >
                    {locale==='en'?'Go to Login':'去登录'}
                  </button>
                )}
              </div>
              <div className="text-[12px] opacity-90 truncate">
                {user
                  ? needsBinding
                    ? (
                      <button
                        type="button"
                        onClick={() => router.push(`${basePath}/m/me/basic`)}
                        className="underline text-white/90 hover:text-white"
                      >
                        {locale==='en' ? 'Bind phone or email' : '去绑定手机或邮箱'}
                      </button>
                    )
                    : (user.phone || user.email)
                  : (locale==='en'?'Please log in to access features':'请登录以使用功能')
                }
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="mt-7 space-y-3">
          <OptionTile
            icon={<User className="w-5 h-5" />}
            label={locale === 'en' ? 'Basic Info' : '基本信息'}
            onClick={() => router.push(`${basePath}/m/me/basic`)}
          />
          <OptionTile
            icon={<Shield className="w-5 h-5" />}
            label={locale === 'en' ? 'Account Security' : '账户安全'}
            onClick={() => router.push(`${basePath}/m/me/security`)}
          />
          <OptionTile
            icon={<Building className="w-5 h-5" />}
            label={locale === 'en' ? 'Company Info' : '企业信息'}
            onClick={() => router.push(`${basePath}/m/me/company`)}
          />
          <OptionTile
            icon={<Heart className="w-5 h-5" />}
            label={locale === 'en' ? 'My Park Favorites' : '我的园区收藏'}
            onClick={() => router.push(`${basePath}/m/parks/favorites`)}
          />
          <OptionTile
            icon={<MessageSquare className="w-5 h-5" />}
            label={locale === 'en' ? 'Feedback' : '问题反馈'}
            onClick={() => router.push(`${basePath}/m/me/feedback`)}
          />
          <OptionTile
            icon={<LogOut className="w-5 h-5" />}
            label={locale === 'en' ? 'Sign Out' : '退出登录'}
            danger
            onClick={async () => {
              try {
                await logout()
                router.push(`${basePath}/m/login`)
              } catch {
                router.push(`${basePath}/m/login`)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

function OptionTile({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 h-[56px] rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 flex items-center justify-between ${
        danger ? 'text-red-600' : 'text-gray-900'
      } active:scale-[0.99] transition`}
    >
      <span className="inline-flex items-center gap-3">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${
            danger ? 'bg-red-50 text-red-600' : 'bg-[#e6fffa] text-[#00b899]'
          } shadow-sm`}
        >
          {icon}
        </span>
        <span className="text-[14px] font-medium">{label}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  )
}
