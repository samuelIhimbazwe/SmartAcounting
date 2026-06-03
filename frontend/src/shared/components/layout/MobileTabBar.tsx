import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, Landmark, Menu, Package, ScanBarcode } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { Role } from '../../types/roles'
import { getDefaultRoute } from '../../routing/getDefaultRoute'
import { useAuthStore } from '../../stores/authStore'
import { NavSidebar } from './NavSidebar'

type TabDef =
  | { id: string; labelKey: string; icon: typeof BarChart3; home: true }
  | { id: string; labelKey: string; icon: typeof BarChart3; to: string }
  | { id: string; labelKey: string; icon: typeof BarChart3; drawer: true }

const TABS: TabDef[] = [
  { id: 'home', labelKey: 'nav.dashboard', icon: BarChart3, home: true },
  { id: 'sales', labelKey: 'nav.salesPos', icon: ScanBarcode, to: '/pos' },
  { id: 'stock', labelKey: 'nav.inventoryHub', icon: Package, to: '/retail' },
  { id: 'finance', labelKey: 'nav.financeHub', icon: Landmark, to: '/finance/fx-rates' },
  { id: 'more', labelKey: 'nav.more', icon: Menu, drawer: true },
]

export function MobileTabBar({ role }: { role: Role }) {
  const { t } = useTranslation()
  const permissions = useAuthStore((s) => s.permissions)
  const effectiveRoleProfile = useAuthStore((s) => s.effectiveRoleProfile)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const homePath = getDefaultRoute(role, permissions, effectiveRoleProfile)

  return (
    <>
      <nav className="shell-tabbar" aria-label="Primary">
        {TABS.map((tab) => {
          const Icon = tab.icon
          if ('drawer' in tab) {
            return (
              <button
                key={tab.id}
                type="button"
                className="shell-tabbar__item"
                onClick={() => setDrawerOpen(true)}
              >
                <Icon size={20} aria-hidden />
                <span>{t(tab.labelKey)}</span>
              </button>
            )
          }
          const to = 'home' in tab ? homePath : tab.to
          return (
            <NavLink
              key={tab.id}
              to={to}
              className={({ isActive }) => `shell-tabbar__item${isActive ? ' shell-tabbar__item--active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon size={20} aria-hidden />
              <span>{t(tab.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      {drawerOpen ? (
        <>
          <button type="button" className="shell-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Close menu" />
          <div className="shell-drawer" role="dialog" aria-modal="true" aria-label={t('nav.more')}>
            <div className="shell-drawer__header">
              <p>{t('nav.more')}</p>
              <button type="button" className="shell-drawer__close" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <NavSidebar role={role} variant="drawer" onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      ) : null}
    </>
  )
}
