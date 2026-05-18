import type { NavigateFunction } from 'react-router-dom'
import { toExpiryTimestamp } from '../../shared/api/auth'
import type { Role } from '../../shared/types/roles'
import { rolePathMap, roles } from '../../shared/types/roles'

export interface OAuth2CallbackParams {
  accessToken?: string
  refreshToken?: string | null
  tenantId?: string
  userId?: string
  role?: string
  expiresInSeconds?: string
  error?: string
}

export interface OAuth2SessionActions {
  setTenantId: (tenantId: string) => void
  setUserId: (userId: string) => void
  setSession: (session: {
    role: Role
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
  })

  navigate(`/dashboard/${rolePathMap[role] ?? role.toLowerCase()}`)
  return true
}
