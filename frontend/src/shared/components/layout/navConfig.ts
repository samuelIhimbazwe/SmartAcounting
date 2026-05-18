import type { ComponentType } from 'react'
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
  ScanBarcode,
  ScrollText,
  Settings,
  Landmark,
  ShieldCheck,
  ShoppingCart,
  Users,
} from 'lucide-react'
import type { Role } from '../../types/roles'
import { rolePathMap } from '../../types/roles'

export type NavGroupKey =
  | 'nav.groupOverview'
  | 'nav.groupOperations'
  | 'nav.groupFinance'
  | 'nav.groupAdmin'

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
  /** Optional list of roles that may see the item. */
  roles?: Role[]
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
    id: 'invoice',
    to: '/transactions/invoice',
    labelKey: 'nav.invoice',
    searchLabel: 'Invoice',
    group: 'nav.groupOperations',
    icon: FileText,
  },
  {
    id: 'purchase-order',
    to: '/procurement/purchase-orders',
    labelKey: 'nav.purchaseOrder',
    searchLabel: 'Purchase orders',
    group: 'nav.groupOperations',
    icon: ShoppingCart,
    roles: ['CEO', 'CFO', 'OPERATIONS', 'ACCOUNTING'],
  },
  {
    id: 'sales-order',
    to: '/transactions/sales-order',
    labelKey: 'nav.salesOrder',
    searchLabel: 'Sales Order',
    group: 'nav.groupOperations',
    icon: BarChart3,
  },
  {
    id: 'pos',
    to: '/pos',
    labelKey: 'nav.pos',
    searchLabel: 'Point of Sale',
    group: 'nav.groupOperations',
    icon: ScanBarcode,
    roles: ['CEO', 'SALES', 'OPERATIONS'],
  },
  {
    id: 'retail',
    to: '/retail',
    labelKey: 'nav.retail',
    searchLabel: 'Retail stock',
    group: 'nav.groupOperations',
    icon: Package,
    roles: ['CEO', 'SALES', 'OPERATIONS', 'ACCOUNTING'],
  },
  {
    id: 'fx-rates',
    to: '/finance/fx-rates',
    labelKey: 'nav.fxRates',
    searchLabel: 'FX rates',
    group: 'nav.groupFinance',
    icon: Banknote,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'credit-ledger',
    to: '/finance/credit-ledger',
    labelKey: 'nav.creditLedger',
    searchLabel: 'Credit ledger',
    group: 'nav.groupFinance',
    icon: BookOpen,
    roles: ['CEO', 'CFO', 'ACCOUNTING', 'SALES', 'OPERATIONS'],
  },
  {
    id: 'supplier-bills',
    to: '/finance/supplier-bills',
    labelKey: 'nav.supplierBills',
    searchLabel: 'Supplier bills',
    group: 'nav.groupFinance',
    icon: ScrollText,
    roles: ['CFO', 'ACCOUNTING', 'OPERATIONS'],
  },
  {
    id: 'payment-runs',
    to: '/finance/payment-runs',
    labelKey: 'nav.paymentRuns',
    searchLabel: 'Payment runs',
    group: 'nav.groupFinance',
    icon: Banknote,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'fixed-assets',
    to: '/finance/assets',
    labelKey: 'nav.fixedAssets',
    searchLabel: 'Fixed assets',
    group: 'nav.groupFinance',
    icon: Landmark,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'month-end-close',
    to: '/finance/close',
    labelKey: 'nav.monthEndClose',
    searchLabel: 'Month-end close',
    group: 'nav.groupFinance',
    icon: BookOpen,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'documents',
    to: '/documents',
    labelKey: 'nav.documents',
    searchLabel: 'Documents',
    group: 'nav.groupOperations',
    icon: FileText,
    roles: ['CEO', 'CFO', 'ACCOUNTING', 'OPERATIONS'],
  },
  {
    id: 'attendance',
    to: '/hr/attendance',
    labelKey: 'nav.attendance',
    searchLabel: 'Attendance',
    group: 'nav.groupAdmin',
    icon: Users,
    roles: ['CEO', 'CFO', 'HR', 'ACCOUNTING'],
  },
  {
    id: 'marketing-campaigns',
    to: '/marketing/campaigns',
    labelKey: 'nav.marketingCampaigns',
    searchLabel: 'Marketing campaigns',
    group: 'nav.groupOperations',
    icon: Briefcase,
    roles: ['CEO', 'CFO', 'SALES', 'MARKETING'],
  },
  {
    id: 'promotions',
    to: '/marketing/promotions',
    labelKey: 'nav.promotions',
    searchLabel: 'Promotions',
    group: 'nav.groupOperations',
    icon: Briefcase,
    roles: ['CEO', 'CFO', 'SALES', 'MARKETING'],
  },
  {
    id: 'workflow-rules',
    to: '/admin/workflow-rules',
    labelKey: 'nav.workflowRules',
    searchLabel: 'Workflow rules',
    group: 'nav.groupAdmin',
    icon: ShieldCheck,
    roles: ['CEO', 'CFO'],
  },
  {
    id: 'bank-reconciliation',
    to: '/finance/bank-accounts',
    labelKey: 'nav.bankReconciliation',
    searchLabel: 'Bank reconciliation',
    group: 'nav.groupFinance',
    icon: Landmark,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'hr-payroll',
    to: '/hr/payroll',
    labelKey: 'nav.hrPayroll',
    searchLabel: 'Attendance and payroll',
    group: 'nav.groupAdmin',
    icon: Users,
    roles: ['CEO', 'CFO', 'HR', 'ACCOUNTING'],
  },
  {
    id: 'ebm-compliance',
    to: '/compliance/ebm',
    labelKey: 'nav.ebmCompliance',
    searchLabel: 'EBM compliance',
    group: 'nav.groupFinance',
    icon: ShieldCheck,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'sms-deliveries',
    to: '/finance/sms-deliveries',
    labelKey: 'nav.smsLogs',
    searchLabel: 'SMS deliveries',
    group: 'nav.groupFinance',
    icon: MessageSquare,
    roles: ['CEO', 'CFO', 'ACCOUNTING'],
  },
  {
    id: 'users-tenants',
    to: '/admin/users-tenants',
    labelKey: 'nav.userTenantManagement',
    searchLabel: 'User Tenant Management',
    group: 'nav.groupAdmin',
    icon: ShieldCheck,
    roles: ['CEO', 'CFO', 'HR'],
  },
]

export const NAV_GROUP_ORDER: NavGroupKey[] = [
  'nav.groupOverview',
  'nav.groupOperations',
  'nav.groupFinance',
  'nav.groupAdmin',
]

export function filterNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
