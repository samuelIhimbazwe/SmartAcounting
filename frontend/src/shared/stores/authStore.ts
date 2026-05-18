import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '../types/roles'
import { persistTenantId, resolveTenantId } from '../tenant/resolveTenant'
import { resolveUserId } from '../tenant/resolveUserId'

interface AuthState {
  role: Role | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  tenantId: string
  userId: string
  setSession: (session: {
    role: Role
    accessToken: string
    refreshToken: string | null
    expiresAt: number | null
    tenantId?: string
    userId?: string
  }) => void
  setTokens: (tokens: { accessToken: string; refreshToken: string | null; expiresAt: number | null }) => void
  setTenantId: (tenantId: string) => void
  clearSession: () => void
}

const defaultTenant = resolveTenantId()
const defaultUser = resolveUserId()

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      tenantId: defaultTenant,
      userId: defaultUser,
      setSession: ({ role, accessToken, refreshToken, expiresAt, tenantId, userId }) =>
        set({
          role,
          accessToken,
          refreshToken,
          expiresAt,
          ...(tenantId ? { tenantId } : {}),
          ...(userId ? { userId } : {}),
        }),
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
      clearSession: () =>
        set({
          role: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        }),
    }),
    {
      name: 'smartchain-auth',
    },
  ),
)
