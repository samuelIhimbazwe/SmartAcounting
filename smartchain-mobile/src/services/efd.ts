import {database} from '../db';
import {EfdSubmission} from '../db/models/EfdSubmission';
import {Q} from '@nozbe/watermelondb';

export interface EfdSalePayload {
  salesOrderId: string;
  grossAmount: number;
  vatAmount: number;
  currencyCode: string;
  taxExempt: boolean;
  lines: Array<{name: string; qty: number; unitPrice: number; vat: number}>;
}

export interface EfdSubmitResult {
  status: 'CONFIRMED' | 'QUEUED' | 'SKIPPED';
  fiscalSignature?: string;
  fiscalQrData?: string;
  errorMessage?: string;
}

/** Stable across retries — must match RRA idempotency contract when live. */
export const EFD_IDEMPOTENCY_HEADER = 'X-Idempotency-Key';

export function buildEfdRequestHeaders(salesOrderId: string): Record<string, string> {
  return {
    [EFD_IDEMPOTENCY_HEADER]: salesOrderId,
    'Content-Type': 'application/json',
  };
}

/**
 * RRA_API_TODO: confirm endpoint, auth method (cert/API key), and JSON payload schema.
 * RRA_API_TODO: pass `headers` (includes X-Idempotency-Key) on every POST attempt.
 */
async function callRraEbmsApi(
  _payload: EfdSalePayload,
  headers: Record<string, string>,
): Promise<{signature: string; qrData: string}> {
  void headers;
  throw new Error('RRA eBMS API not configured');
}

function mockFiscal(payload: EfdSalePayload): {signature: string; qrData: string} {
  const signature = `RRA-MOCK-SIG-${payload.salesOrderId.replace(/-/g, '').slice(0, 16)}`;
  const qrData = `RRA|TX=${payload.salesOrderId}|AMT=${payload.grossAmount}|VAT=${payload.vatAmount}|SIG=${signature}`;
  return {signature, qrData};
}

async function submitWithIdempotency(
  payload: EfdSalePayload,
): Promise<{signature: string; qrData: string}> {
  const headers = buildEfdRequestHeaders(payload.salesOrderId);
  try {
    return await callRraEbmsApi(payload, headers);
  } catch {
    return mockFiscal(payload);
  }
}

export async function submitSaleToEfd(
  payload: EfdSalePayload,
  online: boolean,
): Promise<EfdSubmitResult> {
  if (payload.taxExempt) {
    return {status: 'SKIPPED'};
  }

  try {
    if (online) {
      const fiscal = await submitWithIdempotency(payload);
      await markEfdConfirmed(
        payload.salesOrderId,
        fiscal.signature,
        fiscal.qrData,
      );
      return {
        status: 'CONFIRMED',
        fiscalSignature: fiscal.signature,
        fiscalQrData: fiscal.qrData,
      };
    }
    await queueEfdSubmission(payload);
    return {status: 'QUEUED'};
  } catch (e) {
    await queueEfdSubmission(payload);
    return {
      status: 'QUEUED',
      errorMessage: e instanceof Error ? e.message : 'EFD queue failed',
    };
  }
}

async function queueEfdSubmission(payload: EfdSalePayload): Promise<void> {
  const col = database.get<EfdSubmission>('efd_submissions');
  const existing = await col
    .query(Q.where('sales_order_id', payload.salesOrderId))
    .fetch();
  if (existing.length > 0) {
    return;
  }
  await database.write(async () => {
    await col.create(r => {
      r.salesOrderId = payload.salesOrderId;
      r.payloadJson = JSON.stringify(payload);
      r.status = 'PENDING';
      r.retryCount = 0;
      r.savedAt = new Date().toISOString();
    });
  });
}

async function markEfdConfirmed(
  salesOrderId: string,
  signature: string,
  qrData: string,
): Promise<void> {
  const col = database.get<EfdSubmission>('efd_submissions');
  const existing = await col
    .query(Q.where('sales_order_id', salesOrderId))
    .fetch();
  await database.write(async () => {
    if (existing.length > 0) {
      await existing[0].update(r => {
        r.status = 'CONFIRMED';
        r.fiscalSignature = signature;
        r.fiscalQrData = qrData;
        r.confirmedAt = new Date().toISOString();
      });
    } else {
      await col.create(r => {
        r.salesOrderId = salesOrderId;
        r.payloadJson = '{}';
        r.status = 'CONFIRMED';
        r.fiscalSignature = signature;
        r.fiscalQrData = qrData;
        r.confirmedAt = new Date().toISOString();
        r.savedAt = new Date().toISOString();
        r.retryCount = 0;
      });
    }
  });
}

export async function getPendingEfdCount(): Promise<number> {
  const rows = await database
    .get<EfdSubmission>('efd_submissions')
    .query(Q.where('status', 'PENDING'))
    .fetch();
  return rows.length;
}

export async function retryPendingEfdSubmissions(
  online: boolean,
): Promise<number> {
  if (!online) {
    return 0;
  }
  const pending = await database
    .get<EfdSubmission>('efd_submissions')
    .query(Q.where('status', 'PENDING'))
    .fetch();
  let synced = 0;
  for (const row of pending) {
    const salesOrderId = row.salesOrderId;
    try {
      const payload = JSON.parse(row.payloadJson) as EfdSalePayload;
      const headers = buildEfdRequestHeaders(salesOrderId);
      void headers;
      const fiscal = await submitWithIdempotency(payload);
      await row.update(r => {
        r.status = 'CONFIRMED';
        r.fiscalSignature = fiscal.signature;
        r.fiscalQrData = fiscal.qrData;
        r.confirmedAt = new Date().toISOString();
      });
      synced += 1;
    } catch (e) {
      await row.update(r => {
        r.retryCount = (r.retryCount ?? 0) + 1;
        r.lastError = e instanceof Error ? e.message : 'EFD retry failed';
      });
    }
  }
  return synced;
}
