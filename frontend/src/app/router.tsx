import { Navigate, createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardRoute } from '../features/dashboards/DashboardRoute'
import { UnauthorizedPage } from '../features/common/UnauthorizedPage'
import { DashboardIndexRedirect } from '../features/common/DashboardIndexRedirect'
import { TransactionFormsRoute } from '../features/forms/TransactionFormsRoute'
import { UserTenantManagementRoute } from '../features/userTenant/UserTenantManagementRoute'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/dashboard', element: <DashboardIndexRedirect /> },
  { path: '/dashboard/:role', element: <DashboardRoute /> },
  { path: '/transactions/:type', element: <TransactionFormsRoute /> },
  { path: '/admin/users-tenants', element: <UserTenantManagementRoute /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
