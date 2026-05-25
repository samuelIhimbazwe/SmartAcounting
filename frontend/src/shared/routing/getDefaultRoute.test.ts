import { describe, expect, it } from 'vitest'
import { getDefaultRoute } from './getDefaultRoute'
import { emptyRoleProfile } from '../types/roleProfiles'

describe('getDefaultRoute', () => {
  it('keeps analytics-own users on their own dashboard', () => {
    expect(getDefaultRoute('SALES', ['ANALYTICS_OWN'])).toBe('/dashboard/sales')
  })

  it('prefers the user primary dashboard over other eligible dashboards', () => {
    expect(getDefaultRoute('ACCOUNTING', ['FINANCE_READ', 'EBM_AUDIT'])).toBe('/dashboard/accounting')
  })

  it('uses the effective role profile landing route when allowed', () => {
    expect(
      getDefaultRoute(
        'ACCOUNTING',
        ['FINANCE_READ', 'ROLE_MANAGE'],
        {
          ...emptyRoleProfile(),
          navItemIds: ['admin-roles'],
          landingRoute: '/admin/roles',
        },
      ),
    ).toBe('/admin/roles')
  })
})
