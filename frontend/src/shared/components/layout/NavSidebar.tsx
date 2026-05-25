import { useMemo, useState } from 'react'
import { ChevronLeft, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { accessibleDashboardRoles } from '../../security/roleAccess'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../types/roles'
import {
  filterNavItems,
  NAV_GROUP_ORDER,
  ROLE_DASHBOARD_ICON,
  ROLE_DASHBOARD_LABEL,
  roleDashboardPath,
  type NavGroupKey,
  type NavItem,
} from './navConfig'

const COLLAPSE_KEY = 'smartchain_nav_collapsed'

interface NavSidebarProps {
  role: Role
  className?: string
  onNavigate?: () => void
}

function matchesSearch(item: { searchLabel: string; label: string }, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }
  return item.searchLabel.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
}

export function NavSidebar({ role, className, onNavigate }: NavSidebarProps) {
  const { t } = useTranslation()
  const permissions = useAuthStore((state) => state.permissions)
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const effectiveRoleProfile = useAuthStore((state) => state.effectiveRoleProfile)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        sessionStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const dashboards = useMemo(
    () =>
      accessibleDashboardRoles(role, permissions, effectiveRoleProfile)
        .map((r) => ({
          id: `dashboard-${r}`,
          to: roleDashboardPath(r),
          label: ROLE_DASHBOARD_LABEL[r],
          searchLabel: ROLE_DASHBOARD_LABEL[r],
          icon: ROLE_DASHBOARD_ICON[r],
        })),
    [role, permissions, effectiveRoleProfile],
  )

  const navItems = useMemo(
    () => filterNavItems(hasPermission, effectiveRoleProfile.navItemIds),
    [hasPermission, effectiveRoleProfile.navItemIds],
  )

  const grouped = useMemo(() => {
    const map = new Map<NavGroupKey, NavItem[]>()
    for (const key of NAV_GROUP_ORDER) {
      map.set(key, [])
    }
    for (const item of navItems) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    return map
  }, [navItems])

  const filteredDashboards = dashboards.filter((d) => matchesSearch(d, query))
  const filteredGroups = NAV_GROUP_ORDER.map((groupKey) => {
    const items = (grouped.get(groupKey) ?? [])
      .map((item) => ({ item, label: t(item.labelKey) }))
      .filter(({ item, label }) => matchesSearch({ searchLabel: item.searchLabel, label }, query))
    return { groupKey, items }
  }).filter((g) => g.groupKey !== 'nav.groupOverview' && g.items.length > 0)

  const showOverview = filteredDashboards.length > 0
  const showEmpty = !showOverview && filteredGroups.length === 0 && query.trim().length > 0

  return (
    <aside
      className={`nav-sidebar ${className ?? ''}`}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label={t('nav.dashboardSuite')}
    >
      <button
        type="button"
        className="nav-collapse-btn"
        onClick={toggleCollapsed}
        aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        title={collapsed ? t('nav.expand') : t('nav.collapse')}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </button>

      <div className="nav-brand">
        <div className="nav-brand__mark" aria-hidden>
          SC
        </div>
        <div className="nav-brand__text">
          <div className="nav-brand__name">SmartAccounting</div>
          <div className="nav-brand__tagline">{t('nav.dashboardSuite')}</div>
        </div>
      </div>

      <div className="nav-search">
        <Search className="nav-search__icon h-4 w-4" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
        />
      </div>

      <div className="nav-scroll">
        {showEmpty ? <p className="nav-empty">{t('nav.searchEmpty')}</p> : null}

        {showOverview ? (
          <section className="nav-group">
            <span className="nav-group__label">{t('nav.groupOverview')}</span>
            <ul className="nav-list">
              {filteredDashboards.map((d) => {
                const Icon = d.icon
                return (
                  <li key={d.id}>
                    <NavLink
                      to={d.to}
                      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      onClick={onNavigate}
                      title={d.label}
                    >
                      <span className="nav-link__icon">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="nav-link__label">{d.label}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {filteredGroups.map(({ groupKey, items }) => (
          <section key={groupKey} className="nav-group">
            <span className="nav-group__label">{t(groupKey)}</span>
            <ul className="nav-list">
              {items.map(({ item, label }) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      onClick={onNavigate}
                      title={label}
                    >
                      <span className="nav-link__icon">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="nav-link__label">{label}</span>
                      {item.badge ? <span className="nav-link__badge">{item.badge}</span> : null}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  )
}
