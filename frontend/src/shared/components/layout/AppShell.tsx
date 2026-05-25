import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { Role } from '../../types/roles'
import { useAuthStore } from '../../stores/authStore'
import { NavSidebar } from './NavSidebar'
import { OfflineSyncBanner } from '../../../components/desktop/OfflineSyncBanner'
import { TopBar } from './TopBar'

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
  const effectiveRoleProfile = useAuthStore((state) => state.effectiveRoleProfile)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMenu = () => setMobileMenuOpen(false)

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.classList.remove('app-shell--menu-open')
      return
    }
    document.body.classList.add('app-shell--menu-open')
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

  const mainClasses = ['app-shell__content', mainClassName].filter(Boolean).join(' ')

  return (
    <div className="app-shell" data-layout-variant={effectiveRoleProfile.layoutVariant ?? 'workspace'}>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm text-[var(--color-brand-900)] shadow focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        {t('a11y.skipToMain')}
      </a>

      <div className="app-shell__sidebar">
        <NavSidebar role={role} />
      </div>

      <div className="app-shell__main">
        <OfflineSyncBanner />
        <TopBar role={role} onOpenMenu={() => setMobileMenuOpen(true)} onOpenAlerts={() => setAlertsOpen(true)} />
        <main id="main-content" className={mainClasses}>
          {children}
        </main>
      </div>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop lg:hidden"
            onClick={closeMenu}
            aria-label={t('topbar.closeMenu')}
          />
          <div className="mobile-nav-drawer lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.dashboardSuite')}>
            <div className="mobile-nav-drawer__header">
              <p className="mobile-nav-drawer__title">{t('nav.dashboardSuite')}</p>
              <button
                type="button"
                className="mobile-nav-drawer__close"
                onClick={closeMenu}
                aria-label={t('topbar.closeMenu')}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mobile-nav-drawer__body">
              <NavSidebar role={role} onNavigate={closeMenu} />
            </div>
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
