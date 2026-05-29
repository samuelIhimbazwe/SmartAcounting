import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AppRoot } from './AppRoot'
import { ProtectedRoute } from './ProtectedRoute'
import { RouteErrorPage } from './RouteErrorPage'
import { LoginPage } from '../features/auth/LoginPage'
import { OAuth2CallbackPage } from '../features/auth/OAuth2CallbackPage'
import { SignupPage } from '../features/auth/SignupPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'
import { UnauthorizedPage } from '../features/common/UnauthorizedPage'
import { DashboardIndexRedirect } from '../features/common/DashboardIndexRedirect'
import { ANALYTICS_ANY, CUSTOMER_ACCESS_ANY } from '../shared/security/permissions'

function guard(permission: string | readonly string[] | undefined, element: ReactNode) {
  return <ProtectedRoute permission={permission}>{element}</ProtectedRoute>
}

type RouteComponent = ComponentType<object>

function lazyNamedRoute(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): LazyExoticComponent<RouteComponent> {
  return lazy(async () => {
    const module = await loader()
    return { default: module[exportName] as RouteComponent }
  })
}

function lazyElement(Component: LazyExoticComponent<RouteComponent>) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading module…</p>}>
      <Component />
    </Suspense>
  )
}

const OnboardingRoute = lazyNamedRoute(() => import('../features/onboarding/OnboardingRoute'), 'OnboardingRoute')
const AlertDetailsRoute = lazyNamedRoute(() => import('../features/alerts/AlertDetailsRoute'), 'AlertDetailsRoute')
const AnomalyDetailsRoute = lazyNamedRoute(() => import('../features/anomalies/AnomalyDetailsRoute'), 'AnomalyDetailsRoute')
const DashboardRoute = lazyNamedRoute(() => import('../features/dashboards/DashboardRoute'), 'DashboardRoute')
const TransactionFormsRoute = lazyNamedRoute(
  () => import('../features/forms/TransactionFormsRoute'),
  'TransactionFormsRoute',
)
const UserTenantManagementRoute = lazyNamedRoute(
  () => import('../features/userTenant/UserTenantManagementRoute'),
  'UserTenantManagementRoute',
)
const RoleManagementRoute = lazyNamedRoute(() => import('../features/rbac/RoleManagementRoute'), 'RoleManagementRoute')
const PosRoute = lazyNamedRoute(() => import('../features/pos/PosRoute'), 'PosRoute')
const PosSaleHistoryRoute = lazyNamedRoute(() => import('../features/pos/PosSaleHistoryRoute'), 'PosSaleHistoryRoute')
const ReturnsRoute = lazyNamedRoute(() => import('../features/pos/ReturnsRoute'), 'ReturnsRoute')
const PosReceiptPrintRoute = lazyNamedRoute(
  () => import('../features/pos/PosReceiptPrintRoute'),
  'PosReceiptPrintRoute',
)
const TillRoute = lazyNamedRoute(() => import('../features/till/TillRoute'), 'TillRoute')
const RetailOpsRoute = lazyNamedRoute(() => import('../features/retail/RetailRoutes'), 'RetailOpsRoute')
const StockTransfersRoute = lazyNamedRoute(() => import('../features/retail/RetailRoutes'), 'StockTransfersRoute')
const ShrinkageRoute = lazyNamedRoute(() => import('../features/retail/RetailRoutes'), 'ShrinkageRoute')
const FxRatesRoute = lazyNamedRoute(() => import('../features/finance/FxRatesRoute'), 'FxRatesRoute')
const CreditLedgerRoute = lazyNamedRoute(() => import('../features/finance/CreditLedgerRoute'), 'CreditLedgerRoute')
const SupplierBillsRoute = lazyNamedRoute(() => import('../features/finance/SupplierBillsRoute'), 'SupplierBillsRoute')
const CustomerRecordRoute = lazyNamedRoute(() => import('../features/finance/CustomerRecordRoute'), 'CustomerRecordRoute')
const SupplierRecordRoute = lazyNamedRoute(() => import('../features/finance/SupplierRecordRoute'), 'SupplierRecordRoute')
const SmsDeliveryLogRoute = lazyNamedRoute(() => import('../features/finance/SmsDeliveryLogRoute'), 'SmsDeliveryLogRoute')
const BankReconciliationRoute = lazyNamedRoute(
  () => import('../features/finance/BankReconciliationRoute'),
  'BankReconciliationRoute',
)
const PurchaseOrdersRoute = lazyNamedRoute(
  () => import('../features/procurement/PurchaseOrdersRoute'),
  'PurchaseOrdersRoute',
)
const HrPayrollRoute = lazyNamedRoute(() => import('../features/hr/HrPayrollRoute'), 'HrPayrollRoute')
const EmployeesRoute = lazyNamedRoute(() => import('../features/hr/HrRoutes'), 'EmployeesRoute')
const EmployeeDetailRoute = lazyNamedRoute(() => import('../features/hr/HrRoutes'), 'EmployeeDetailRoute')
const LeaveRoute = lazyNamedRoute(() => import('../features/hr/HrRoutes'), 'LeaveRoute')
const ShiftsRoute = lazyNamedRoute(() => import('../features/hr/HrRoutes'), 'ShiftsRoute')
const EbmComplianceRoute = lazyNamedRoute(() => import('../features/compliance/ComplianceRoutes'), 'EbmComplianceRoute')
const RraSettingsRoute = lazyNamedRoute(() => import('../features/compliance/ComplianceRoutes'), 'RraSettingsRoute')
const VatComplianceRoute = lazyNamedRoute(() => import('../features/compliance/ComplianceRoutes'), 'VatComplianceRoute')
const PayeComplianceRoute = lazyNamedRoute(() => import('../features/compliance/ComplianceRoutes'), 'PayeComplianceRoute')
const AuditLogRoute = lazyNamedRoute(() => import('../features/compliance/ComplianceRoutes'), 'AuditLogRoute')
const SettingsRoute = lazyNamedRoute(() => import('../features/settings/SettingsRoute'), 'SettingsRoute')
const MyTeamRoute = lazyNamedRoute(() => import('../features/settings/MyTeamRoute'), 'MyTeamRoute')
const PaymentRunsRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'PaymentRunsRoute')
const FixedAssetsRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'FixedAssetsRoute')
const MonthEndCloseRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'MonthEndCloseRoute')
const WorkflowRulesRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'WorkflowRulesRoute')
const DocumentsRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'DocumentsRoute')
const AttendanceRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'AttendanceRoute')
const MarketingCampaignsRoute = lazyNamedRoute(
  () => import('../features/production/ProductionRoutes'),
  'MarketingCampaignsRoute',
)
const PromotionsRoute = lazyNamedRoute(() => import('../features/production/ProductionRoutes'), 'PromotionsRoute')
const CustomersRoute = lazyNamedRoute(() => import('../features/customers/CustomersRoute'), 'CustomersRoute')
const CustomerDetailRoute = lazyNamedRoute(() => import('../features/customers/CustomersRoute'), 'CustomerDetailRoute')
const ActionsRoute = lazyNamedRoute(() => import('../features/actions/ActionsRoute'), 'ActionsRoute')

export const appRoutes: RouteObject[] = [
  {
    element: <AppRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Navigate to="/login" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/oauth2/callback', element: <OAuth2CallbackPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/onboarding', element: lazyElement(OnboardingRoute) },
      { path: '/alerts/:alertId', element: guard(undefined, lazyElement(AlertDetailsRoute)) },
      { path: '/anomalies/:anomalyId', element: guard(undefined, lazyElement(AnomalyDetailsRoute)) },
      { path: '/dashboard', element: guard(undefined, <DashboardIndexRedirect />) },
      { path: '/dashboard/:role', element: guard(undefined, lazyElement(DashboardRoute)) },
      { path: '/actions', element: guard(ANALYTICS_ANY, lazyElement(ActionsRoute)) },
      { path: '/transactions/:type', element: guard(undefined, lazyElement(TransactionFormsRoute)) },
      { path: '/admin/users-tenants', element: guard('USER_MANAGE', lazyElement(UserTenantManagementRoute)) },
      { path: '/admin/roles', element: guard('ROLE_MANAGE', lazyElement(RoleManagementRoute)) },
      { path: '/pos', element: guard('POS_ACCESS', lazyElement(PosRoute)) },
      { path: '/customers', element: guard(CUSTOMER_ACCESS_ANY, lazyElement(CustomersRoute)) },
      { path: '/customers/:id', element: guard(CUSTOMER_ACCESS_ANY, lazyElement(CustomerDetailRoute)) },
      { path: '/pos/history', element: guard('ANALYTICS_OWN', lazyElement(PosSaleHistoryRoute)) },
      { path: '/returns', element: guard('POS_RETURNS', lazyElement(ReturnsRoute)) },
      { path: '/pos/receipts/:receiptId/print', element: guard('POS_ACCESS', lazyElement(PosReceiptPrintRoute)) },
      { path: '/till', element: guard('POS_ACCESS', lazyElement(TillRoute)) },
      { path: '/retail', element: guard('INVENTORY_READ', lazyElement(RetailOpsRoute)) },
      { path: '/retail/transfers', element: guard('INVENTORY_WRITE', lazyElement(StockTransfersRoute)) },
      { path: '/retail/shrinkage', element: guard('INVENTORY_WRITE', lazyElement(ShrinkageRoute)) },
      { path: '/finance/fx-rates', element: guard('FINANCE_READ', lazyElement(FxRatesRoute)) },
      { path: '/finance/credit-ledger', element: guard('FINANCE_READ', lazyElement(CreditLedgerRoute)) },
      { path: '/finance/supplier-bills', element: guard('FINANCE_READ', lazyElement(SupplierBillsRoute)) },
      { path: '/finance/customers/:customerId', element: guard('FINANCE_READ', lazyElement(CustomerRecordRoute)) },
      { path: '/finance/suppliers/:supplierId', element: guard('FINANCE_READ', lazyElement(SupplierRecordRoute)) },
      { path: '/finance/sms-deliveries', element: guard('FINANCE_READ', lazyElement(SmsDeliveryLogRoute)) },
      { path: '/finance/bank-accounts', element: guard('FINANCE_READ', lazyElement(BankReconciliationRoute)) },
      { path: '/procurement/purchase-orders', element: guard('PROCUREMENT_READ', lazyElement(PurchaseOrdersRoute)) },
      { path: '/hr/payroll', element: guard('HR_READ', lazyElement(HrPayrollRoute)) },
      { path: '/hr/employees', element: guard('HR_READ', lazyElement(EmployeesRoute)) },
      { path: '/hr/employees/:id', element: guard('HR_READ', lazyElement(EmployeeDetailRoute)) },
      { path: '/hr/leave', element: guard('HR_READ', lazyElement(LeaveRoute)) },
      { path: '/hr/shifts', element: guard('HR_READ', lazyElement(ShiftsRoute)) },
      { path: '/hr/attendance', element: guard('HR_READ', lazyElement(AttendanceRoute)) },
      { path: '/finance/payment-runs', element: guard('FINANCE_READ', lazyElement(PaymentRunsRoute)) },
      { path: '/finance/assets', element: guard('FINANCE_READ', lazyElement(FixedAssetsRoute)) },
      { path: '/finance/close', element: guard('FINANCE_READ', lazyElement(MonthEndCloseRoute)) },
      { path: '/admin/workflow-rules', element: guard('ROLE_MANAGE', lazyElement(WorkflowRulesRoute)) },
      { path: '/documents', element: guard('FINANCE_READ', lazyElement(DocumentsRoute)) },
      { path: '/marketing/campaigns', element: guard('ANALYTICS_ALL', lazyElement(MarketingCampaignsRoute)) },
      { path: '/marketing/promotions', element: guard('ANALYTICS_ALL', lazyElement(PromotionsRoute)) },
      { path: '/compliance/ebm', element: guard('EBM_AUDIT', lazyElement(EbmComplianceRoute)) },
      { path: '/compliance/rra-settings', element: guard('EBM_CONFIG', lazyElement(RraSettingsRoute)) },
      { path: '/compliance/vat', element: guard('EBM_AUDIT', lazyElement(VatComplianceRoute)) },
      { path: '/compliance/paye', element: guard('EBM_AUDIT', lazyElement(PayeComplianceRoute)) },
      { path: '/compliance/audit-log', element: guard('EBM_AUDIT', lazyElement(AuditLogRoute)) },
      { path: '/settings', element: guard(undefined, lazyElement(SettingsRoute)) },
      { path: '/settings/roles', element: guard('ROLE_MANAGE', lazyElement(MyTeamRoute)) },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
]
