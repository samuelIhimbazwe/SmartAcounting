import type { ComponentType } from 'react'
import { CUSTOMER_ACCESS_ANY } from '../../security/permissions'
import {
  Banknote,
  BarChart3,
  BookOpen,
  Briefcase,
  ChartSpline,
  DollarSign,
  FileText,
  MessageSquare,
  Package,
  PackageMinus,
  RotateCcw,
  ScanBarcode,
  ClipboardList,
  ScrollText,
  Settings,
  Landmark,
  ShieldCheck,
  ShoppingCart,
  Users,
  ArrowLeftRight,
  Tags,
} from 'lucide-react'
import type { Role } from '../../types/roles'
import type { RoleProfile } from '../../types/roleProfiles'
import { rolePathMap } from '../../types/roles'

export type NavGroupKey =
  | 'nav.groupOverview'
  | 'nav.groupOperations'
  | 'nav.groupFinance'
  | 'nav.groupCompliance'
  | 'nav.groupAdmin'

/** Retired nav ids — filtered even if a role profile still references them. */
export const EXCLUDED_NAV_ITEM_IDS = new Set([
  'marketplace',
  'plugin-store',
  'plugins',
  'iot',
  'iot-devices',
  'device-management',
])

export interface NavItem {
  /** Stable id for keys + search. */
  id: string
  /** React-router target. */
  to: string
  /** i18n key for the visible label. */
  labelKey: string
  /** Plain-text fallback used by client-side search. */
  searchLabel: string
  /** Group section header. */
  group: NavGroupKey
  /** Lucide icon. */
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
  /** RBAC: user must have this permission code. Omit to show for any authenticated user. */
  requiredPermission?: string
  /** RBAC: user must have at least one of these permission codes. */
  requiredAnyPermissions?: string[]
  /** Optional decoration badge (e.g. "Beta"). */
  badge?: string
}

/**
 * Role dashboards are generated separately from this list because they share
 * one route shape (`/dashboard/:role`) and are constrained by `canAccessRoleDashboard`.
 */
export const ROLE_DASHBOARD_ICON: Record<Role, NavItem['icon']> = {
  CEO: ChartSpline,
  CFO: DollarSign,
  SALES: BarChart3,
  OPERATIONS: Settings,
  HR: Users,
  MARKETING: Briefcase,
  ACCOUNTING: BookOpen,
}

export const ROLE_DASHBOARD_LABEL: Record<Role, string> = {
  CEO: 'Strategic Overview',
  CFO: 'Financial Command',
  SALES: 'Revenue Engine',
  OPERATIONS: 'Operations Control',
  HR: 'Workforce Economics',
  MARKETING: 'Campaign Intelligence',
  ACCOUNTING: 'Execution Hub',
}

export function roleDashboardPath(role: Role): string {
  return `/dashboard/${rolePathMap[role]}`
}

/**
 * Static nav items shown after the role dashboards.
 * The dashboard list is built dynamically via `canAccessRoleDashboard`.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'actions-queue',
    to: '/actions',
    labelKey: 'nav.actionsQueue',
    searchLabel: 'Approvals and actions',
    group: 'nav.groupOverview',
    icon: ClipboardList,
    requiredAnyPermissions: ['ANALYTICS_OWN', 'ANALYTICS_ALL'],
  },
  {
    id: 'sales-analytics',
    to: '/analytics/sales',
    labelKey: 'nav.salesAnalytics',
    searchLabel: 'Sales analytics',
    group: 'nav.groupOverview',
    icon: BarChart3,
    requiredPermission: 'ANALYTICS_ALL',
  },
  {
    id: 'invoice',
    to: '/transactions/invoice',
    labelKey: 'nav.invoice',
    searchLabel: 'Invoice',
    group: 'nav.groupOperations',
    icon: FileText,
    requiredPermission: 'FINANCE_WRITE',
  },
  {
    id: 'purchase-order',
    to: '/procurement/purchase-orders',
    labelKey: 'nav.purchaseOrder',
    searchLabel: 'Purchase orders',
    group: 'nav.groupOperations',
    icon: ShoppingCart,
    requiredPermission: 'PROCUREMENT_READ',
  },
  {
    id: 'sales-order',
    to: '/transactions/sales-order',
    labelKey: 'nav.salesOrder',
    searchLabel: 'Sales Order',
    group: 'nav.groupOperations',
    icon: BarChart3,
    requiredPermission: 'POS_ACCESS',
  },
  {
    id: 'price-lists',
    to: '/retail/price-lists',
    labelKey: 'nav.priceLists',
    searchLabel: 'Price lists',
    group: 'nav.groupOperations',
    icon: Tags,
    requiredPermission: 'POS_ACCESS',
  },
  {
    id: 'pos',
    to: '/pos',
    labelKey: 'nav.pos',
    searchLabel: 'Point of Sale',
    group: 'nav.groupOperations',
    icon: ScanBarcode,
    requiredPermission: 'POS_ACCESS',
  },
  {
    id: 'customers',
    to: '/customers',
    labelKey: 'nav.customers',
    searchLabel: 'Customers',
    group: 'nav.groupOperations',
    icon: Users,
    requiredAnyPermissions: [...CUSTOMER_ACCESS_ANY],
  },
  {
    id: 'pos-history',
    to: '/pos/history',
    labelKey: 'nav.posHistory',
    searchLabel: 'Sale history',
    group: 'nav.groupOperations',
    icon: ScanBarcode,
    requiredPermission: 'ANALYTICS_OWN',
  },
  {
    id: 'pos-returns',
    to: '/returns',
    labelKey: 'nav.returns',
    searchLabel: 'Returns refunds',
    group: 'nav.groupOperations',
    icon: RotateCcw,
    requiredPermission: 'POS_RETURNS',
  },
  {
    id: 'till',
    to: '/till',
    labelKey: 'nav.till',
    searchLabel: 'Till session',
    group: 'nav.groupOperations',
    icon: ScanBarcode,
    requiredPermission: 'POS_ACCESS',
  },
  {
    id: 'retail',
    to: '/retail',
    labelKey: 'nav.retail',
    searchLabel: 'Retail stock',
    group: 'nav.groupOperations',
    icon: Package,
    requiredPermission: 'INVENTORY_READ',
  },
  {
    id: 'stock-transfers',
    to: '/retail/transfers',
    labelKey: 'nav.stockTransfers',
    searchLabel: 'Stock transfers',
    group: 'nav.groupOperations',
    icon: ArrowLeftRight,
    requiredPermission: 'INVENTORY_WRITE',
  },
  {
    id: 'shrinkage',
    to: '/retail/shrinkage',
    labelKey: 'nav.shrinkage',
    searchLabel: 'Shrinkage',
    group: 'nav.groupOperations',
    icon: PackageMinus,
    requiredPermission: 'INVENTORY_WRITE',
  },
  {
    id: 'fx-rates',
    to: '/finance/fx-rates',
    labelKey: 'nav.fxRates',
    searchLabel: 'FX rates',
    group: 'nav.groupFinance',
    icon: Banknote,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'credit-ledger',
    to: '/finance/credit-ledger',
    labelKey: 'nav.creditLedger',
    searchLabel: 'Credit ledger',
    group: 'nav.groupFinance',
    icon: BookOpen,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'supplier-bills',
    to: '/finance/supplier-bills',
    labelKey: 'nav.supplierBills',
    searchLabel: 'Supplier bills',
    group: 'nav.groupFinance',
    icon: ScrollText,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'journals',
    to: '/finance/journals',
    labelKey: 'nav.journals',
    searchLabel: 'Journal entries',
    group: 'nav.groupFinance',
    icon: BookOpen,
    requiredPermission: 'FINANCE_WRITE',
  },
  {
    id: 'payment-runs',
    to: '/finance/payment-runs',
    labelKey: 'nav.paymentRuns',
    searchLabel: 'Payment runs',
    group: 'nav.groupFinance',
    icon: Banknote,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'fixed-assets',
    to: '/finance/assets',
    labelKey: 'nav.fixedAssets',
    searchLabel: 'Fixed assets',
    group: 'nav.groupFinance',
    icon: Landmark,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'month-end-close',
    to: '/finance/close',
    labelKey: 'nav.monthEndClose',
    searchLabel: 'Month-end close',
    group: 'nav.groupFinance',
    icon: BookOpen,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'documents',
    to: '/documents',
    labelKey: 'nav.documents',
    searchLabel: 'Documents',
    group: 'nav.groupOperations',
    icon: FileText,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'hr-employees',
    to: '/hr/employees',
    labelKey: 'nav.hrEmployees',
    searchLabel: 'Employees',
    group: 'nav.groupAdmin',
    icon: Users,
    requiredPermission: 'HR_READ',
  },
  {
    id: 'hr-leave',
    to: '/hr/leave',
    labelKey: 'nav.hrLeave',
    searchLabel: 'Leave management',
    group: 'nav.groupAdmin',
    icon: Users,
    requiredPermission: 'HR_READ',
  },
  {
    id: 'hr-shifts',
    to: '/hr/shifts',
    labelKey: 'nav.hrShifts',
    searchLabel: 'Shift management',
    group: 'nav.groupAdmin',
    icon: Users,
    requiredPermission: 'HR_READ',
  },
  {
    id: 'attendance',
    to: '/hr/attendance',
    labelKey: 'nav.attendance',
    searchLabel: 'Attendance',
    group: 'nav.groupAdmin',
    icon: Users,
    requiredPermission: 'HR_READ',
  },
  {
    id: 'marketing-campaigns',
    to: '/marketing/campaigns',
    labelKey: 'nav.marketingCampaigns',
    searchLabel: 'Marketing campaigns',
    group: 'nav.groupOperations',
    icon: Briefcase,
    requiredPermission: 'ANALYTICS_ALL',
  },
  {
    id: 'promotions',
    to: '/marketing/promotions',
    labelKey: 'nav.promotions',
    searchLabel: 'Promotions',
    group: 'nav.groupOperations',
    icon: Briefcase,
    requiredPermission: 'ANALYTICS_ALL',
  },
  {
    id: 'workflow-rules',
    to: '/admin/workflow-rules',
    labelKey: 'nav.workflowRules',
    searchLabel: 'Workflow rules',
    group: 'nav.groupAdmin',
    icon: ShieldCheck,
    requiredPermission: 'ROLE_MANAGE',
  },
  {
    id: 'bank-reconciliation',
    to: '/finance/bank-accounts',
    labelKey: 'nav.bankReconciliation',
    searchLabel: 'Bank reconciliation',
    group: 'nav.groupFinance',
    icon: Landmark,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'hr-payroll',
    to: '/hr/payroll',
    labelKey: 'nav.hrPayroll',
    searchLabel: 'Attendance and payroll',
    group: 'nav.groupAdmin',
    icon: Users,
    requiredPermission: 'HR_READ',
  },
  {
    id: 'ebm-compliance',
    to: '/compliance/ebm',
    labelKey: 'nav.ebmCompliance',
    searchLabel: 'EBM Compliance',
    group: 'nav.groupCompliance',
    icon: ShieldCheck,
    requiredPermission: 'EBM_AUDIT',
  },
  {
    id: 'rra-settings',
    to: '/compliance/rra-settings',
    labelKey: 'nav.rraSettings',
    searchLabel: 'RRA Settings',
    group: 'nav.groupCompliance',
    icon: Settings,
    requiredPermission: 'EBM_CONFIG',
  },
  {
    id: 'compliance-vat',
    to: '/compliance/vat',
    labelKey: 'nav.vatReturns',
    searchLabel: 'VAT Returns',
    group: 'nav.groupCompliance',
    icon: ScrollText,
    requiredPermission: 'EBM_AUDIT',
  },
  {
    id: 'compliance-paye',
    to: '/compliance/paye',
    labelKey: 'nav.payeFiling',
    searchLabel: 'PAYE Filing',
    group: 'nav.groupCompliance',
    icon: Users,
    requiredPermission: 'EBM_AUDIT',
  },
  {
    id: 'compliance-audit-log',
    to: '/compliance/audit-log',
    labelKey: 'nav.complianceAuditLog',
    searchLabel: 'Audit Log',
    group: 'nav.groupCompliance',
    icon: ScrollText,
    requiredPermission: 'EBM_AUDIT',
  },
  {
    id: 'sms-deliveries',
    to: '/finance/sms-deliveries',
    labelKey: 'nav.smsLogs',
    searchLabel: 'SMS deliveries',
    group: 'nav.groupFinance',
    icon: MessageSquare,
    requiredPermission: 'FINANCE_READ',
  },
  {
    id: 'admin-roles',
    to: '/admin/roles',
    labelKey: 'nav.rolesPermissions',
    searchLabel: 'Roles and permissions',
    group: 'nav.groupAdmin',
    icon: ShieldCheck,
    requiredPermission: 'ROLE_MANAGE',
  },
  {
    id: 'users-tenants',
    to: '/admin/users-tenants',
    labelKey: 'nav.userTenantManagement',
    searchLabel: 'User Tenant Management',
    group: 'nav.groupAdmin',
    icon: ShieldCheck,
    requiredPermission: 'USER_MANAGE',
  },
]

export const NAV_GROUP_ORDER: NavGroupKey[] = [
  'nav.groupOverview',
  'nav.groupOperations',
  'nav.groupFinance',
  'nav.groupCompliance',
  'nav.groupAdmin',
]

export function filterNavItems(hasPermission: (code: string) => boolean, allowedItemIds?: string[] | null): NavItem[] {
  const allowed = allowedItemIds && allowedItemIds.length > 0 ? new Set(allowedItemIds) : null
  return NAV_ITEMS.filter((item) => {
    if (EXCLUDED_NAV_ITEM_IDS.has(item.id)) {
      return false
    }
    if (allowed && !allowed.has(item.id)) {
      return false
    }
    if (item.requiredAnyPermissions?.length) {
      return item.requiredAnyPermissions.some((code) => hasPermission(code))
    }
    return !item.requiredPermission || hasPermission(item.requiredPermission)
  })
}

/** @deprecated Use {@link filterNavItems} with auth store `hasPermission`. */
export function filterNavForRole(_role: Role, permissions: string[] = []): NavItem[] {
  const has = (code: string) => permissions.includes(code)
  return filterNavItems(has)
}

export function findNavItemByRoute(route: string, hasPermission: (code: string) => boolean, roleProfile?: RoleProfile | null): NavItem | null {
  return filterNavItems(hasPermission, roleProfile?.navItemIds).find((item) => item.to === route) ?? null
}
