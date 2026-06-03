import type { Role } from '../../../shared/types/roles'

export interface KpiSlot {
  /** i18n key under dashboard.kpiLabels.* */
  labelKey: string
  hints: string[]
  fallbackIndex: number
}

export const ROLE_KPI_SLOTS: Record<Role, KpiSlot[]> = {
  CEO: [
    { labelKey: 'todayRevenue', hints: ['revenue', 'sales', 'paid', 'income'], fallbackIndex: 0 },
    { labelKey: 'transactions', hints: ['transaction', 'order', 'count', 'volume'], fallbackIndex: 1 },
    { labelKey: 'topProduct', hints: ['product', 'sku', 'item', 'bestseller'], fallbackIndex: 2 },
    { labelKey: 'openTills', hints: ['till', 'register', 'cash', 'open'], fallbackIndex: 3 },
  ],
  CFO: [
    { labelKey: 'cashPosition', hints: ['cash', 'liquidity', 'runway', 'balance'], fallbackIndex: 0 },
    { labelKey: 'arOutstanding', hints: ['ar', 'receivable', 'aging', 'invoice'], fallbackIndex: 1 },
    { labelKey: 'apDue', hints: ['ap', 'payable', 'bill', 'supplier'], fallbackIndex: 2 },
    { labelKey: 'netPosition', hints: ['net', 'margin', 'position', 'ratio'], fallbackIndex: 3 },
  ],
  SALES: [
    { labelKey: 'todaySales', hints: ['sales', 'revenue', 'pipeline'], fallbackIndex: 0 },
    { labelKey: 'teamSales', hints: ['team', 'staff', 'rep'], fallbackIndex: 1 },
    { labelKey: 'returns', hints: ['return', 'refund'], fallbackIndex: 2 },
    { labelKey: 'avgBasket', hints: ['basket', 'average', 'ticket'], fallbackIndex: 3 },
  ],
  OPERATIONS: [
    { labelKey: 'lowStock', hints: ['low_stock', 'stock', 'sku'], fallbackIndex: 0 },
    { labelKey: 'posPending', hints: ['po', 'purchase', 'order', 'procurement'], fallbackIndex: 1 },
    { labelKey: 'transfersPending', hints: ['transfer', 'movement'], fallbackIndex: 2 },
    { labelKey: 'shrinkage', hints: ['shrink', 'loss', 'waste'], fallbackIndex: 3 },
  ],
  HR: [
    { labelKey: 'staffOnShift', hints: ['shift', 'attendance', 'on duty', 'headcount'], fallbackIndex: 0 },
    { labelKey: 'leavePending', hints: ['leave', 'absence', 'pto'], fallbackIndex: 1 },
    { labelKey: 'payrollDue', hints: ['payroll', 'due', 'pay'], fallbackIndex: 2 },
    { labelKey: 'attendancePct', hints: ['attendance', 'pct', 'rate', '%'], fallbackIndex: 3 },
  ],
  MARKETING: [
    { labelKey: 'activePromos', hints: ['promo', 'campaign'], fallbackIndex: 0 },
    { labelKey: 'redemptions', hints: ['redeem', 'usage'], fallbackIndex: 1 },
    { labelKey: 'blendedRoi', hints: ['roi', 'return'], fallbackIndex: 2 },
    { labelKey: 'reach', hints: ['reach', 'audience', 'impression'], fallbackIndex: 3 },
  ],
  ACCOUNTING: [
    { labelKey: 'unreconciled', hints: ['reconcil', 'unmatch', 'open item'], fallbackIndex: 0 },
    { labelKey: 'monthClose', hints: ['close', 'period', 'month'], fallbackIndex: 1 },
    { labelKey: 'vatDue', hints: ['vat', 'tax'], fallbackIndex: 2 },
    { labelKey: 'journalsPending', hints: ['journal', 'entry', 'post'], fallbackIndex: 3 },
  ],
}

export interface ThirdRowPanelConfig {
  titleKey: string
  drillWidget: string
  emptyActionKey?: string
  emptyActionTo?: string
}

export interface ThirdRowConfig {
  left: ThirdRowPanelConfig
  right: ThirdRowPanelConfig
  /** CEO uses anomalies instead of a second drilldown table */
  anomaliesInsteadOfRight?: boolean
}

export const ROLE_THIRD_ROW: Record<Role, ThirdRowConfig> = {
  CEO: {
    left: { titleKey: 'recentSales', drillWidget: 'revenue' },
    right: { titleKey: 'recentSales', drillWidget: 'revenue' },
    anomaliesInsteadOfRight: true,
  },
  CFO: {
    left: { titleKey: 'overdueInvoices', drillWidget: 'margin', emptyActionKey: 'viewLedger', emptyActionTo: '/finance/credit-ledger' },
    right: { titleKey: 'upcomingPayments', drillWidget: 'margin', emptyActionKey: 'viewPayments', emptyActionTo: '/finance/payment-runs' },
  },
  SALES: {
    left: { titleKey: 'recentTransactions', drillWidget: 'sales-orders', emptyActionTo: '/pos/history' },
    right: { titleKey: 'topProducts', drillWidget: 'sales-orders', emptyActionTo: '/pos' },
  },
  OPERATIONS: {
    left: { titleKey: 'lowStockItems', drillWidget: 'inventory', emptyActionTo: '/retail' },
    right: { titleKey: 'pendingDeliveries', drillWidget: 'inventory', emptyActionTo: '/procurement/purchase-orders' },
  },
  HR: {
    left: { titleKey: 'todaysAttendance', drillWidget: 'payroll', emptyActionTo: '/hr/attendance' },
    right: { titleKey: 'pendingLeave', drillWidget: 'payroll', emptyActionTo: '/hr/leave' },
  },
  MARKETING: {
    left: { titleKey: 'activeCampaigns', drillWidget: 'promotions', emptyActionTo: '/marketing/campaigns' },
    right: { titleKey: 'topPromotions', drillWidget: 'promotions', emptyActionTo: '/marketing/promotions' },
  },
  ACCOUNTING: {
    left: { titleKey: 'unmatchedTransactions', drillWidget: 'expenses', emptyActionTo: '/finance/bank-accounts' },
    right: { titleKey: 'upcomingDeadlines', drillWidget: 'expenses', emptyActionTo: '/finance/journals' },
  },
}
