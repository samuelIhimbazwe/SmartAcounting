import { desktop, isDesktop, type QueueSaleResult } from '../utils/platform'
import { queueTransaction } from './offlineQueue'

/**
 * Persist a POS sale locally for later sync.
 *
 * On Electron desktop, uses SQLite `pending_sales` via `queueSale`.
 * On the web, falls back to IndexedDB.
 */
export async function queueOfflineSale(payload: object): Promise<QueueSaleResult> {
  if (isDesktop() && desktop?.queueSale) {
    return desktop.queueSale(payload)
  }
  const localId = await queueTransaction(payload)
  return { localId, status: 'queued' }
}
