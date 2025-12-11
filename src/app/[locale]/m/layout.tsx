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
      <Suspense fallback={null}>
        <UnreadMessageProvider>
          <MobileLayoutShell locale={locale}>{children}</MobileLayoutShell>
        </UnreadMessageProvider>
      </Suspense>
    </LoadingOverlayProvider>
  )
}
