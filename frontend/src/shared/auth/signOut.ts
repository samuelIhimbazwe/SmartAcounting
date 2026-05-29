import { apiClient } from '../api/client'
import { useAuthStore } from '../stores/authStore'

export async function revokeServerSession(): Promise<void> {
  const { refreshToken, accessToken } = useAuthStore.getState()
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  const body = refreshToken ? { refreshToken } : undefined
  try {
    await apiClient.delete('/api/v1/auth/logout', { data: body, headers })
  } catch {
    try {
      if (refreshToken) {
        await apiClient.post('/api/v1/auth/logout', { refreshToken }, { headers })
      }
    } catch {
      // best-effort revoke
    }
  }
}

export async function signOut(): Promise<void> {
  await revokeServerSession()
  useAuthStore.getState().clearSession()
  localStorage.clear()
  sessionStorage.clear()
}
