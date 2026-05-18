import { API_BASE_URL } from '../shared/api/config'
import { desktop, isDesktop } from '../utils/platform'
import {
  getPendingCount as getWebPendingCount,
  syncPendingTransactions,
  type SyncResult,
} from './offlineQueue'

export async function getOfflinePendingCount(): Promise<number> {
  if (isDesktop() && desktop?.offline) {
    try {
      return await desktop.offline.pendingCount()
    } catch {
      return 0
    }
  }
  return getWebPendingCount()
}

export async function syncOfflineQueue(
  accessToken: string,
  tenantId: string,
): Promise<SyncResult> {
  if (isDesktop() && desktop?.offline) {
    return desktop.offline.sync(API_BASE_URL, accessToken, tenantId)
  }
  return syncPendingTransactions(API_BASE_URL, accessToken, tenantId)
}
