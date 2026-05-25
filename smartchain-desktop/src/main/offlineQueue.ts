/**
 * SQLite-backed POS sale queue for the desktop shell (Sprint 4).
 *
 * Sales are stored locally when offline and replayed via
 * `POST /api/v1/pos/checkout` with `X-Idempotency-Key: localId`.
 */

import { app } from 'electron'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

const MAX_RETRIES = 3

interface PendingSaleRow {
  localId: string
  payload: string
  createdAt: number
  syncedAt: number | null
  lastError: string | null
  retryCount: number
}

export interface QueueSaleResult {
  localId: string
  status: 'queued'
}

export interface QueueStatusItem {
  localId: string
  createdAt: number
  retryCount: number
  lastError: string | null
}

export interface QueueStatus {
  pendingCount: number
  failedCount: number
  items: QueueStatusItem[]
}

export interface SyncQueueResult {
  synced: number
  failed: number
  errors: string[]
}

let db: Database.Database | null = null

function loadDriver(): typeof Database | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('better-sqlite3') as typeof Database
  } catch {
    return null
  }
}

function migrateLegacyTable(handle: Database.Database): void {
  const legacy = handle
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'offline_transactions'`,
    )
    .get() as { name: string } | undefined
  if (!legacy) {
    return
  }
  const pendingExists = handle
    .prepare(`SELECT COUNT(*) AS count FROM pending_sales`)
    .get() as { count: number }
  if (pendingExists.count > 0) {
    return
  }
  const rows = handle
    .prepare(`SELECT id, payload, saved_at, retry_count, last_error FROM offline_transactions WHERE synced = 0`)
    .all() as Array<{
    id: string
    payload: string
    saved_at: string
    retry_count: number
    last_error: string | null
  }>
  const insert = handle.prepare(
    `INSERT INTO pending_sales (localId, payload, createdAt, syncedAt, lastError, retryCount)
     VALUES (?, ?, ?, NULL, ?, ?)`,
  )
  for (const row of rows) {
    const createdAt = Date.parse(row.saved_at) || Date.now()
    insert.run(row.id, row.payload, createdAt, row.last_error, row.retry_count)
  }
}

function getDb(): Database.Database | null {
  if (db) {
    return db
  }
  const driver = loadDriver()
  if (!driver) {
    return null
  }
  const dbPath = path.join(app.getPath('userData'), 'offline-queue.db')
  db = new driver(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_sales (
      localId TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      syncedAt INTEGER,
      lastError TEXT,
      retryCount INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_pending_sales_sync ON pending_sales(syncedAt, retryCount);
  `)
  migrateLegacyTable(db)
  return db
}

export function queueSale(payload: unknown): QueueSaleResult {
  const handle = getDb()
  if (!handle) {
    throw new Error('Offline queue unavailable (better-sqlite3 not loaded)')
  }
  const localId = randomUUID()
  const createdAt = Date.now()
  handle
    .prepare(
      `INSERT INTO pending_sales (localId, payload, createdAt, syncedAt, lastError, retryCount)
       VALUES (?, ?, ?, NULL, NULL, 0)`,
    )
    .run(localId, JSON.stringify(payload ?? null), createdAt)
  return { localId, status: 'queued' }
}

/** @deprecated Use {@link queueSale} — returns localId only for legacy IPC. */
export function queueTransaction(payload: unknown): string {
  return queueSale(payload).localId
}

export function getQueueStatus(): QueueStatus {
  const handle = getDb()
  if (!handle) {
    return { pendingCount: 0, failedCount: 0, items: [] }
  }
  const pendingRow = handle
    .prepare(
      `SELECT COUNT(*) AS count FROM pending_sales
       WHERE syncedAt IS NULL AND retryCount < ?`,
    )
    .get(MAX_RETRIES) as { count: number }
  const failedRow = handle
    .prepare(
      `SELECT COUNT(*) AS count FROM pending_sales
       WHERE syncedAt IS NULL AND retryCount >= ?`,
    )
    .get(MAX_RETRIES) as { count: number }
  const items = handle
    .prepare(
      `SELECT localId, createdAt, retryCount, lastError FROM pending_sales
       WHERE syncedAt IS NULL
       ORDER BY createdAt ASC`,
    )
    .all() as QueueStatusItem[]
  return {
    pendingCount: pendingRow.count,
    failedCount: failedRow.count,
    items,
  }
}

/** @deprecated Use {@link getQueueStatus}. */
export function getPendingCount(): number {
  return getQueueStatus().pendingCount
}

export async function syncQueue(
  apiBaseUrl: string,
  token: string,
  tenantId: string,
): Promise<SyncQueueResult> {
  const handle = getDb()
  if (!handle) {
    return { synced: 0, failed: 0, errors: [] }
  }

  const pending = handle
    .prepare(
      `SELECT localId, payload, retryCount FROM pending_sales
       WHERE syncedAt IS NULL AND retryCount < ?
       ORDER BY createdAt ASC`,
    )
    .all(MAX_RETRIES) as Array<Pick<PendingSaleRow, 'localId' | 'payload' | 'retryCount'>>

  const markSynced = handle.prepare(`UPDATE pending_sales SET syncedAt = ? WHERE localId = ?`)
  const markFailed = handle.prepare(
    `UPDATE pending_sales SET retryCount = retryCount + 1, lastError = ? WHERE localId = ?`,
  )

  const base = apiBaseUrl.replace(/\/$/, '')
  const url = `${base}/api/v1/pos/checkout`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (const row of pending) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Idempotency-Key': row.localId,
        },
        body: row.payload,
      })
      if (res.ok) {
        markSynced.run(Date.now(), row.localId)
        synced += 1
      } else {
        const body = await res.text().catch(() => '')
        const message = `HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`
        markFailed.run(message, row.localId)
        failed += 1
        errors.push(`${row.localId.slice(0, 8)}: ${message}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      markFailed.run(message, row.localId)
      failed += 1
      errors.push(`${row.localId.slice(0, 8)}: ${message}`)
    }
  }

  return { synced, failed, errors }
}

/** @deprecated Use {@link syncQueue}. */
export async function syncPending(
  apiBaseUrl: string,
  token: string,
  tenantId: string,
): Promise<{ synced: number; failed: number }> {
  const result = await syncQueue(apiBaseUrl, token, tenantId)
  return { synced: result.synced, failed: result.failed }
}

export function clearFailed(): { deleted: number } {
  const handle = getDb()
  if (!handle) {
    return { deleted: 0 }
  }
  const result = handle
    .prepare(`DELETE FROM pending_sales WHERE syncedAt IS NULL AND retryCount >= ?`)
    .run(MAX_RETRIES)
  return { deleted: result.changes }
}

export function resetFailedRetries(): { reset: number } {
  const handle = getDb()
  if (!handle) {
    return { reset: 0 }
  }
  const result = handle
    .prepare(
      `UPDATE pending_sales SET retryCount = 0, lastError = NULL
       WHERE syncedAt IS NULL AND retryCount >= ?`,
    )
    .run(MAX_RETRIES)
  return { reset: result.changes }
}

export function closeOfflineQueue(): void {
  try {
    db?.close()
  } catch {
    /* ignore */
  }
  db = null
}
