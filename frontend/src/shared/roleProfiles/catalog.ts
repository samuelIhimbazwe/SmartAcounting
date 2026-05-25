import { NAV_ITEMS, ROLE_DASHBOARD_LABEL, roleDashboardPath } from '../components/layout/navConfig'
import { roles } from '../types/roles'

export interface RoleProfileOption {
  id: string
  label: string
  description?: string
}

export const CAPABILITY_BUNDLE_OPTIONS: RoleProfileOption[] = [
  {
    id: 'executive.command',
    label: 'Executive command',
    description: 'Cross-company dashboards, admin controls, and strategic navigation.',
  },
  {
    id: 'finance.control',
    label: 'Finance control',
    description: 'Finance dashboards, close workflows, and accounting navigation.',
  },
  {
    id: 'sales.pos',
    label: 'Sales and POS',
    description: 'Till, checkout, sales history, and returns-focused experience.',
  },
  {
    id: 'inventory.operations',
    label: 'Inventory operations',
    description: 'Stock, procurement, and operations workflow support.',
  },
  {
    id: 'people.operations',
    label: 'People operations',
    description: 'Attendance, payroll, and HR workflow support.',
  },
  {
    id: 'marketing.growth',
    label: 'Marketing growth',
    description: 'Campaign dashboards, promotions, and growth-focused tools.',
  },
  {
    id: 'admin.security',
    label: 'Admin and security',
    description: 'Role management, user management, and governance shortcuts.',
  },
  {
    id: 'compliance.audit',
    label: 'Compliance and audit',
    description: 'Audit, EBM compliance, and record-keeping tools.',
  },
  {
    id: 'copilot.assistant',
    label: 'Copilot assistant',
    description: 'Role gets AI-assistant oriented capabilities and prompts.',
  },
]

export const DASHBOARD_OPTIONS = roles.map((role) => ({
  id: role,
  label: ROLE_DASHBOARD_LABEL[role],
  description: `${ROLE_DASHBOARD_LABEL[role]} dashboard`,
  route: roleDashboardPath(role),
}))

export const NAV_ITEM_OPTIONS = NAV_ITEMS.map((item) => ({
  id: item.id,
  label: item.searchLabel,
  description: item.to,
  group: item.group,
  route: item.to,
}))

export const WORKFLOW_TEMPLATE_OPTIONS: RoleProfileOption[] = [
  { id: 'workflow-rules', label: 'Workflow rules', description: 'Platform workflow rule management.' },
  { id: 'tenant-oversight', label: 'Tenant oversight', description: 'Leadership approvals and company-wide review work.' },
  { id: 'finance-close', label: 'Finance close', description: 'Month-end close and finance approvals.' },
  { id: 'bank-reconciliation', label: 'Bank reconciliation', description: 'Cash and bank matching workflows.' },
  { id: 'till-close', label: 'Till close', description: 'End-of-shift till balancing flow.' },
  { id: 'sale-returns', label: 'Sales returns', description: 'Return and refund review flow.' },
  { id: 'stock-adjustments', label: 'Stock adjustments', description: 'Inventory correction and shrinkage flow.' },
  { id: 'purchase-orders', label: 'Purchase orders', description: 'Procurement review and approval flow.' },
  { id: 'shift-approvals', label: 'Shift approvals', description: 'Staff shift and attendance approvals.' },
  { id: 'payroll-review', label: 'Payroll review', description: 'Payroll verification and approval flow.' },
  { id: 'campaign-approvals', label: 'Campaign approvals', description: 'Marketing campaign review flow.' },
  { id: 'role-approvals', label: 'Role approvals', description: 'Role and access governance flow.' },
  { id: 'ebm-audit', label: 'EBM audit', description: 'Fiscal and audit review flow.' },
  { id: 'copilot-agent', label: 'Copilot agent', description: 'AI-assisted guided action flow.' },
]

export const LAYOUT_VARIANT_OPTIONS: RoleProfileOption[] = [
  { id: 'workspace', label: 'Workspace', description: 'Balanced default layout.' },
  { id: 'executive', label: 'Executive', description: 'Leadership-focused overview layout.' },
  { id: 'finance', label: 'Finance', description: 'Finance-heavy workbench layout.' },
  { id: 'operations', label: 'Operations', description: 'Operational task-driven layout.' },
  { id: 'people', label: 'People', description: 'HR and payroll focused layout.' },
  { id: 'growth', label: 'Growth', description: 'Marketing and campaign focused layout.' },
]

export const UI_FLAG_OPTIONS: RoleProfileOption[] = [
  { id: 'showExecutiveSummary', label: 'Executive summary', description: 'Highlights leadership summary widgets.' },
  { id: 'showCloseChecklist', label: 'Close checklist', description: 'Emphasizes finance close tasks.' },
  { id: 'showQuickSaleShortcuts', label: 'Quick sale shortcuts', description: 'Shows fast checkout actions.' },
  { id: 'showStockAging', label: 'Stock aging', description: 'Highlights stock monitoring widgets.' },
  { id: 'showPeoplePanel', label: 'People panel', description: 'Shows staff operations shortcuts.' },
  { id: 'showCampaignInsights', label: 'Campaign insights', description: 'Shows growth and campaign widgets.' },
  { id: 'showAdminShortcuts', label: 'Admin shortcuts', description: 'Shows governance shortcuts in the shell.' },
  { id: 'showAuditPanel', label: 'Audit panel', description: 'Highlights compliance-oriented widgets.' },
  { id: 'showCopilot', label: 'Copilot emphasis', description: 'Signals AI-first assistance in the UI.' },
]

export const LANDING_ROUTE_OPTIONS: RoleProfileOption[] = [
  ...DASHBOARD_OPTIONS.map((dashboard) => ({
    id: dashboard.route,
    label: dashboard.label,
    description: dashboard.route,
  })),
  ...NAV_ITEM_OPTIONS.map((item) => ({
    id: item.route,
    label: item.label,
    description: item.route,
  })),
  { id: '/settings', label: 'Settings', description: '/settings' },
]

export const LANDING_ROUTE_MAP = new Map(LANDING_ROUTE_OPTIONS.map((option) => [option.id, option]))
