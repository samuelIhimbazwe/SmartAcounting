import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../shared/stores/authStore'

const LINKS = [
  { to: '/compliance/ebm', label: 'EBM Compliance', permission: 'EBM_AUDIT' },
  { to: '/compliance/rra-settings', label: 'RRA Settings', permission: 'EBM_CONFIG' },
  { to: '/compliance/vat', label: 'VAT Returns', permission: 'EBM_AUDIT' },
  { to: '/compliance/paye', label: 'PAYE Filing', permission: 'EBM_AUDIT' },
  { to: '/compliance/audit-log', label: 'Audit Log', permission: 'EBM_AUDIT' },
] as const

export function ComplianceSubNav() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const visible = LINKS.filter((link) => hasPermission(link.permission))

  if (visible.length <= 1) {
    return null
  }

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3"
      aria-label="Compliance modules"
    >
      {visible.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
