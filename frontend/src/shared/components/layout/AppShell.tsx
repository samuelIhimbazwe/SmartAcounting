import { lazy, Suspense, type ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import type { Role } from '../../types/roles'
import { NavSidebar } from './NavSidebar'
import { OfflineBanner } from './OfflineBanner'
import { TopBar } from './TopBar'

const CopilotSidebar = lazy(async () => {
  const module = await import('../../../features/copilot/CopilotSidebar')
  return { default: module.CopilotSidebar }
})

const AlertFeed = lazy(async () => {
  const module = await import('../../../features/alerts/components/AlertFeed')
  return { default: module.AlertFeed }
})

export function AppShell({ children, role }: { children: ReactNode; role: Role }) {
  const { t } = useTranslation()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { online } = useNetworkStatus()

  return (
    <div className="flex min-h-screen bg-[var(--surface-raised)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm text-[var(--color-brand-900)] shadow focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        {t('a11y.skipToMain')}
      </a>
      <NavSidebar role={role} className="hidden lg:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        {!online && <OfflineBanner />}
        <TopBar onOpenMenu={() => setMobileMenuOpen(true)} onOpenAlerts={() => setAlertsOpen(true)} />
        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t('topbar.closeMenu')}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <NavSidebar role={role} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}
      <div className="hidden xl:block">
        <Suspense fallback={null}>
          <CopilotSidebar />
        </Suspense>
      </div>
      {alertsOpen && (
        <Suspense fallback={null}>
          <AlertFeed open={alertsOpen} onClose={() => setAlertsOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
