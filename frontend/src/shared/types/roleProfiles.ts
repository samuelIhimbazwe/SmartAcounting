import { roles, type Role } from './roles'

export interface RoleProfile {
  capabilityBundleIds: string[]
  dashboardIds: Role[]
  landingRoute: string | null
  navItemIds: string[]
  searchScopes: string[]
  workflowTemplateIds: string[]
  layoutVariant: string | null
  uiFlags: Record<string, boolean>
  recommendationSource: string | null
}

export function emptyRoleProfile(): RoleProfile {
  return {
    capabilityBundleIds: [],
    dashboardIds: [],
    landingRoute: null,
    navItemIds: [],
    searchScopes: [],
    workflowTemplateIds: [],
    layoutVariant: null,
    uiFlags: {},
    recommendationSource: null,
  }
}

export function normalizeRoleProfile(input?: Partial<RoleProfile> | null): RoleProfile {
  const empty = emptyRoleProfile()
  if (!input) {
    return empty
  }

  const knownRoles = new Set<Role>(roles)
  const normalizeList = (values: unknown): string[] =>
    Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))] : []

  const dashboardIds = normalizeList(input.dashboardIds).filter((dashboard): dashboard is Role => knownRoles.has(dashboard as Role))
  const uiFlags =
    input.uiFlags && typeof input.uiFlags === 'object'
      ? Object.fromEntries(Object.entries(input.uiFlags).filter((entry): entry is [string, boolean] => typeof entry[0] === 'string' && typeof entry[1] === 'boolean'))
      : {}

  return {
    capabilityBundleIds: normalizeList(input.capabilityBundleIds),
    dashboardIds,
    landingRoute: typeof input.landingRoute === 'string' && input.landingRoute.trim() ? input.landingRoute.trim() : null,
    navItemIds: normalizeList(input.navItemIds),
    searchScopes: normalizeList(input.searchScopes),
    workflowTemplateIds: normalizeList(input.workflowTemplateIds),
    layoutVariant: typeof input.layoutVariant === 'string' && input.layoutVariant.trim() ? input.layoutVariant.trim() : null,
    uiFlags,
    recommendationSource:
      typeof input.recommendationSource === 'string' && input.recommendationSource.trim()
        ? input.recommendationSource.trim()
        : null,
  }
}
