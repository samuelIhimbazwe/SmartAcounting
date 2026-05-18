import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyOAuth2Callback } from './applyOAuth2Callback'
import { useAuthStore } from '../../shared/stores/authStore'
import { desktop, isDesktop } from '../../utils/platform'

/**
 * Receives OAuth2 tokens from the Electron main process (smartchain:// callback).
 */
export function DesktopOAuth2Listener() {
  const navigate = useNavigate()
  const { setSession, setTenantId, setUserId } = useAuthStore()

  useEffect(() => {
    if (!isDesktop() || !desktop?.auth?.onOAuth2Callback) {
      return
    }
    return desktop.auth.onOAuth2Callback((params) => {
      applyOAuth2Callback(params, navigate, { setSession, setTenantId, setUserId })
    })
  }, [navigate, setSession, setTenantId, setUserId])

  return null
}
