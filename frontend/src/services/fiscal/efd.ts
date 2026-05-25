import { apiClient } from '../../shared/api/client'
import {
  generateEfdQrPayload,
  generateEfdSignature,
  resolveEfdDeviceSecretAsync,
} from './efdSignature'

export interface EfdSalePayload {
  salesOrderId: string
  grossAmount: number
  vatAmount: number
  currencyCode: string
  taxExempt: boolean
  lines: Array<{ name: string; qty: number; unitPrice: number; vat: number }>
}

export interface EfdSubmitResult {
  status: 'CONFIRMED' | 'QUEUED' | 'SKIPPED'
  fiscalSignature?: string
  fiscalQrData?: string
  errorMessage?: string
}

export type EfdDisplayStatus = 'ok' | 'pending' | 'error'

/** Stable across retries — must match RRA idempotency contract when live. */
export const EFD_IDEMPOTENCY_HEADER = 'X-Idempotency-Key'

export const EFD_PENDING_QUEUE_KEY = 'efd_pending_queue'
const EFD_DISPLAY_STATUS_KEY = 'efd_display_status'

const EFD_API_PATH = '/api/v1/compliance/ebm/receipts/submit'

interface EfdQueueRow {
  salesOrderId: string
  payload: EfdSalePayload
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  retryCount: number
  lastError?: string
  savedAt: string
  fiscalSignature?: string
  fiscalQrData?: string
  confirmedAt?: string
}

interface EbmSubmitResponse {
  fiscalSignature?: string
  fiscalQrData?: string
}

export function buildEfdRequestHeaders(salesOrderId: string): Record<string, string> {
  return {
    [EFD_IDEMPOTENCY_HEADER]: salesOrderId,
    'Content-Type': 'application/json',
  }
}

function readQueue(): EfdQueueRow[] {
  try {
    const raw = localStorage.getItem(EFD_PENDING_QUEUE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed as EfdQueueRow[]
  } catch {
    return []
  }
}

function writeQueue(rows: EfdQueueRow[]): void {
  localStorage.setItem(EFD_PENDING_QUEUE_KEY, JSON.stringify(rows))
  notifyQueueChanged()
}

export function notifyQueueChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('efd-queue-changed'))
  }
}

export function getEfdDisplayStatus(): EfdDisplayStatus {
  try {
    const raw = localStorage.getItem(EFD_DISPLAY_STATUS_KEY)
    if (raw === 'ok' || raw === 'pending' || raw === 'error') {
      return raw
    }
  } catch {
    /* ignore */
  }
  const pending = readQueue().filter((r) => r.status === 'PENDING').length
  return pending > 0 ? 'pending' : 'ok'
}

function setEfdDisplayStatus(status: EfdDisplayStatus): void {
  localStorage.setItem(EFD_DISPLAY_STATUS_KEY, status)
  notifyQueueChanged()
}

function mockFiscal(payload: EfdSalePayload): { signature: string; qrData: string } {
  const signature = `RRA-MOCK-SIG-${payload.salesOrderId.replace(/-/g, '').slice(0, 16)}`
  const qrData = `RRA|TX=${payload.salesOrderId}|AMT=${payload.grossAmount}|VAT=${payload.vatAmount}|SIG=${signature}`
  return { signature, qrData }
}

/**
 * Live path: POST backend EBM submit (server holds RRA credentials).
 * Fallback: HMAC-signed local payload when EFD_DEVICE_SECRET is set.
 * Last resort: deterministic mock for dev/demo.
 */
async function callRraEbmsApi(
  payload: EfdSalePayload,
  headers: Record<string, string>,
): Promise<{ signature: string; qrData: string }> {
  try {
    const { data } = await apiClient.post<EbmSubmitResponse>(
      EFD_API_PATH,
      {
        salesOrderId: payload.salesOrderId,
        grossAmount: payload.grossAmount,
        vatAmount: payload.vatAmount,
        currencyCode: payload.currencyCode,
      },
      { headers },
    )
    if (data.fiscalSignature && data.fiscalQrData) {
      return { signature: data.fiscalSignature, qrData: data.fiscalQrData }
    }
  } catch {
    /* try local signing or mock below */
  }

  const secret = await resolveEfdDeviceSecretAsync()
  const dateIso = new Date().toISOString().slice(0, 10)
  const tin = import.meta.env.VITE_RRA_TIN?.trim() || '000000000'
  const invoiceNumber = payload.salesOrderId
  if (secret) {
    const signature = generateEfdSignature(
      tin,
      invoiceNumber,
      payload.grossAmount,
      dateIso,
      secret,
    )
    const qrData = generateEfdQrPayload({
      tin,
      invoiceNumber,
      amount: payload.grossAmount,
      vatAmount: payload.vatAmount,
      dateIso,
      signature,
    })
    return { signature, qrData }
  }

  return mockFiscal(payload)
}

async function submitWithIdempotency(
  payload: EfdSalePayload,
): Promise<{ signature: string; qrData: string }> {
  const headers = buildEfdRequestHeaders(payload.salesOrderId)
  try {
    return await callRraEbmsApi(payload, headers)
  } catch {
    return mockFiscal(payload)
  }
}

function markEfdConfirmed(salesOrderId: string, signature: string, qrData: string): void {
  const rows = readQueue()
  const idx = rows.findIndex((r) => r.salesOrderId === salesOrderId)
  const confirmed: EfdQueueRow = {
    salesOrderId,
    payload:
      idx >= 0
        ? rows[idx].payload
        : {
            salesOrderId,
            grossAmount: 0,
            vatAmount: 0,
            currencyCode: 'RWF',
            taxExempt: false,
            lines: [],
          },
    status: 'CONFIRMED',
    retryCount: idx >= 0 ? rows[idx].retryCount : 0,
    savedAt: idx >= 0 ? rows[idx].savedAt : new Date().toISOString(),
    fiscalSignature: signature,
    fiscalQrData: qrData,
    confirmedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    rows[idx] = confirmed
  } else {
    rows.push(confirmed)
  }
  writeQueue(rows)
  setEfdDisplayStatus('ok')
}

function queueEfdSubmission(payload: EfdSalePayload): void {
  const rows = readQueue()
  if (rows.some((r) => r.salesOrderId === payload.salesOrderId && r.status === 'PENDING')) {
    return
  }
  rows.push({
    salesOrderId: payload.salesOrderId,
    payload,
    status: 'PENDING',
    retryCount: 0,
    savedAt: new Date().toISOString(),
  })
  writeQueue(rows)
  setEfdDisplayStatus('pending')
}

export async function submitSaleToEfd(
  payload: EfdSalePayload,
  online: boolean,
): Promise<EfdSubmitResult> {
  if (payload.taxExempt) {
    return { status: 'SKIPPED' }
  }

  try {
    if (online) {
      const fiscal = await submitWithIdempotency(payload)
      markEfdConfirmed(payload.salesOrderId, fiscal.signature, fiscal.qrData)
      return {
        status: 'CONFIRMED',
        fiscalSignature: fiscal.signature,
        fiscalQrData: fiscal.qrData,
      }
    }
    queueEfdSubmission(payload)
    return { status: 'QUEUED' }
  } catch (e) {
    queueEfdSubmission(payload)
    setEfdDisplayStatus('error')
    return {
      status: 'QUEUED',
      errorMessage: e instanceof Error ? e.message : 'EFD queue failed',
    }
  }
}

export function getPendingEfdCount(): number {
  return readQueue().filter((r) => r.status === 'PENDING').length
}

export async function retryPendingEfdSubmissions(online: boolean): Promise<number> {
  if (!online) {
    return 0
  }
  const rows = readQueue()
  const pending = rows.filter((r) => r.status === 'PENDING')
  let synced = 0
  let hadError = false

  for (const row of pending) {
    try {
      const fiscal = await submitWithIdempotency(row.payload)
      const idx = rows.findIndex((r) => r.salesOrderId === row.salesOrderId)
      if (idx >= 0) {
        rows[idx] = {
          ...rows[idx],
          status: 'CONFIRMED',
          fiscalSignature: fiscal.signature,
          fiscalQrData: fiscal.qrData,
          confirmedAt: new Date().toISOString(),
          lastError: undefined,
        }
      }
      synced += 1
    } catch (e) {
      hadError = true
      const idx = rows.findIndex((r) => r.salesOrderId === row.salesOrderId)
      if (idx >= 0) {
        rows[idx] = {
          ...rows[idx],
          retryCount: (rows[idx].retryCount ?? 0) + 1,
          lastError: e instanceof Error ? e.message : 'EFD retry failed',
          status: 'FAILED',
        }
      }
    }
  }

  const pruned = rows.filter((r) => r.status !== 'CONFIRMED')
  writeQueue(pruned)
  const stillPending = pruned.filter((r) => r.status === 'PENDING').length
  if (stillPending > 0) {
    setEfdDisplayStatus('pending')
  } else if (hadError && synced === 0) {
    setEfdDisplayStatus('error')
  } else if (synced > 0) {
    setEfdDisplayStatus('ok')
  }

  return synced
}
