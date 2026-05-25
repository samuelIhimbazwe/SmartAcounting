import { describe, expect, it } from 'vitest'
import {
  canAccessRoleDashboard,
  hasAnyPermission,
  hasPermission,
  normalizePermissions,
  Permission,
} from './permissions'

describe('permissions', () => {
  it('ANALYTICS_ALL grants any check', () => {
    const perms = normalizePermissions([Permission.ANALYTICS_ALL])
    expect(hasPermission(perms, 'FINANCE_CLOSE')).toBe(true)
    expect(canAccessRoleDashboard(perms, 'HR')).toBe(true)
  })

  it('cashier-like set can access sales dashboard only', () => {
    const perms = normalizePermissions([Permission.POS_ACCESS, 'EBM_SUBMIT'])
    expect(canAccessRoleDashboard(perms, 'SALES')).toBe(true)
    expect(canAccessRoleDashboard(perms, 'CFO')).toBe(false)
  })

  it('analytics-own cannot access the ceo dashboard', () => {
    const perms = normalizePermissions([Permission.ANALYTICS_OWN])
    expect(canAccessRoleDashboard(perms, 'CEO')).toBe(false)
    expect(canAccessRoleDashboard(perms, 'SALES')).toBe(true)
  })

  it('hasAnyPermission requires at least one match', () => {
    const perms = normalizePermissions(['PROCUREMENT_READ'])
    expect(hasAnyPermission(perms, ['PROCUREMENT_READ', 'FINANCE_WRITE'])).toBe(true)
    expect(hasAnyPermission(perms, ['FINANCE_WRITE'])).toBe(false)
  })
})
