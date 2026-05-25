import { Outlet } from 'react-router-dom'
import { TillSessionProvider } from '../hooks/useTillSession'
import { DesktopOAuth2Listener } from '../features/auth/DesktopOAuth2Listener'
import { DesktopTrayNavigation } from '../features/auth/DesktopTrayNavigation'
import { CopilotSidebar } from '../features/copilot/CopilotSidebar'
import { useAuthStore } from '../shared/stores/authStore'

/** Root layout: global listeners that need React Router context. */
export function AppRoot() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const canUseCopilot = useAuthStore((state) => state.hasPermission('AI_COPILOT'))

  return (
    <>
      <DesktopOAuth2Listener />
      <DesktopTrayNavigation />
      {accessToken ? (
        <TillSessionProvider>
          <Outlet />
          {canUseCopilot ? <CopilotSidebar /> : null}
        </TillSessionProvider>
      ) : (
        <Outlet />
      )}
    </>
  )
}
