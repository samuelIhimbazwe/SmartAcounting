import { useCallback, useEffect, useState } from 'react'
import {
  getEfdDisplayStatus,
  getPendingEfdCount,
  notifyQueueChanged,
  retryPendingEfdSubmissions,
  submitSaleToEfd,
  type EfdDisplayStatus,
  type EfdSubmitResult,
} from '../services/fiscal/efd'
import {
  efdCheckoutToSalePayload,
  type EfdCheckoutPayload,
} from '../services/fiscal/efdCheckout'

export interface UseEfdQueueResult {
  pendingCount: number
  displayStatus: EfdDisplayStatus
  retryNow: () => Promise<number>
  submitEfd: (payload: EfdCheckoutPayload) => Promise<EfdSubmitResult>
}

function refreshCounts(): { pendingCount: number; displayStatus: EfdDisplayStatus } {
  return {
    pendingCount: getPendingEfdCount(),
    displayStatus: getEfdDisplayStatus(),
  }
}

export function useEfdQueue(): UseEfdQueueResult {
  const [{ pendingCount, displayStatus }, setState] = useState(refreshCounts)

  const syncState = useCallback(() => {
    setState(refreshCounts())
  }, [])

  useEffect(() => {
    syncState()
    const onQueueChanged = () => syncState()
    const onOnline = () => {
      void retryPendingEfdSubmissions(true).then(() => syncState())
    }

    window.addEventListener('efd-queue-changed', onQueueChanged)
    window.addEventListener('online', onOnline)

    if (navigator.onLine) {
      void retryPendingEfdSubmissions(true).then(() => syncState())
    }

    return () => {
      window.removeEventListener('efd-queue-changed', onQueueChanged)
      window.removeEventListener('online', onOnline)
    }
  }, [syncState])

  const retryNow = useCallback(async () => {
    const synced = await retryPendingEfdSubmissions(navigator.onLine)
    notifyQueueChanged()
    syncState()
    return synced
  }, [syncState])

  const submitEfd = useCallback(
    async (payload: EfdCheckoutPayload) => {
      const result = await submitSaleToEfd(efdCheckoutToSalePayload(payload), navigator.onLine)
      notifyQueueChanged()
      syncState()
      return result
    },
    [syncState],
  )

  return { pendingCount, displayStatus, retryNow, submitEfd }
}
