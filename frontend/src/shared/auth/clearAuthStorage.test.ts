/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { AUTH_PERSIST_KEY, clearAuthStorage } from './clearAuthStorage'

describe('clearAuthStorage', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('removes auth keys but keeps UI preferences', () => {
    localStorage.setItem(AUTH_PERSIST_KEY, '{"state":{"accessToken":"x"}}')
    localStorage.setItem('smartchain-tenant-id', 'tenant-a')
    localStorage.setItem('smartaccounting-theme', 'dark')
    localStorage.setItem('smartchain-locale', 'fr')
    localStorage.setItem('smartchain_pos_sale_history_v1:tenant-a', '[]')
    sessionStorage.setItem('smartchain_till_session_id', 'sess-1')
    sessionStorage.setItem('tin_valid_123456789', '{"valid":true}')

    clearAuthStorage()

    expect(localStorage.getItem(AUTH_PERSIST_KEY)).toBeNull()
    expect(localStorage.getItem('smartchain-tenant-id')).toBeNull()
    expect(localStorage.getItem('smartchain_pos_sale_history_v1:tenant-a')).toBeNull()
    expect(localStorage.getItem('smartaccounting-theme')).toBe('dark')
    expect(localStorage.getItem('smartchain-locale')).toBe('fr')
    expect(sessionStorage.getItem('smartchain_till_session_id')).toBeNull()
    expect(sessionStorage.getItem('tin_valid_123456789')).toBeNull()
  })
})
