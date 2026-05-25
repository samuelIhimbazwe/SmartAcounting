import { Navigate } from 'react-router-dom'
import { OnboardingPage } from './OnboardingPage'
import { getDefaultRoute } from '../../shared/routing/getDefaultRoute'
import { useAuthStore } from '../../shared/stores/authStore'

/**
 * Authenticated onboarding — no permission gate (owner may have no RBAC roles yet).
 * Redirects away once setup is marked complete.
 */
export function OnboardingRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.role)
  const setupComplete = useAuthStore((s) => s.setupComplete)
  const permissions = useAuthStore((s) => s.permissions)
  const effectiveRoleProfile = useAuthStore((s) => s.effectiveRoleProfile)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  const showInviteStep = sessionStorage.getItem('onboarding-invite') === '1'

  if (setupComplete && !showInviteStep) {
    return <Navigate to={getDefaultRoute(role, permissions, effectiveRoleProfile)} replace />
  }

  return <OnboardingPage />
}
