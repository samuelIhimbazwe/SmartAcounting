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
  tenantId?: string
  userId?: string
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
  tenantId?: string
  userId?: string
}

export function toExpiryTimestamp(expiresIn?: number) {
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
    tenantId: response.data.tenantId,
    userId: response.data.userId,
  }
}

export interface OAuth2Provider {
  provider: string
  displayName: string
  loginUrl: string
  iconUrl?: string
}

export async function fetchOAuth2Providers(): Promise<OAuth2Provider[]> {
  const response = await apiClient.get<OAuth2Provider[]>('/api/v1/auth/oauth2/providers')
  return response.data
}

/** Server-side OAuth2 redirect path (prepend API_BASE_URL). */
export async function requestOAuth2Link(provider: string): Promise<string> {
  const response = await apiClient.get<{ authorizePath: string }>(`/api/v1/auth/oauth2/authorize/${provider}`)
  return response.data.authorizePath
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
