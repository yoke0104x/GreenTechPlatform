import { ReactNode, Suspense } from 'react'
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
      <UnreadMessageProvider>
        <Suspense fallback={null}>
          <MobileLayoutShell locale={locale}>{children}</MobileLayoutShell>
        </Suspense>
      </UnreadMessageProvider>
    </LoadingOverlayProvider>
  )
}
