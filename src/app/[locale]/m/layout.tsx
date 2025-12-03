'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useMemo } from 'react'
import { Home, Upload, MessageSquare, User } from 'lucide-react'
import { UnreadMessageProvider, useUnreadMessage } from '@/components/message/unread-message-context'
import { LoadingOverlayProvider } from '@/components/common/loading-overlay'

function MobileLayoutInner({
  children,
  locale,
}: {
  children: ReactNode
  locale: string
}) {
  const pathname = usePathname()
  const { unreadCount } = useUnreadMessage()
  const tabs = useMemo(
    () => [
      { key: 'home', labelZh: '首页', labelEn: 'Home', href: `/${locale}/m/policy`, Icon: Home },
      { key: 'publish', labelZh: '技术发布', labelEn: 'Publish', href: `/${locale}/m/me/technologies`, Icon: Upload },
      { key: 'messages', labelZh: '消息', labelEn: 'Messages', href: `/${locale}/m/chat`, Icon: MessageSquare },
      { key: 'me', labelZh: '我的', labelEn: 'Me', href: `/${locale}/m/me`, Icon: User },
    ],
    [locale],
  )
  // Derive active tab with precedence to longer, more specific paths
  const activeKey = useMemo(() => {
    if (!pathname) return ''
    if (pathname.startsWith(`/${locale}/m/me/technologies`)) return 'publish'
    if (pathname.startsWith(`/${locale}/m/policy`)) return 'home'
    if (pathname.startsWith(`/${locale}/m/chat`)) return 'messages'
    if (pathname.startsWith(`/${locale}/m/me`)) return 'me'
    return ''
  }, [pathname, locale])
  const isEn = locale === 'en'
  // Route groups like (auth) are not part of URL; detect auth pages explicitly
  const isAuthPage = !!(pathname && (pathname.startsWith(`/${locale}/m/login`) || pathname.startsWith(`/${locale}/m/forgot`)))
  // Show bottom nav on all non-auth pages, except detail pages where a local action bar exists
  const isTechDetail = !!(pathname && (pathname.startsWith(`/${locale}/m/tech/`) || pathname.startsWith(`/${locale}/m/me/technologies/`)))
  const isMessageDetail = !!(pathname && pathname.match(`/${locale}/m/chat/[^/]+$`))
  const showNav = !isAuthPage && !isTechDetail && !isMessageDetail

  return (
    <div className="min-h-dvh bg-[#edeef7] flex flex-col">
      <main className={`flex-1 overflow-y-auto ${showNav ? 'pb-16' : ''}`}>{children}</main>
      {showNav && (
      <nav className="fixed bottom-0 left-0 right-0 h-14 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-md h-full grid grid-cols-4">
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
                <t.Icon className={`${activeKey === t.key ? 'stroke-[#00b899]' : 'stroke-current'} w-[18px] h-[18px]`} />
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

export default function MobileLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  return (
    <LoadingOverlayProvider>
      <UnreadMessageProvider>
        <MobileLayoutInner locale={locale}>
          {children}
        </MobileLayoutInner>
      </UnreadMessageProvider>
    </LoadingOverlayProvider>
  )
}
