import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../types/roles'
import { getDefaultRoute } from '../../routing/getDefaultRoute'
import { filterNavItems, type NavItem } from './navConfig'
import { NAV_SECTIONS, resolveVisibleSections } from './navSections'
import { SidebarFooter } from './SidebarFooter'

const COLLAPSE_KEY = 'smartaccounting-sidebar-collapsed'

interface NavSidebarProps {
  role: Role
  className?: string
  variant?: 'sidebar' | 'drawer'
  onNavigate?: () => void
}

function isPathActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

function groupIsActive(pathname: string, children: NavItem[]) {
  return children.some((child) => isPathActive(pathname, child.to))
}

export function NavSidebar({ role, className, variant = 'sidebar', onNavigate }: NavSidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const tenantId = useAuthStore((s) => s.tenantId)
  const permissions = useAuthStore((s) => s.permissions)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const effectiveRoleProfile = useAuthStore((s) => s.effectiveRoleProfile)

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const dashboardPath = useMemo(
    () => getDefaultRoute(role, permissions, effectiveRoleProfile),
    [role, permissions, effectiveRoleProfile],
  )

  const navItems = useMemo(
    () => filterNavItems(hasPermission, effectiveRoleProfile.navItemIds),
    [hasPermission, effectiveRoleProfile.navItemIds],
  )

  const sections = useMemo(() => resolveVisibleSections(navItems, NAV_SECTIONS), [navItems])

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const section of sections) {
      for (const entry of section.entries) {
        if (entry.kind === 'group' && groupIsActive(location.pathname, entry.children)) {
          next[entry.id] = true
        }
      }
    }
    setExpanded((prev) => ({ ...prev, ...next }))
  }, [location.pathname, sections])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const tenantLabel = tenantId ? tenantId.slice(0, 8) : t('nav.dashboard')

  return (
    <aside
      className={`shell-sidebar ${variant === 'drawer' ? 'shell-sidebar--drawer' : ''} ${className ?? ''}`}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label={t('nav.dashboardSuite')}
    >
      <div className="shell-sidebar__brand">
        <span className="shell-sidebar__logo" aria-hidden>
          S
        </span>
        {!collapsed ? (
          <div className="shell-sidebar__brand-text">
            <span className="shell-sidebar__brand-name">SmartAccounting</span>
            <span className="shell-sidebar__tenant">{tenantLabel}</span>
          </div>
        ) : null}
      </div>

      <nav className="shell-sidebar__nav">
        {sections.map((section) => (
          <section key={section.group ?? 'top'} className="shell-sidebar__section">
            {section.group ? (
              <h2 className="shell-sidebar__section-label">{t(section.group)}</h2>
            ) : null}
            <ul className="shell-sidebar__list">
              {section.entries.map((entry) => {
                if (entry.kind === 'item') {
                  if (!entry.item) {
                    return (
                      <li key="dashboard">
                        <NavLink
                          to={dashboardPath}
                          className={({ isActive }) =>
                            `shell-nav-link${isActive || isPathActive(location.pathname, dashboardPath) ? ' shell-nav-link--active' : ''}`
                          }
                          onClick={onNavigate}
                          title={t('nav.dashboard')}
                        >
                          <span className="shell-nav-link__icon">
                            <LayoutDashboard className="h-[18px] w-[18px]" />
                          </span>
                          {!collapsed ? <span className="shell-nav-link__label">{t('nav.dashboard')}</span> : null}
                        </NavLink>
                      </li>
                    )
                  }
                  const item = entry.item
                  const Icon = item.icon
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) => `shell-nav-link${isActive ? ' shell-nav-link--active' : ''}`}
                        onClick={onNavigate}
                        title={t(item.labelKey)}
                      >
                        <span className="shell-nav-link__icon">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        {!collapsed ? <span className="shell-nav-link__label">{t(item.labelKey)}</span> : null}
                      </NavLink>
                    </li>
                  )
                }

                const Icon = entry.icon
                const open = expanded[entry.id] ?? false
                const activeGroup = groupIsActive(location.pathname, entry.children)

                return (
                  <li key={entry.id} className="shell-nav-group">
                    <button
                      type="button"
                      className={`shell-nav-link shell-nav-link--parent${activeGroup ? ' shell-nav-link--active' : ''}`}
                      onClick={() => setExpanded((s) => ({ ...s, [entry.id]: !open }))}
                      title={t(entry.labelKey)}
                      aria-expanded={open}
                    >
                      <span className="shell-nav-link__icon">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      {!collapsed ? (
                        <>
                          <span className="shell-nav-link__label">{t(entry.labelKey)}</span>
                          <ChevronDown
                            className={`shell-nav-link__chevron${open ? ' shell-nav-link__chevron--open' : ''}`}
                            size={16}
                            aria-hidden
                          />
                        </>
                      ) : null}
                    </button>
                    {!collapsed && open ? (
                      <ul className="shell-nav-sublist">
                        {entry.children.map((child) => {
                          const ChildIcon = child.icon
                          return (
                            <li key={child.id}>
                              <NavLink
                                to={child.to}
                                className={({ isActive }) =>
                                  `shell-nav-link shell-nav-link--sub${isActive ? ' shell-nav-link--active' : ''}`
                                }
                                onClick={onNavigate}
                              >
                                <span className="shell-nav-link__icon">
                                  <ChildIcon className="h-4 w-4" />
                                </span>
                                <span className="shell-nav-link__label">{t(child.labelKey)}</span>
                              </NavLink>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>

      {variant === 'sidebar' ? (
        <>
          <button
            type="button"
            className="shell-sidebar__collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed ? <span>{t('nav.collapse')}</span> : null}
          </button>
          <SidebarFooter collapsed={collapsed} />
        </>
      ) : null}
    </aside>
  )
}
