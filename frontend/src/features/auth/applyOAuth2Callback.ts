import type { NavigateFunction } from 'react-router-dom'
import { toExpiryTimestamp, type AssignedRoleSummary } from '../../shared/api/auth'
import { resolvePostLoginRoute } from '../../shared/routing/postLoginRoute'
import type { Role } from '../../shared/types/roles'
import { roles } from '../../shared/types/roles'

export interface OAuth2CallbackParams {
  accessToken?: string
  refreshToken?: string | null
  tenantId?: string
  userId?: string
  role?: string
  expiresInSeconds?: string
  setupComplete?: string
  permissions?: string
  assignedRoles?: string
  error?: string
}

export interface OAuth2SessionActions {
  setTenantId: (tenantId: string) => void
  setUserId: (userId: string) => void
  setSession: (session: {
    role: Role
    permissions?: string[]
    assignedRoles?: AssignedRoleSummary[]
    setupComplete?: boolean
    accessToken: string
    refreshToken: string | null
    expiresAt: number | null
  }) => void
}

function parseRole(roleParam: string | undefined): Role | null {
  if (!roleParam) {
    return null
  }
  return roles.includes(roleParam as Role) ? (roleParam as Role) : null
}

function parseSetupComplete(value: string | undefined): boolean {
  if (!value) {
    return false
  }
  return value === 'true' || value === '1'
}

function parsePermissions(value: string | undefined): string[] {
  if (!value) {
    return []
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function parseAssignedRoles(value: string | undefined): AssignedRoleSummary[] {
  if (!value) {
    return []
  }
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (item): item is AssignedRoleSummary =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as AssignedRoleSummary).name === 'string',
    )
  } catch {
    return []
  }
}

/**
 * Applies OAuth2 query/protocol params to the auth store and navigates.
 * @returns true if login succeeded, false if redirected to login with error.
 */
export function applyOAuth2Callback(
  params: OAuth2CallbackParams,
  navigate: NavigateFunction,
  actions: OAuth2SessionActions,
): boolean {
  const error = params.error
  if (error) {
    navigate('/login?error=' + encodeURIComponent(error))
    return false
  }

  const accessToken = params.accessToken
  const refreshToken = params.refreshToken ?? null
  const tenantId = params.tenantId
  const userId = params.userId
  const role = parseRole(params.role)
  const expiresInRaw = params.expiresInSeconds
  const expiresInSeconds = expiresInRaw ? Number.parseInt(expiresInRaw, 10) : undefined
  const setupComplete = parseSetupComplete(params.setupComplete)
  const permissions = parsePermissions(params.permissions)
  const assignedRoles = parseAssignedRoles(params.assignedRoles)

  if (!accessToken || !tenantId || !userId || !role) {
    navigate('/login?error=' + encodeURIComponent('Invalid OAuth2 response'))
    return false
  }

  actions.setTenantId(tenantId)
  actions.setUserId(userId)
  actions.setSession({
    accessToken,
    refreshToken,
    expiresAt: toExpiryTimestamp(expiresInSeconds),
    role,
    permissions,
    assignedRoles,
    setupComplete,
  })

  navigate(resolvePostLoginRoute(setupComplete, role, permissions, assignedRoles))
  return true
}
