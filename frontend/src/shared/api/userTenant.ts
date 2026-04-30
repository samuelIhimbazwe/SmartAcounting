import { apiClient } from './client'
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
  status?: string
}

export interface InviteTenantUserRequest {
  email: string
  role: Role
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

export async function listTenants() {
  const response = await apiClient.get<{ content?: TenantSummary[] } | TenantSummary[]>('/api/v1/admin/tenants', {
    params: { page: 0, size: 100 },
  })
  return toList(response.data)
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
  } catch {
    const response = await apiClient.get<{ content?: TenantUser[]; totalElements?: number } | TenantUser[]>(
      `/api/v1/tenants/${tenantId}/users`,
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
  } catch {
    await apiClient.post(`/api/v1/tenants/${tenantId}/users/invites`, payload)
  }
}

export async function updateTenantUserRole(tenantId: string, userId: string, role: Role) {
  try {
    await apiClient.patch(`/api/v1/admin/tenants/${tenantId}/users/${userId}`, { role })
  } catch {
    await apiClient.patch(`/api/v1/tenants/${tenantId}/users/${userId}`, { role })
  }
}
