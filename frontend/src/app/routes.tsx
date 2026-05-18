import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AppRoot } from './AppRoot'
import { LoginPage } from '../features/auth/LoginPage'
import { OAuth2CallbackPage } from '../features/auth/OAuth2CallbackPage'
import { SignupPage } from '../features/auth/SignupPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'
import { DashboardRoute } from '../features/dashboards/DashboardRoute'
import { UnauthorizedPage } from '../features/common/UnauthorizedPage'
import { DashboardIndexRedirect } from '../features/common/DashboardIndexRedirect'
import { TransactionFormsRoute } from '../features/forms/TransactionFormsRoute'
import { UserTenantManagementRoute } from '../features/userTenant/UserTenantManagementRoute'
import { PosRoute } from '../features/pos/PosRoute'
import { RetailOpsRoute } from '../features/retail/RetailOpsRoute'
import { FxRatesRoute } from '../features/finance/FxRatesRoute'
import { CreditLedgerRoute } from '../features/finance/CreditLedgerRoute'
import { SmsDeliveryLogRoute } from '../features/finance/SmsDeliveryLogRoute'
import { SupplierBillsRoute } from '../features/finance/SupplierBillsRoute'
import { CustomerRecordRoute } from '../features/finance/CustomerRecordRoute'
import { SupplierRecordRoute } from '../features/finance/SupplierRecordRoute'
import { SettingsRoute } from '../features/settings/SettingsRoute'
import { BankReconciliationRoute } from '../features/finance/BankReconciliationRoute'
import { PurchaseOrdersRoute } from '../features/procurement/PurchaseOrdersRoute'
import { HrPayrollRoute } from '../features/hr/HrPayrollRoute'
import { EbmComplianceRoute } from '../features/compliance/EbmComplianceRoute'
import {
  AttendanceRoute,
  MarketingCampaignsRoute,
  PromotionsRoute,
  DocumentsRoute,
  FixedAssetsRoute,
  MonthEndCloseRoute,
  PaymentRunsRoute,
  WorkflowRulesRoute,
} from '../features/production/ProductionRoutes'

export const appRoutes: RouteObject[] = [
  {
    element: <AppRoot />,
    children: [
      { path: '/', element: <Navigate to="/login" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/oauth2/callback', element: <OAuth2CallbackPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/dashboard', element: <DashboardIndexRedirect /> },
      { path: '/dashboard/:role', element: <DashboardRoute /> },
      { path: '/transactions/:type', element: <TransactionFormsRoute /> },
      { path: '/admin/users-tenants', element: <UserTenantManagementRoute /> },
      { path: '/pos', element: <PosRoute /> },
      { path: '/retail', element: <RetailOpsRoute /> },
      { path: '/finance/fx-rates', element: <FxRatesRoute /> },
      { path: '/finance/credit-ledger', element: <CreditLedgerRoute /> },
      { path: '/finance/supplier-bills', element: <SupplierBillsRoute /> },
      { path: '/finance/customers/:customerId', element: <CustomerRecordRoute /> },
      { path: '/finance/suppliers/:supplierId', element: <SupplierRecordRoute /> },
      { path: '/finance/sms-deliveries', element: <SmsDeliveryLogRoute /> },
      { path: '/finance/bank-accounts', element: <BankReconciliationRoute /> },
      { path: '/procurement/purchase-orders', element: <PurchaseOrdersRoute /> },
      { path: '/hr/payroll', element: <HrPayrollRoute /> },
      { path: '/hr/attendance', element: <AttendanceRoute /> },
      { path: '/finance/payment-runs', element: <PaymentRunsRoute /> },
      { path: '/finance/assets', element: <FixedAssetsRoute /> },
      { path: '/finance/close', element: <MonthEndCloseRoute /> },
      { path: '/admin/workflow-rules', element: <WorkflowRulesRoute /> },
      { path: '/documents', element: <DocumentsRoute /> },
      { path: '/marketing/campaigns', element: <MarketingCampaignsRoute /> },
      { path: '/marketing/promotions', element: <PromotionsRoute /> },
      { path: '/compliance/ebm', element: <EbmComplianceRoute /> },
      { path: '/settings', element: <SettingsRoute /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
]
