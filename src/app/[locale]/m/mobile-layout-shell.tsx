'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Home, Upload, MessageSquare, User } from 'lucide-react'
import { useUnreadMessage } from '@/components/message/unread-message-context'

export function MobileLayoutShell({
  children,
  locale,
}: {
  children: ReactNode
  locale: string
}) {
  const pathname = usePathname()
  const { unreadCount } = useUnreadMessage()
  const [isParksMessages, setIsParksMessages] = useState(false)

  const isPolicySection = useMemo(
    () => !!pathname && pathname.startsWith(`/${locale}/m/policy`),
    [pathname, locale],
  )
  const isParksSection = useMemo(
    () => !!pathname && pathname.startsWith(`/${locale}/m/parks`),
    [pathname, locale],
  )

  // 仅在客户端通过 window.location.search 判断是否来自园区入口
  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return
    try {
      const sp = new URLSearchParams(window.location.search)
      const fromParks =
        pathname.startsWith(`/${locale}/m/chat`) && sp.get('from') === 'parks'
      setIsParksMessages(fromParks)
    } catch {
      setIsParksMessages(false)
    }
  }, [pathname, locale])

  const isParksContext = isParksSection || isParksMessages

  const tabs = useMemo(() => {
    // 绿色园区 H5：独立入口和“我的园区”
    if (isParksContext) {
      return [
        { key: 'home', labelZh: '首页', labelEn: 'Home', href: `/${locale}/m/parks`, Icon: Home },
        {
          key: 'messages',
          labelZh: '消息',
          labelEn: 'Messages',
          href: `/${locale}/m/chat?from=parks`,
          Icon: MessageSquare,
        },
        { key: 'me', labelZh: '我的', labelEn: 'Me', href: `/${locale}/m/parks/me`, Icon: User },
      ]
    }

    // 政策 H5：仅显示 首页/消息/我的
    if (isPolicySection) {
      return [
        { key: 'home', labelZh: '首页', labelEn: 'Home', href: `/${locale}/m/policy`, Icon: Home },
        {
          key: 'messages',
          labelZh: '消息',
          labelEn: 'Messages',
          href: `/${locale}/m/chat`,
          Icon: MessageSquare,
        },
        { key: 'me', labelZh: '我的', labelEn: 'Me', href: `/${locale}/m/me`, Icon: User },
      ]
    }

    // 默认：绿色技术平台 H5，保留“技术发布”
    return [
      { key: 'home', labelZh: '首页', labelEn: 'Home', href: `/${locale}/m/home`, Icon: Home },
      {
        key: 'publish',
        labelZh: '技术发布',
        labelEn: 'Publish',
        href: `/${locale}/m/me/technologies`,
        Icon: Upload,
      },
      {
        key: 'messages',
        labelZh: '消息',
        labelEn: 'Messages',
        href: `/${locale}/m/chat`,
        Icon: MessageSquare,
      },
      { key: 'me', labelZh: '我的', labelEn: 'Me', href: `/${locale}/m/me`, Icon: User },
    ]
  }, [locale, isPolicySection, isParksContext])

  // 根据路径推导当前激活的 tab
  const activeKey = useMemo(() => {
    if (!pathname) return ''
    // 绿色园区 H5
    if (
      pathname.startsWith(`/${locale}/m/parks/me`) ||
      pathname.startsWith(`/${locale}/m/parks/favorites`)
    ) {
      return 'me'
    }
    if (pathname.startsWith(`/${locale}/m/parks`)) return 'home'

    // 政策 H5
    if (pathname.startsWith(`/${locale}/m/policy`)) return 'home'

    // 技术 H5：发布 & 首页
    if (pathname.startsWith(`/${locale}/m/me/technologies`)) return 'publish'
    if (pathname.startsWith(`/${locale}/m/home`)) return 'home'

    // 通用消息与“我的”
    if (pathname.startsWith(`/${locale}/m/chat`)) return 'messages'
    if (pathname.startsWith(`/${locale}/m/me`)) return 'me'
    return ''
  }, [pathname, locale])

  const isEn = locale === 'en'

  // (auth) 分组下的登录/忘记密码不展示底部导航
  const isAuthPage = !!(
    pathname &&
    (pathname.startsWith(`/${locale}/m/login`) || pathname.startsWith(`/${locale}/m/forgot`))
  )

  // 详情页不展示底部导航（使用独立操作栏）
  const isTechDetail = !!(
    pathname &&
    (pathname.startsWith(`/${locale}/m/tech/`) ||
      pathname.startsWith(`/${locale}/m/me/technologies/`))
  )
  const isMessageDetail = !!(pathname && pathname.match(`/${locale}/m/chat/[^/]+$`))
  const isPolicyDetail = !!(
    pathname &&
    pathname.startsWith(`/${locale}/m/policy/`) &&
    !pathname.startsWith(`/${locale}/m/policy/favorites`)
  )
  const isParkDetail = !!(
    pathname &&
    pathname.startsWith(`/${locale}/m/parks/`) &&
    !pathname.startsWith(`/${locale}/m/parks/me`) &&
    !pathname.startsWith(`/${locale}/m/parks/favorites`)
  )

  const isPortalPage = pathname === `/${locale}/m`
  const showNav =
    !isAuthPage &&
    !isTechDetail &&
    !isMessageDetail &&
    !isPolicyDetail &&
    !isParkDetail &&
    !isPortalPage

  return (
    <div className="min-h-dvh bg-[#edeef7] flex flex-col">
      <main className={`flex-1 overflow-y-auto ${showNav ? 'pb-16' : ''}`}>{children}</main>
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 h-14 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div
            className={`mx-auto max-w-md h-full grid ${
              tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
            }`}
          >
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`flex flex-col items-center justify-center text-[11px] ${
                  activeKey === t.key ? 'text-[#00b899] font-medium' : 'text-gray-700'
                }`}
              >
                {/* icon with badge for messages */}
                <div className="relative mb-0.5">
                  <t.Icon
                    className={`${
                      activeKey === t.key ? 'stroke-[#00b899]' : 'stroke-current'
                    } w-[18px] h-[18px]`}
                  />
                  {t.key === 'messages' && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
                {/* label */}
                <span>{isEn ? t.labelEn : t.labelZh}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
