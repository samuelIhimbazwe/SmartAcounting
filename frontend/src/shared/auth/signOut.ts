import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useBranchStore } from '../stores/branchStore'
import { clearAuthStorage } from './clearAuthStorage'

export type AuthRequestConfig = InternalAxiosRequestConfig & { skipAuthRefresh?: boolean }

let invalidatingSession = false

export async function revokeServerSession(): Promise<void> {
  const { refreshToken, accessToken } = useAuthStore.getState()
  if (!refreshToken && !accessToken) {
    return
  }

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  const body = refreshToken ? { refreshToken } : undefined
  const config = { skipAuthRefresh: true } satisfies Partial<AuthRequestConfig>

  try {
    await apiClient.delete('/api/v1/auth/logout', { data: body, headers, ...config })
  } catch {
    try {
      if (refreshToken) {
        await apiClient.post('/api/v1/auth/logout', { refreshToken }, { headers, ...config })
      }
    } catch {
      // best-effort revoke
    }
  }
}

export type InvalidateSessionOptions = {
  /** When false, only clears client state (e.g. refresh token already absent). Default true. */
  revoke?: boolean
}

/** Revokes server session when possible, then clears auth store and persisted credentials. */
export async function invalidateSession(options?: InvalidateSessionOptions): Promise<void> {
  if (invalidatingSession) {
    return
  }
  invalidatingSession = true
  try {
    const shouldRevoke = options?.revoke !== false
    if (shouldRevoke) {
      await revokeServerSession()
    }
    useAuthStore.getState().clearSession()
    useBranchStore.setState({ branchId: null, branchName: null })
    clearAuthStorage()
  } finally {
    invalidatingSession = false
  }
}

export async function signOut(): Promise<void> {
  await invalidateSession({ revoke: true })
}

export function isSessionInvalidationInProgress(): boolean {
  return invalidatingSession
}
