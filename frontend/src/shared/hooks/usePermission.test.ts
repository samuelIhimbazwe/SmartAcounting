import { describe, expect, it } from 'vitest'
import { useAuthStore } from '../stores/authStore'

describe('usePermission via auth store', () => {
  it('hasPermission checks permissions array from login', () => {
    useAuthStore.setState({
      permissions: ['POS_ACCESS', 'INVENTORY_READ'],
    })
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('POS_ACCESS')).toBe(true)
    expect(hasPermission('FINANCE_WRITE')).toBe(false)
  })
})
