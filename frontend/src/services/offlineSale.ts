import { desktop, isDesktop } from '../utils/platform'
import { queueTransaction } from './offlineQueue'

/**
 * Persist a POS sale locally for later sync.
 *
 * On Electron desktop, hands the payload to the SQLite-backed native queue
 * (durable across crashes / reinstalls). On the web, falls back to the
 * IndexedDB queue managed by `offlineQueue.ts`.
 */
export async function queueOfflineSale(payload: object): Promise<string> {
  if (isDesktop() && desktop) {
    return desktop.offline.queue(payload)
  }
  return queueTransaction(payload)
}
