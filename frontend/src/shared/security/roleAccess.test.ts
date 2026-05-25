import { describe, expect, it } from 'vitest'
import { canAccessRoleDashboard } from './roleAccess'
import { emptyRoleProfile } from '../types/roleProfiles'

describe('canAccessRoleDashboard', () => {
  it('permission-based: ANALYTICS_ALL sees all dashboards', () => {
    expect(canAccessRoleDashboard('CEO', 'CFO', ['ANALYTICS_ALL'])).toBe(true)
    expect(canAccessRoleDashboard('CFO', 'HR', ['ANALYTICS_ALL'])).toBe(true)
  })

  it('legacy CEO matrix still works without permissions', () => {
    expect(canAccessRoleDashboard('CEO', 'CFO')).toBe(true)
    expect(canAccessRoleDashboard('CFO', 'SALES')).toBe(false)
  })

  it('analytics-own users do not inherit ceo dashboard access', () => {
    expect(canAccessRoleDashboard('SALES', 'CEO', ['ANALYTICS_OWN'])).toBe(false)
    expect(canAccessRoleDashboard('SALES', 'SALES', ['ANALYTICS_OWN'])).toBe(true)
  })

  it('role profile dashboards override legacy and permission derivation', () => {
    const roleProfile = {
      ...emptyRoleProfile(),
      dashboardIds: ['MARKETING'],
    }
    expect(canAccessRoleDashboard('CFO', 'MARKETING', ['FINANCE_READ'], roleProfile)).toBe(true)
    expect(canAccessRoleDashboard('CFO', 'CFO', ['FINANCE_READ'], roleProfile)).toBe(false)
  })
})
