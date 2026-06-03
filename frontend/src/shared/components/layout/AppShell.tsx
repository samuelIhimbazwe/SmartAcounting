import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { Role } from '../../types/roles'
import { NavSidebar } from './NavSidebar'
import { OfflineSyncBanner } from '../../../components/desktop/OfflineSyncBanner'
import { TopBar } from './TopBar'
import { Breadcrumbs } from './Breadcrumbs'
import { MobileTabBar } from './MobileTabBar'

const AlertFeed = lazy(async () => {
  const module = await import('../../../features/alerts/components/AlertFeed')
  return { default: module.AlertFeed }
})

export function AppShell({
  children,
  role,
  mainClassName,
}: {
  children: ReactNode
  role: Role
  mainClassName?: string
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMenu = () => setMobileMenuOpen(false)

  useEffect(() => {
    document.body.classList.toggle('app-shell--menu-open', mobileMenuOpen)
    return () => document.body.classList.remove('app-shell--menu-open')
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const mainClasses = ['shell-main__content', 'shell-page-transition', mainClassName].filter(Boolean).join(' ')

  return (
    <div className="shell-layout">
      <a href="#main-content" className="shell-skip-link">
        {t('a11y.skipToMain')}
      </a>

      <aside className="shell-layout__sidebar">
        <NavSidebar role={role} />
      </aside>

      <div className="shell-layout__main">
        <OfflineSyncBanner />
        <TopBar
          role={role}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onOpenAlerts={() => setAlertsOpen(true)}
        />
        <div className="shell-main__inner">
          <Breadcrumbs />
          <main id="main-content" className={mainClasses} key={location.pathname}>
            {children}
          </main>
        </div>
      </div>

      <MobileTabBar role={role} />

      {mobileMenuOpen ? (
        <>
          <button type="button" className="shell-drawer-backdrop" onClick={closeMenu} aria-label={t('topbar.closeMenu')} />
          <div className="shell-drawer shell-drawer--menu" role="dialog" aria-modal="true" aria-label={t('nav.dashboardSuite')}>
            <NavSidebar role={role} variant="drawer" onNavigate={closeMenu} />
          </div>
        </>
      ) : null}

      {alertsOpen ? (
        <Suspense fallback={null}>
          <AlertFeed open={alertsOpen} onClose={() => setAlertsOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  )
}
