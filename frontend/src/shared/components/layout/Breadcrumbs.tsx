import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { getDefaultRoute } from '../../routing/getDefaultRoute'
import { filterNavItems, findNavBreadcrumbs } from './navConfig'

export function Breadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const role = useAuthStore((s) => s.role)
  const permissions = useAuthStore((s) => s.permissions)
  const effectiveRoleProfile = useAuthStore((s) => s.effectiveRoleProfile)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const dashboardPath = useMemo(
    () => (role ? getDefaultRoute(role, permissions, effectiveRoleProfile) : '/dashboard'),
    [role, permissions, effectiveRoleProfile],
  )

  const crumbs = useMemo(() => {
    if (!role) {
      return []
    }
    const items = filterNavItems(hasPermission, effectiveRoleProfile.navItemIds)
    return findNavBreadcrumbs(location.pathname, items, dashboardPath, t('nav.dashboard'))
  }, [role, hasPermission, effectiveRoleProfile.navItemIds, location.pathname, dashboardPath, t])

  if (crumbs.length === 0) {
    return null
  }

  return (
    <>
      <nav className="shell-breadcrumbs shell-breadcrumbs--desktop" aria-label="Breadcrumb">
        <ol className="shell-breadcrumbs__list">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <li key={`${crumb.label}-${index}`} className="shell-breadcrumbs__item">
                {index > 0 ? <span className="shell-breadcrumbs__sep" aria-hidden>{'>'}</span> : null}
                {crumb.to && !isLast ? (
                  <Link to={crumb.to}>{crumb.label}</Link>
                ) : (
                  <span className={isLast ? 'shell-breadcrumbs__current' : undefined}>{crumb.label}</span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="shell-breadcrumbs shell-breadcrumbs--mobile">
        <Link to={crumbs.length > 1 && crumbs[crumbs.length - 2]?.to ? crumbs[crumbs.length - 2]!.to! : dashboardPath} className="shell-breadcrumbs__back">
          <ArrowLeft size={18} aria-hidden />
          <span>{crumbs[crumbs.length - 1]?.label}</span>
        </Link>
      </div>
    </>
  )
}
