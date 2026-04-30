import type { ComponentType } from 'react'
import { BarChart3, BookOpen, Briefcase, ChartSpline, DollarSign, FileText, Settings, ShoppingCart, ShieldCheck, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { canAccessRoleDashboard } from '../../security/roleAccess'
import type { Role } from '../../types/roles'
import { rolePathMap, roles } from '../../types/roles'

const roleLabel: Record<Role, string> = {
  CEO: 'Strategic Overview',
  CFO: 'Financial Command',
  SALES: 'Revenue Engine',
  OPERATIONS: 'Operations Control',
  HR: 'Workforce Economics',
  MARKETING: 'Campaign Intelligence',
  ACCOUNTING: 'Execution Hub',
}

const roleIcon: Record<Role, ComponentType<{ className?: string }>> = {
  CEO: ChartSpline,
  CFO: DollarSign,
  SALES: BarChart3,
  OPERATIONS: Settings,
  HR: Users,
  MARKETING: Briefcase,
  ACCOUNTING: BookOpen,
}

interface NavSidebarProps {
  role: Role
  className?: string
  onNavigate?: () => void
}

export function NavSidebar({ role, className, onNavigate }: NavSidebarProps) {
  const { t } = useTranslation()

  return (
    <aside className={`w-64 shrink-0 border-r border-[var(--border-subtle)] bg-white p-4 ${className ?? ''}`}>
      <div className="mb-6 rounded-xl bg-[var(--color-brand-10)] p-3">
        <h1 className="m-0 font-[var(--font-display)] text-lg font-bold text-[var(--color-brand-900)]">SMARTCHAIN</h1>
        <p className="m-0 text-sm text-neutral-600">{t('nav.dashboardSuite')}</p>
      </div>

      <nav className="flex flex-col gap-2" aria-label={t('nav.dashboardSuite')}>
        {roles.filter((currentRole) => canAccessRoleDashboard(role, currentRole)).map((currentRole) => {
          const Icon = roleIcon[currentRole]
          return (
            <NavLink
              key={currentRole}
              to={`/dashboard/${rolePathMap[currentRole]}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                    : 'border-transparent text-neutral-600 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-overlay)]'
                }`
              }
              onClick={onNavigate}
            >
              <Icon className="h-4 w-4" />
              <span>{roleLabel[currentRole]}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
        <p className="m-0 mb-2 text-xs uppercase tracking-wider text-neutral-500">{t('nav.transactions')}</p>
        <nav className="flex flex-col gap-2" aria-label={t('nav.transactions')}>
          <NavLink
            to="/transactions/invoice"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                  : 'border-transparent text-neutral-600 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-overlay)]'
              }`
            }
            onClick={onNavigate}
          >
            <FileText className="h-4 w-4" />
            <span>{t('nav.invoice')}</span>
          </NavLink>
          <NavLink
            to="/transactions/purchase-order"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                  : 'border-transparent text-neutral-600 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-overlay)]'
              }`
            }
            onClick={onNavigate}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{t('nav.purchaseOrder')}</span>
          </NavLink>
          <NavLink
            to="/transactions/sales-order"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                  : 'border-transparent text-neutral-600 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-overlay)]'
              }`
            }
            onClick={onNavigate}
          >
            <BarChart3 className="h-4 w-4" />
            <span>{t('nav.salesOrder')}</span>
          </NavLink>
        </nav>
      </div>

      {(role === 'CEO' || role === 'CFO' || role === 'HR') && (
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
          <p className="m-0 mb-2 text-xs uppercase tracking-wider text-neutral-500">{t('nav.admin')}</p>
          <NavLink
            to="/admin/users-tenants"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                  : 'border-transparent text-neutral-600 hover:border-[var(--border-subtle)] hover:bg-[var(--surface-overlay)]'
              }`
            }
            onClick={onNavigate}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{t('nav.userTenantManagement')}</span>
          </NavLink>
        </div>
      )}
    </aside>
  )
}
