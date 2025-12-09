"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/auth/auth-provider'
import { ChevronRight, User, Shield, Building, Heart, MessageSquare, LogOut } from 'lucide-react'
import { logout } from '@/api/auth'

export default function MobileParksMePage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const basePath = locale === 'en' ? '/en' : '/zh'
  const { user } = useAuthContext()

  const needsBinding = !!user && !user.phone && !user.email

  return (
    <div className="min-h-dvh" style={{ backgroundColor: '#edeef7' }}>
      <div className="px-3 pt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[18px] font-semibold text-gray-900">
            {locale === 'en' ? 'My Parks' : '我的园区'}
          </h1>
        </div>

        {/* User Card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#00b899] to-[#009a7a] p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-semibold">
              {user?.phone?.slice(-4) || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold truncate">
                {user
                  ? user.phone || user.email || (locale === 'en' ? 'Verified User' : '已登录用户')
                  : locale === 'en'
                    ? 'Guest'
                    : '游客'}
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
                        {locale === 'en' ? 'Bind phone or email' : '去绑定手机或邮箱'}
                      </button>
                    )
                    : (user.phone || user.email)
                  : (locale === 'en' ? 'Please log in to access features' : '请登录以使用功能')
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

