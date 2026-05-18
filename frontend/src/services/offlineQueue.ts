/**
 * Web offline transaction queue, backed by IndexedDB.
 *
 * Wire format is identical across web, desktop and mobile: the backend's
 * `POST /api/v1/sync/queue` accepts a JSON array of `SyncOperationRequest`:
 *
 *   {
 *     deviceId:        UUID,
 *     idempotencyKey:  UUID,
 *     operationType:   "POS_SALE",
 *     entityType:      "POS_CHECKOUT",
 *     payload:         {...},
 *     lamportClock:    epoch-ms,
 *     conflictPolicy:  "LAST_WRITE_WINS"
 *   }
 *
 * `idempotencyKey` lives in the *body*, not as an HTTP header — the
 * backend's `SyncService` reads it from the DTO. Required auth headers:
 *   - `Authorization: Bearer <token>`
 *   - `X-Tenant-Id: <tenantId>`
 *
 * Stored shape inside IndexedDB:
 *   {
 *     id, payload, idempotencyKey, savedAt,
 *     synced: 0 | 1,           // booleans aren't valid IDB keys
 *     retryCount, lastError?
 *   }
 */

const DB_NAME = 'smartaccounting-web-offline'
const STORE_NAME = 'offlineTransactions'
const DB_VERSION = 1
const MAX_RETRIES = 5
const DEVICE_ID_KEY = 'smartaccounting-web-device-id'

export interface OfflineRecord {
  id: string
  payload: unknown
  idempotencyKey: string
  savedAt: string
  synced: 0 | 1
  retryCount: number
  lastError?: string
}

export interface SyncResult {
  synced: number
  failed: number
}

interface SyncOperationRequest {
  deviceId: string
  idempotencyKey: string
  operationType: 'POS_SALE'
  entityType: 'POS_CHECKOUT'
  payload: unknown
  lamportClock: number
  conflictPolicy: 'LAST_WRITE_WINS'
}

/**
 * Stable per-browser device UUID, persisted in localStorage. Falls back to a
 * fresh UUID on each call when storage is blocked (private mode, etc.).
 */
function getDeviceId(): string {
  try {
    const cached = localStorage.getItem(DEVICE_ID_KEY)
    if (cached) return cached
    const fresh = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, fresh)
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('synced', 'synced')
      }
    }
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    request.onerror = () => reject(request.error)
  })
}

/** Persist a transaction payload locally and return its generated id. */
export async function queueTransaction(payload: object): Promise<string> {
  const id = crypto.randomUUID()
  const record: OfflineRecord = {
    id,
    payload,
    idempotencyKey: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    synced: 0,
    retryCount: 0,
  }
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return id
}

/** How many records are still pending sync. */
export async function getPendingCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).index('synced').count(IDBKeyRange.only(0))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAllPending(db: IDBDatabase): Promise<OfflineRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).index('synced').getAll(IDBKeyRange.only(0))
    req.onsuccess = () => resolve(req.result as OfflineRecord[])
    req.onerror = () => reject(req.error)
  })
}

function putRecord(db: IDBDatabase, record: OfflineRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function buildOperation(record: OfflineRecord, deviceId: string): SyncOperationRequest {
  return {
    deviceId,
    idempotencyKey: record.idempotencyKey,
    operationType: 'POS_SALE',
    entityType: 'POS_CHECKOUT',
    payload: record.payload,
    lamportClock: Date.now(),
    conflictPolicy: 'LAST_WRITE_WINS',
  }
}

/**
 * Drain pending transactions to the server. Each call is best-effort:
 * - Records over MAX_RETRIES are counted as failed and left untouched (so an
 *   operator can inspect them).
 * - Successful pushes are marked `synced: 1` so they no longer appear in the
 *   pending index.
 * - After any successful pushes, `/sync/flush` is fired (advisory; the
 *   backend gates it to CEO/OPS_MANAGER so other roles will get a 403 — we
 *   swallow that case).
 */
export async function syncPendingTransactions(
  apiBaseUrl: string,
  token: string,
  tenantId: string,
): Promise<SyncResult> {
  const db = await openDB()
  const pending = await getAllPending(db)
  const deviceId = getDeviceId()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  }

  let synced = 0
  let failed = 0

  for (const record of pending) {
    if (record.retryCount >= MAX_RETRIES) {
      failed += 1
      continue
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/sync/queue`, {
        method: 'POST',
        headers,
        body: JSON.stringify([buildOperation(record, deviceId)]),
      })
      if (res.ok) {
        await putRecord(db, { ...record, synced: 1 })
        synced += 1
      } else {
        await putRecord(db, {
          ...record,
          retryCount: record.retryCount + 1,
          lastError: `HTTP ${res.status}`,
        })
        failed += 1
      }
    } catch (err) {
      await putRecord(db, {
        ...record,
        retryCount: record.retryCount + 1,
        lastError: err instanceof Error ? err.message : String(err),
      })
      failed += 1
    }
  }

  if (synced > 0) {
    try {
      await fetch(`${apiBaseUrl}/api/v1/sync/flush`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
        },
      })
    } catch {
      /* flush is advisory and role-gated; ignore failures */
    }
  }

  return { synced, failed }
}
