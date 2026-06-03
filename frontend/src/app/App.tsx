import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { GlobalErrorBoundary } from './GlobalErrorBoundary'
import { SessionTimeoutManager } from '../features/auth/SessionTimeoutManager'
import { createAppRouter } from './router'

const router = createAppRouter()
import { ThemeManager } from './ThemeManager'
import { ToastViewport } from '../components/ui'

export function App() {
  return (
    <AppProviders>
      <GlobalErrorBoundary>
        <ThemeManager />
        <ToastViewport />
        <SessionTimeoutManager />
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
    </AppProviders>
  )
}
