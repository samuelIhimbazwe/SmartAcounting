import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { desktop, isDesktop } from '../../utils/platform'

/** Handles tray menu route shortcuts from the Electron main process. */
export function DesktopTrayNavigation() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isDesktop() || !desktop?.navigation?.onNavigate) {
      return
    }
    return desktop.navigation.onNavigate((route) => {
      if (route.startsWith('/')) {
        navigate(route)
      }
    })
  }, [navigate])

  return null
}
