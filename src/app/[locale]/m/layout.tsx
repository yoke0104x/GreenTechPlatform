import { ReactNode, Suspense } from 'react'
import Script from 'next/script'
import { UnreadMessageProvider } from '@/components/message/unread-message-context'
import { LoadingOverlayProvider } from '@/components/common/loading-overlay'
import { MobileLayoutShell } from './mobile-layout-shell'

export default function MobileLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  return (
    <LoadingOverlayProvider>
      <Script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js" strategy="afterInteractive" />
      <Suspense fallback={null}>
        <UnreadMessageProvider>
          <MobileLayoutShell locale={locale}>{children}</MobileLayoutShell>
        </UnreadMessageProvider>
      </Suspense>
    </LoadingOverlayProvider>
  )
}
