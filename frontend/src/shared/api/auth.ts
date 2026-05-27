import { apiClient } from './client'
import type { Role } from '../types/roles'
import { normalizeRoleProfile, type RoleProfile } from '../types/roleProfiles'

interface LoginRequest {
  username: string
  password: string
  tenantId: string
  userId: string
}

export interface AssignedRoleSummary {
  id: string | null
  name: string
  owner: boolean
}

interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  token?: string
  role?: Role
  tenantId?: string
  userId?: string
  permissions?: string[]
  assignedRoles?: AssignedRoleSummary[]
  effectiveRoleProfile?: RoleProfile
  setupComplete?: boolean
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
  permissions: string[]
  assignedRoles: AssignedRoleSummary[]
  effectiveRoleProfile: RoleProfile
  setupComplete: boolean
  tenantId?: string
  userId?: string
}

export interface AuthSessionProfile {
  role: Role
  tenantId: string
  userId: string
  permissions: string[]
  assignedRoles: AssignedRoleSummary[]
  effectiveRoleProfile: RoleProfile
  setupComplete: boolean
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
    role: (response.data.role as Role | undefined) ?? 'CEO',
    permissions: response.data.permissions ?? [],
    assignedRoles: response.data.assignedRoles ?? [],
    effectiveRoleProfile: normalizeRoleProfile(response.data.effectiveRoleProfile),
    setupComplete: response.data.setupComplete ?? false,
    tenantId: response.data.tenantId,
    userId: response.data.userId,
  }
}

export async function fetchAuthMe(): Promise<AuthSessionProfile> {
  const response = await apiClient.get<AuthSessionProfile>('/api/v1/auth/me')
  return {
    ...response.data,
    role: response.data.role as Role,
    effectiveRoleProfile: normalizeRoleProfile(response.data.effectiveRoleProfile),
    setupComplete: response.data.setupComplete ?? false,
  }
}

export interface OAuth2Provider {
  provider: string
  displayName: string
  loginUrl: string
  iconUrl?: string
}

/** Returns [] when OAuth is disabled or the providers endpoint fails (non-fatal for signup/login). */
export async function fetchOAuth2Providers(): Promise<OAuth2Provider[]> {
  try {
    const response = await apiClient.get<OAuth2Provider[]>('/api/v1/auth/oauth2/providers')
    return response.data ?? []
  } catch {
    return []
  }
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
