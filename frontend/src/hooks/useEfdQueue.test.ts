/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../shared/api/client'
import { EFD_PENDING_QUEUE_KEY } from '../services/fiscal/efd'
import type { EfdCheckoutPayload } from '../services/fiscal/efdCheckout'
import { useEfdQueue } from './useEfdQueue'

vi.mock('../shared/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

const mockedPost = vi.mocked(apiClient.post)

const sampleCheckout: EfdCheckoutPayload = {
  salesOrderId: '11111111-1111-4111-8111-111111111111',
  receiptNumber: 'R-TEST-001',
  tin: '123456789',
  items: [
    {
      description: 'Test product',
      quantity: 2,
      unitPrice: 500,
      vatRate: 0.18,
    },
  ],
  totalAmount: 1000,
  vatAmount: 152.54,
  paymentMethod: 'CASH',
  timestamp: '2026-05-24T12:00:00.000Z',
  currencyCode: 'RWF',
}

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: online,
    writable: true,
  })
}

describe('useEfdQueue — offline queue integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setNavigatorOnline(false)
    mockedPost.mockResolvedValue({
      data: {
        fiscalSignature: 'RRA-TEST-SIG',
        fiscalQrData: 'RRA|TX=test|SIG=RRA-TEST-SIG',
      },
    } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('queues offline, then clears queue after successful retry when online', async () => {
    const { result } = renderHook(() => useEfdQueue())

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0)
    })

    await act(async () => {
      const submitResult = await result.current.submitEfd(sampleCheckout)
      expect(submitResult.status).toBe('QUEUED')
    })

    const queuedRaw = localStorage.getItem(EFD_PENDING_QUEUE_KEY)
    expect(queuedRaw).toBeTruthy()
    const queued = JSON.parse(queuedRaw!) as Array<{ status: string }>
    expect(queued.some((row) => row.status === 'PENDING')).toBe(true)
    expect(result.current.pendingCount).toBeGreaterThan(0)

    setNavigatorOnline(true)

    await act(async () => {
      await result.current.retryNow()
    })

    expect(mockedPost).toHaveBeenCalled()
    expect(localStorage.getItem(EFD_PENDING_QUEUE_KEY)).toBe('[]')
    expect(result.current.pendingCount).toBe(0)
  })
})
