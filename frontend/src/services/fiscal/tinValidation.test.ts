import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../shared/api/client'
import { validateTin } from './tinValidation'

vi.mock('../../shared/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

const mockedPost = vi.mocked(apiClient.post)

function installSessionStorageMock(): void {
  const store = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  })
}

describe('validateTin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installSessionStorageMock()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true,
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns valid TIN with name from API and caches per session', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { valid: true, name: 'ACME Rwanda Ltd' },
    } as never)

    const first = await validateTin('123456789')
    expect(first).toEqual({ valid: true, name: 'ACME Rwanda Ltd' })
    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/compliance/tin/validate', {
      tin: '123456789',
    })

    const second = await validateTin('123456789')
    expect(second).toEqual({ valid: true, name: 'ACME Rwanda Ltd' })
    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('tin_valid_123456789')).toBeTruthy()
  })

  it('returns invalid TIN when API reports not registered', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { valid: false, error: 'Unknown TIN' },
    } as never)

    const result = await validateTin('987654321')
    expect(result).toEqual({ valid: false, error: 'Unknown TIN' })
  })

  it('returns valid true when offline without calling API', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })

    const result = await validateTin('123456789')
    expect(result).toEqual({ valid: true })
    expect(mockedPost).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
  })

  it('returns valid true when backend is unreachable', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Network Error'))

    const result = await validateTin('123456789')
    expect(result).toEqual({ valid: true })
    expect(console.warn).toHaveBeenCalled()
  })

  it('rejects malformed TIN before API call', async () => {
    const result = await validateTin('12')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('9 digits')
    expect(mockedPost).not.toHaveBeenCalled()
  })
})
