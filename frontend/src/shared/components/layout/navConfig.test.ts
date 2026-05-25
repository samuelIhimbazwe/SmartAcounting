import { describe, expect, it } from 'vitest'
import { filterNavItems } from './navConfig'

describe('filterNavItems', () => {
  const has = (codes: string[]) => (code: string) => codes.includes(code)

  it('shows POS when user has POS_ACCESS permission', () => {
    const items = filterNavItems(has(['POS_ACCESS']))
    expect(items.some((item) => item.id === 'pos')).toBe(true)
  })

  it('shows sale history with ANALYTICS_OWN', () => {
    const items = filterNavItems(has(['ANALYTICS_OWN']))
    expect(items.some((item) => item.id === 'pos-history')).toBe(true)
    expect(items.some((item) => item.id === 'pos')).toBe(false)
  })

  it('shows returns only with POS_RETURNS', () => {
    expect(filterNavItems(has(['POS_ACCESS'])).some((item) => item.id === 'pos-returns')).toBe(false)
    expect(filterNavItems(has(['POS_RETURNS'])).some((item) => item.id === 'pos-returns')).toBe(true)
  })

  it('hides finance routes without FINANCE_READ', () => {
    const items = filterNavItems(has(['POS_ACCESS']))
    expect(items.some((item) => item.id === 'payment-runs')).toBe(false)
  })

  it('shows procurement with PROCUREMENT_READ', () => {
    const items = filterNavItems(has(['PROCUREMENT_READ']))
    expect(items.some((item) => item.id === 'purchase-order')).toBe(true)
  })

  it('hides invoice without FINANCE_WRITE', () => {
    expect(filterNavItems(has(['FINANCE_READ'])).some((item) => item.id === 'invoice')).toBe(false)
    expect(filterNavItems(has(['FINANCE_WRITE'])).some((item) => item.id === 'invoice')).toBe(true)
  })

  it('hides sales order without POS_ACCESS', () => {
    expect(filterNavItems(has(['ANALYTICS_OWN'])).some((item) => item.id === 'sales-order')).toBe(false)
    expect(filterNavItems(has(['POS_ACCESS'])).some((item) => item.id === 'sales-order')).toBe(true)
  })

  it('hides retail and documents without their required permissions', () => {
    const items = filterNavItems(has(['POS_ACCESS']))
    expect(items.some((item) => item.id === 'retail')).toBe(false)
    expect(items.some((item) => item.id === 'documents')).toBe(false)
    expect(filterNavItems(has(['INVENTORY_READ'])).some((item) => item.id === 'retail')).toBe(true)
    expect(filterNavItems(has(['FINANCE_READ'])).some((item) => item.id === 'documents')).toBe(true)
  })

  it('limits visible items to the role profile navigation contract', () => {
    const items = filterNavItems(has(['FINANCE_READ', 'ROLE_MANAGE']), ['admin-roles'])
    expect(items.map((item) => item.id)).toEqual(['admin-roles'])
  })
})
