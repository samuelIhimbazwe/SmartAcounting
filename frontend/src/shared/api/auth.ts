import { apiClient } from './client'
import type { Role } from '../types/roles'

interface LoginRequest {
  username: string
  password: string
  tenantId: string
  userId: string
}

interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  token?: string
  role?: Role
}

interface RefreshResponse {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  token?: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  role: Role
}

function toExpiryTimestamp(expiresIn?: number) {
  if (!expiresIn || Number.isNaN(expiresIn)) {
    return null
  }
  return Date.now() + expiresIn * 1000
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', request)
  const accessToken = response.data.accessToken ?? response.data.token
  if (!accessToken) {
    throw new Error('Login response missing access token')
  }
  return {
    accessToken,
    refreshToken: response.data.refreshToken ?? null,
    expiresAt: toExpiryTimestamp(response.data.expiresIn),
    role: response.data.role ?? 'CEO',
  }
}

export async function refreshAccessToken(request: { refreshToken: string; tenantId: string; userId: string }) {
  const response = await apiClient.post<RefreshResponse>('/api/v1/auth/refresh', request)
  const accessToken = response.data.accessToken ?? response.data.token
  if (!accessToken) {
    throw new Error('Refresh response missing access token')
  }
  return {
    accessToken,
    refreshToken: response.data.refreshToken ?? request.refreshToken,
    expiresAt: toExpiryTimestamp(response.data.expiresIn),
  }
}
