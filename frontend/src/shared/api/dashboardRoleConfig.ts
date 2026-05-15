import type { Role } from '../types/roles'

/** Default chart widget per role — must match DashboardService.defaultChartWidget */
export const roleChartWidgetMap: Record<Role, string> = {
  CEO: 'revenue',
  CFO: 'margin',
  SALES: 'sales-orders',
  OPERATIONS: 'inventory',
  HR: 'payroll',
  MARKETING: 'promotions',
  ACCOUNTING: 'expenses',
}

/** i18n keys under dashboard.charts.* */
export const roleChartTitleKeyMap: Record<Role, string> = {
  CEO: 'dashboard.charts.revenue',
  CFO: 'dashboard.charts.margin',
  SALES: 'dashboard.charts.salesOrders',
  OPERATIONS: 'dashboard.charts.inventory',
  HR: 'dashboard.charts.payroll',
  MARKETING: 'dashboard.charts.promotions',
  ACCOUNTING: 'dashboard.charts.expenses',
}

/** Roles that surface open anomaly cases on the dashboard */
export const rolesWithAnomalies: Role[] = ['CEO', 'CFO', 'SALES', 'OPERATIONS', 'ACCOUNTING', 'HR', 'MARKETING']
