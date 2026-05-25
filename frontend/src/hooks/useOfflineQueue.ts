import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../shared/api/config'
import { useAuthStore } from '../shared/stores/authStore'
import { desktop, isDesktop, type QueueStatusItem } from '../utils/platform'

const SYNC_COOLDOWN_MS = 30_000
const MAX_RETRIES = 3

export function useOfflineQueue() {
  const isElectron = isDesktop()
  const accessToken = useAuthStore((s) => s.accessToken)
  const tenantId = useAuthStore((s) => s.tenantId)
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [failedItems, setFailedItems] = useState<QueueStatusItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const lastSyncRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!isElectron || !desktop?.getQueueStatus) {
      setPendingCount(0)
      setFailedCount(0)
      setFailedItems([])
      return
    }
    try {
      const status = await desktop.getQueueStatus()
      setPendingCount(status.pendingCount)
      setFailedCount(status.failedCount)
      setFailedItems(status.items.filter((item) => item.retryCount >= MAX_RETRIES))
    } catch {
      setPendingCount(0)
      setFailedCount(0)
      setFailedItems([])
    }
  }, [isElectron])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 5000)
    return () => window.clearInterval(id)
  }, [refresh])

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !desktop?.syncQueue || !accessToken || !tenantId) {
      return false
    }
    const now = Date.now()
    if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) {
      return false
    }
    lastSyncRef.current = now
    setIsSyncing(true)
    try {
      await desktop.syncQueue(API_BASE_URL, accessToken, tenantId)
      await refresh()
      return true
    } finally {
      setIsSyncing(false)
    }
  }, [isElectron, accessToken, tenantId, refresh])

  useEffect(() => {
    if (!isElectron) {
      return
    }
    const onOnline = () => {
      void syncNow()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [isElectron, syncNow])

  const clearFailed = useCallback(async (): Promise<number> => {
    if (!desktop?.clearFailed) {
      return 0
    }
    const result = await desktop.clearFailed()
    await refresh()
    return result.deleted
  }, [refresh])

  const retryAllFailed = useCallback(async (): Promise<void> => {
    if (desktop?.resetFailedRetries) {
      await desktop.resetFailedRetries()
      await refresh()
    }
    await syncNow()
  }, [refresh, syncNow])

  return {
    isElectron,
    pendingCount,
    failedCount,
    failedItems,
    syncNow,
    isSyncing,
    refresh,
    clearFailed,
    retryAllFailed,
  }
}
