import { apiClient } from './client'
import { ApiError } from './errors'
import { normalizeRoleProfile, type RoleProfile } from '../types/roleProfiles'

export type BusinessSize = 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE'
export type BusinessType =
  | 'RETAIL'
  | 'FOOD'
  | 'PHARMACY'
  | 'SERVICES'
  | 'WHOLESALE'
  | 'CONSTRUCTION'
  | 'OTHER'

export interface PermissionDto {
  code: string
  label: string
  description?: string
  category: string
  dangerous?: boolean
  tenantDefined?: boolean
  grantsPlatformCodes?: string[]
}

export interface PermissionCategoryGroup {
  category: string
  permissions: PermissionDto[]
}

export interface TenantRoleDto {
  id: string
  name: string
  description?: string
  emoji?: string
  colour?: string
  isSystem: boolean
  isOwner: boolean
  roleProfile: RoleProfile
  permissions: PermissionDto[]
  userCount: number
}

export interface RoleTemplateDto {
  name: string
  description: string
  emoji: string
  colour: string
  alwaysPermissions: string[]
  optionalPermissions: string[]
  isOwner: boolean
  roleProfile: RoleProfile
}

export interface RoleSetupItemDto {
  name: string
  description: string
  emoji: string
  colour: string
  permissionCodes: string[]
  isOwner: boolean
  roleProfile?: RoleProfile
}

export interface TenantSetupRequestDto {
  size: BusinessSize
  type: BusinessType
  roles: RoleSetupItemDto[]
}

function unwrapArrayResponse<T>(data: unknown, resourceName: string): T[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const candidates = [record.content, record.items, record.rows, record.roles]
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as T[]
      }
    }
  }
  throw new ApiError(`Unexpected ${resourceName} response from the API.`, { details: data })
}

function normalizeTenantRole(role: TenantRoleDto): TenantRoleDto {
  return {
    ...role,
    roleProfile: normalizeRoleProfile(role.roleProfile),
  }
}

function normalizeRoleTemplate(template: RoleTemplateDto): RoleTemplateDto {
  return {
    ...template,
    roleProfile: normalizeRoleProfile(template.roleProfile),
  }
}

export async function listTenantRoles(): Promise<TenantRoleDto[]> {
  const { data } = await apiClient.get<unknown>('/api/v1/tenant/roles')
  return unwrapArrayResponse<TenantRoleDto>(data, 'tenant roles').map(normalizeTenantRole)
}

export async function listPermissionsByCategory(): Promise<PermissionCategoryGroup[]> {
  const { data } = await apiClient.get<unknown>('/api/v1/tenant/roles/permissions')
  return unwrapArrayResponse<PermissionCategoryGroup>(data, 'permission catalog')
}

export async function listPermissionCatalog(): Promise<PermissionDto[]> {
  const groups = await listPermissionsByCategory()
  return groups.flatMap((group) => group.permissions)
}

export async function fetchRoleSetupRecommendation(
  size: BusinessSize,
  type: BusinessType,
): Promise<RoleTemplateDto[]> {
  const { data } = await apiClient.get<unknown>('/api/v1/tenant/roles/setup/recommendation', {
    params: { size, type },
  })
  return unwrapArrayResponse<RoleTemplateDto>(data, 'role setup recommendation').map(normalizeRoleTemplate)
}

export async function saveTenantRoleSetup(request: TenantSetupRequestDto): Promise<TenantRoleDto[]> {
  const { data } = await apiClient.post<unknown>('/api/v1/tenant/roles/setup', request)
  return unwrapArrayResponse<TenantRoleDto>(data, 'tenant role setup').map(normalizeTenantRole)
}

export async function createTenantRole(payload: {
  name: string
  description?: string
  emoji: string
  colour: string
  permissionCodes: string[]
  roleProfile?: RoleProfile
}): Promise<TenantRoleDto> {
  const { data } = await apiClient.post<TenantRoleDto>('/api/v1/tenant/roles', payload)
  return normalizeTenantRole(data)
}

export async function updateTenantRole(
  roleId: string,
  payload: {
    name: string
    description?: string
    emoji: string
    colour: string
    permissionCodes: string[]
    roleProfile?: RoleProfile
  },
): Promise<TenantRoleDto> {
  const { data } = await apiClient.put<TenantRoleDto>(`/api/v1/tenant/roles/${roleId}`, payload)
  return normalizeTenantRole(data)
}

export async function replaceRolePermissions(roleId: string, permissionCodes: string[]): Promise<TenantRoleDto> {
  const { data } = await apiClient.post<TenantRoleDto>(`/api/v1/tenant/roles/${roleId}/permissions`, {
    permissionCodes,
  })
  return normalizeTenantRole(data)
}

export async function updateCustomPermissionGrants(
  permissionCode: string,
  grantsPlatformCodes: string[],
): Promise<PermissionDto> {
  const { data } = await apiClient.put<PermissionDto>(
    `/api/v1/tenant/roles/permissions/${encodeURIComponent(permissionCode)}/grants`,
    { grantsPlatformCodes },
  )
  return data
}

export async function deleteTenantRole(roleId: string): Promise<void> {
  await apiClient.delete(`/api/v1/tenant/roles/${roleId}`)
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  await apiClient.post(`/api/v1/tenant/users/${userId}/roles`, { roleId })
}

export async function suggestRolePermissions(roleName: string): Promise<string[]> {
  const { data } = await apiClient.post<{ permissionCodes: string[] }>('/api/v1/ai/suggest-permissions', {
    roleName,
  })
  return data.permissionCodes ?? []
}

export type RoleDesignMatchType =
  | 'NEW_ROLE'
  | 'VARIANT_OF_EXISTING'
  | 'NEAREST_EXISTING'
  | 'EXACT_DUPLICATE'

export interface CustomPermissionProposalDto {
  code: string
  label: string
  description: string
  category: string
  optionalGrants: string[]
  created: boolean
}

export interface RoleDraftSuggestionDto {
  name: string
  description: string
  emoji: string
  colour: string
  permissionCodes: string[]
  customPermissionCodes?: string[]
  roleProfile: RoleProfile
}

export interface SimilarRoleHintDto {
  roleId: string
  name: string
  emoji: string
  matchPercent: number
  reason: string
  permissionCodes: string[]
}

export interface RoleDesignSuggestionDto {
  matchType: RoleDesignMatchType
  fullySupported: boolean
  summary: string
  reasoning: string
  suggested: RoleDraftSuggestionDto
  basedOnRoleId: string | null
  basedOnRoleName: string | null
  similarRoles: SimilarRoleHintDto[]
  customPermissions: CustomPermissionProposalDto[]
  unsupportedNotes: string[]
  aiEnhanced: boolean
}

export async function designRoleFromPrompt(
  prompt: string,
  baseRoleId?: string | null,
): Promise<RoleDesignSuggestionDto> {
  const { data } = await apiClient.post<RoleDesignSuggestionDto>('/api/v1/tenant/roles/design-assistant', {
    prompt,
    baseRoleId: baseRoleId ?? undefined,
  })
  return {
    ...data,
    suggested: {
      ...data.suggested,
      roleProfile: normalizeRoleProfile(data.suggested.roleProfile),
    },
  }
}

export function templateToSetupItem(template: RoleTemplateDto, enabledOptional: string[] = []): RoleSetupItemDto {
  const codes = [...template.alwaysPermissions, ...enabledOptional.filter((c) => template.optionalPermissions.includes(c))]
  return {
    name: template.name,
    description: template.description,
    emoji: template.emoji,
    colour: template.colour,
    permissionCodes: [...new Set(codes)],
    isOwner: template.isOwner,
    roleProfile: normalizeRoleProfile(template.roleProfile),
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  POS: 'Point of sale',
  EBM: 'Fiscal',
  INVENTORY: 'Inventory',
  PROCUREMENT: 'Procurement',
  FINANCE: 'Finance',
  PAYROLL: 'Payroll',
  HR: 'People',
  ANALYTICS: 'Analytics',
  AI: 'AI',
  ADMIN: 'Settings',
}

export const ROLE_EMOJIS = ['👑', '💰', '🏪', '📦', '👥', '📢', '📊', '🧾', '🚚', '🔧', '💊', '🍽️', '🏗️', '📋', '🔐', '📱', '🖥️', '🏦', '⚕️', '🎯']

export const ROLE_COLOURS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b']
