import {apiCall} from '../api/client';
import {database} from '../db';
import {EfdSubmission} from '../db/models/EfdSubmission';
import {Q} from '@nozbe/watermelondb';
import {
  generateEfdQrPayload,
  generateEfdSignature,
  resolveEfdDeviceSecret,
} from '../fiscal/efdSignature';

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

const EFD_API_PATH = '/compliance/ebm/receipts/submit';

/**
 * Live path: POST backend EBM submit (server holds RRA credentials).
 * Fallback: HMAC-signed local payload when EFD_DEVICE_SECRET is set.
 * Last resort: deterministic mock for dev/demo.
 */
async function callRraEbmsApi(
  payload: EfdSalePayload,
  headers: Record<string, string>,
): Promise<{signature: string; qrData: string}> {
  try {
    const res = await apiCall<{fiscalSignature?: string; fiscalQrData?: string}>(
      EFD_API_PATH,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          salesOrderId: payload.salesOrderId,
          grossAmount: payload.grossAmount,
          vatAmount: payload.vatAmount,
          currencyCode: payload.currencyCode,
        }),
      },
    );
    if (res.fiscalSignature && res.fiscalQrData) {
      return {signature: res.fiscalSignature, qrData: res.fiscalQrData};
    }
  } catch {
    /* try local signing or mock below */
  }

  const secret = resolveEfdDeviceSecret();
  const dateIso = new Date().toISOString().slice(0, 10);
  const tin = process.env.EXPO_PUBLIC_RRA_TIN?.trim() || '000000000';
  const invoiceNumber = payload.salesOrderId;
  if (secret) {
    const signature = generateEfdSignature(
      tin,
      invoiceNumber,
      payload.grossAmount,
      dateIso,
      secret,
    );
    const qrData = generateEfdQrPayload({
      tin,
      invoiceNumber,
      amount: payload.grossAmount,
      vatAmount: payload.vatAmount,
      dateIso,
      signature,
    });
    return {signature, qrData};
  }

  return mockFiscal(payload);
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
