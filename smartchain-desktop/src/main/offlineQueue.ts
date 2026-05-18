/**
 * SQLite-backed offline transaction queue for the desktop shell.
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
 * The idempotency key lives in the *body*, not as an HTTP header — the
 * backend's `SyncService` reads it from the DTO. Required auth headers:
 *   - `Authorization: Bearer <token>`
 *   - `X-Tenant-Id: <tenantId>`
 *
 * After any successful pushes, `/sync/flush` is fired (advisory; role-gated
 * to CEO/OPS_MANAGER, so non-privileged users will receive 403 and we
 * swallow that case).
 */

import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

const MAX_RETRIES = 5

interface Row {
  id: string
  payload: string // JSON-stringified
  idempotency_key: string
  saved_at: string
  synced: number // 0 / 1
  retry_count: number
  last_error: string | null
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

let db: Database.Database | null = null
let cachedDeviceId: string | null = null

function loadDriver(): typeof Database | null {
  try {
    // Lazy-loaded so an unbuilt native binary degrades gracefully into "queue
    // unavailable" rather than crashing the whole main process.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('better-sqlite3') as typeof Database
  } catch {
    return null
  }
}

function getDb(): Database.Database | null {
  if (db) return db
  const driver = loadDriver()
  if (!driver) return null
  const dbPath = path.join(app.getPath('userData'), 'offline-queue.db')
  db = new driver(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS offline_transactions (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_offline_synced ON offline_transactions(synced);
  `)
  return db
}

/**
 * Stable per-install device UUID, persisted alongside the SQLite file.
 *
 * Kept separate from `electron-store` so the value survives even when the
 * config store is wiped, and so we don't pull the ESM-only flavor of
 * electron-store into the main process for a single string.
 */
function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId
  try {
    const userData = app.getPath('userData')
    const filePath = path.join(userData, 'device-id.txt')
    if (fs.existsSync(filePath)) {
      const value = fs.readFileSync(filePath, 'utf-8').trim()
      if (value) {
        cachedDeviceId = value
        return value
      }
    }
    const fresh = randomUUID()
    fs.mkdirSync(userData, { recursive: true })
    fs.writeFileSync(filePath, fresh, { encoding: 'utf-8' })
    cachedDeviceId = fresh
    return fresh
  } catch {
    const fresh = randomUUID()
    cachedDeviceId = fresh
    return fresh
  }
}

export function queueTransaction(payload: unknown): string {
  const handle = getDb()
  if (!handle) {
    throw new Error('Offline queue unavailable (better-sqlite3 not loaded)')
  }
  const id = randomUUID()
  const idempotencyKey = randomUUID()
  const savedAt = new Date().toISOString()
  const stmt = handle.prepare(
    `INSERT INTO offline_transactions (id, payload, idempotency_key, saved_at, synced, retry_count)
     VALUES (?, ?, ?, ?, 0, 0)`,
  )
  stmt.run(id, JSON.stringify(payload ?? null), idempotencyKey, savedAt)
  return id
}

export function getPendingCount(): number {
  const handle = getDb()
  if (!handle) return 0
  const row = handle
    .prepare<unknown[], { count: number }>(
      `SELECT COUNT(*) AS count FROM offline_transactions WHERE synced = 0`,
    )
    .get() as { count: number } | undefined
  return row?.count ?? 0
}

function buildOperation(row: Row, deviceId: string): SyncOperationRequest {
  return {
    deviceId,
    idempotencyKey: row.idempotency_key,
    operationType: 'POS_SALE',
    entityType: 'POS_CHECKOUT',
    payload: JSON.parse(row.payload),
    lamportClock: Date.now(),
    conflictPolicy: 'LAST_WRITE_WINS',
  }
}

export async function syncPending(
  apiBaseUrl: string,
  token: string,
  tenantId: string,
): Promise<SyncResult> {
  const handle = getDb()
  if (!handle) return { synced: 0, failed: 0 }

  const pending = handle
    .prepare<unknown[], Row>(
      `SELECT * FROM offline_transactions WHERE synced = 0 AND retry_count < ?`,
    )
    .all(MAX_RETRIES) as Row[]

  const markSynced = handle.prepare(
    `UPDATE offline_transactions SET synced = 1 WHERE id = ?`,
  )
  const markFailed = handle.prepare(
    `UPDATE offline_transactions SET retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
  )

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  }
  const deviceId = getDeviceId()

  let synced = 0
  let failed = 0

  for (const record of pending) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/sync/queue`, {
        method: 'POST',
        headers,
        body: JSON.stringify([buildOperation(record, deviceId)]),
      })
      if (res.ok) {
        markSynced.run(record.id)
        synced += 1
      } else {
        markFailed.run(`HTTP ${res.status}`, record.id)
        failed += 1
      }
    } catch (err) {
      markFailed.run(err instanceof Error ? err.message : String(err), record.id)
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

export function closeOfflineQueue(): void {
  try {
    db?.close()
  } catch {
    /* ignore */
  }
  db = null
}
