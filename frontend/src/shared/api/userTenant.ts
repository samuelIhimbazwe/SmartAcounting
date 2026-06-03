import { apiClient } from './client'
import { ApiError, isApiError } from './errors'
import type { Role } from '../types/roles'

export interface TenantSummary {
  id: string
  name: string
  country?: string
  currency?: string
  status?: string
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: Role
  roleId?: string
  roleName?: string
  status?: string
}

export interface InviteTenantUserRequest {
  email: string
  role?: Role
  roleId?: string
}

export interface ListTenantUsersParams {
  page: number
  size: number
  query: string
}

export interface PaginatedUsers {
  rows: TenantUser[]
  total: number
}

function toList<T>(data: T[] | { content?: T[] }) {
  return Array.isArray(data) ? data : data.content ?? []
}

function shouldFallbackToSelfService(error: unknown) {
  return isApiError(error) ? error.status === 403 || error.status === 404 : false
}

function normalizeTenantSummary(raw: Record<string, unknown>): TenantSummary {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: raw.status != null ? String(raw.status) : undefined,
  }
}

export async function listTenants() {
  const response = await apiClient.get<unknown>('/api/v1/admin/tenants', {
    params: { page: 0, size: 100 },
  })
  const rows = toList(response.data as TenantSummary[] | { content?: TenantSummary[] })
  return rows.map((row) => {
    if (typeof row === 'object' && row !== null && 'id' in row && 'name' in row) {
      return row as TenantSummary
    }
    return normalizeTenantSummary(row as Record<string, unknown>)
  })
}

export async function provisionTenant(name: string) {
  const { data } = await apiClient.post<{ tenantId: string; status?: string }>('/api/v1/admin/tenants', { name })
  return data
}

export async function updateTenantPlan(tenantId: string, plan: string) {
  const { data } = await apiClient.patch<{ tenantId: string; plan: string }>(
    `/api/v1/admin/tenants/${tenantId}/plan`,
    { plan },
  )
  return data
}

export async function disableTenant(tenantId: string) {
  const { data } = await apiClient.post<{ tenantId: string; status: string }>(
    `/api/v1/admin/tenants/${tenantId}/disable`,
  )
  return data
}

export async function listTenantUsers(tenantId: string, params: ListTenantUsersParams): Promise<PaginatedUsers> {
  const query = {
    page: params.page,
    size: params.size,
    q: params.query,
  }

  try {
    const response = await apiClient.get<{ content?: TenantUser[]; totalElements?: number } | TenantUser[]>(
      `/api/v1/admin/tenants/${tenantId}/users`,
      { params: query },
    )
    const rows = toList(response.data)
    const total = Array.isArray(response.data) ? rows.length : (response.data.totalElements ?? rows.length)
    return { rows, total }
  } catch (error) {
    if (!shouldFallbackToSelfService(error)) {
      throw error
    }
    const response = await apiClient.get<{ content?: TenantUser[]; totalElements?: number } | TenantUser[]>(
      '/api/v1/tenant/users',
      { params: query },
    )
    const rows = toList(response.data)
    const total = Array.isArray(response.data) ? rows.length : (response.data.totalElements ?? rows.length)
    return { rows, total }
  }
}

export async function inviteTenantUser(tenantId: string, payload: InviteTenantUserRequest) {
  try {
    await apiClient.post(`/api/v1/admin/tenants/${tenantId}/users/invites`, payload)
  } catch (error) {
    if (!shouldFallbackToSelfService(error)) {
      throw error
    }
    throw new ApiError('Inviting staff from this screen requires the admin tenant management endpoint.', {
      status: isApiError(error) ? error.status : null,
      original: error,
    })
  }
}

export async function updateTenantUserRole(
  tenantId: string,
  userId: string,
  payload: { role?: Role; roleId?: string },
) {
  try {
    await apiClient.patch(`/api/v1/admin/tenants/${tenantId}/users/${userId}`, payload)
  } catch (error) {
    if (!shouldFallbackToSelfService(error)) {
      throw error
    }
    if (!payload.role) {
      throw new ApiError('Custom tenant roles require the admin tenant management endpoint.', {
        status: isApiError(error) ? error.status : null,
        original: error,
      })
    }
    await apiClient.patch(`/api/v1/tenant/users/${userId}/role`, { role: payload.role })
  }
}
