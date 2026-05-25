import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { GlobalErrorBoundary } from './GlobalErrorBoundary'
import { SessionTimeoutManager } from '../features/auth/SessionTimeoutManager'
import { createAppRouter } from './router'

const router = createAppRouter()
import { ThemeManager } from './ThemeManager'

export function App() {
  return (
    <AppProviders>
      <GlobalErrorBoundary>
        <ThemeManager />
        <SessionTimeoutManager />
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
    </AppProviders>
  )
}
