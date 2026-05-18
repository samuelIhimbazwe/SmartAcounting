import { Outlet } from 'react-router-dom'
import { DesktopOAuth2Listener } from '../features/auth/DesktopOAuth2Listener'
import { DesktopTrayNavigation } from '../features/auth/DesktopTrayNavigation'

/** Root layout: global listeners that need React Router context. */
export function AppRoot() {
  return (
    <>
      <DesktopOAuth2Listener />
      <DesktopTrayNavigation />
      <Outlet />
    </>
  )
}
