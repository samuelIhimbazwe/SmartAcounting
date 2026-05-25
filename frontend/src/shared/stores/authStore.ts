import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '../types/roles'
import type { AssignedRoleSummary } from '../api/auth'
import { emptyRoleProfile, type RoleProfile } from '../types/roleProfiles'
import { persistTenantId, resolveTenantId } from '../tenant/resolveTenant'
import { resolveUserId } from '../tenant/resolveUserId'

interface AuthState {
  role: Role | null
  permissions: string[]
  assignedRoles: AssignedRoleSummary[]
  effectiveRoleProfile: RoleProfile
  setupComplete: boolean
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  tenantId: string
  userId: string
  setSession: (session: {
    role: Role
    permissions?: string[]
    assignedRoles?: AssignedRoleSummary[]
    effectiveRoleProfile?: RoleProfile
    setupComplete?: boolean
    accessToken: string
    refreshToken: string | null
    expiresAt: number | null
    tenantId?: string
    userId?: string
  }) => void
  setRbac: (rbac: { permissions: string[]; assignedRoles: AssignedRoleSummary[]; role?: Role; effectiveRoleProfile?: RoleProfile }) => void
  setSetupComplete: (setupComplete: boolean) => void
  setTokens: (tokens: { accessToken: string; refreshToken: string | null; expiresAt: number | null }) => void
  setTenantId: (tenantId: string) => void
  setUserId: (userId: string) => void
  clearSession: () => void
  hasPermission: (code: string) => boolean
}

const defaultTenant = resolveTenantId()
const defaultUser = resolveUserId()

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      role: null,
      permissions: [],
      assignedRoles: [],
      effectiveRoleProfile: emptyRoleProfile(),
      setupComplete: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      tenantId: defaultTenant,
      userId: defaultUser,
      setSession: ({ role, permissions, assignedRoles, effectiveRoleProfile, setupComplete, accessToken, refreshToken, expiresAt, tenantId, userId }) =>
        set({
          role,
          permissions: permissions ?? [],
          assignedRoles: assignedRoles ?? [],
          effectiveRoleProfile: effectiveRoleProfile ?? emptyRoleProfile(),
          setupComplete: setupComplete ?? false,
          accessToken,
          refreshToken,
          expiresAt,
          ...(tenantId ? { tenantId } : {}),
          ...(userId ? { userId } : {}),
        }),
      setRbac: ({ permissions, assignedRoles, role, effectiveRoleProfile }) =>
        set({
          permissions,
          assignedRoles,
          ...(effectiveRoleProfile ? { effectiveRoleProfile } : {}),
          ...(role ? { role } : {}),
        }),
      setSetupComplete: (setupComplete) => set({ setupComplete }),
      setTokens: ({ accessToken, refreshToken, expiresAt }) =>
        set({
          accessToken,
          refreshToken,
          expiresAt,
        }),
      setTenantId: (tenantId) => {
        persistTenantId(tenantId)
        set({ tenantId })
      },
      setUserId: (userId) => set({ userId }),
      clearSession: () =>
        set({
          role: null,
          permissions: [],
          assignedRoles: [],
          effectiveRoleProfile: emptyRoleProfile(),
          setupComplete: false,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        }),
      hasPermission: (code: string) => get().permissions.includes(code),
    }),
    {
      name: 'smartchain-auth',
    },
  ),
)
