import {v4 as uuidv4} from 'uuid';
import {database} from '../db';
import {
  OfflineTransaction,
  type OfflineOperationType,
} from '../db/models/OfflineTransaction';
import {postSyncFlush, postSyncQueue} from '../api/sync';
import {apiClient, apiCall, isApiError} from '../api/client';
import {closeTillSession} from '../api/tillSessions';
import {postTillClose} from '../api/retail';
import {createGrnForPo, confirmGrn} from '../api/procurement';
import {syncPoCreateToServer} from '../inventory/poSync';
import {Supplier} from '../db/models/Supplier';
import {receiveStock} from '../api/inventory';
import {getDeviceId} from '../utils/deviceId';
import type {AppRole} from '../utils/roles';
import {postGrnLocally} from '../inventory/inventoryRepository';
import type {POLineRequest} from '../utils/procurementPayload';

const MAX_RETRIES = 5;

let lastSyncError: string | null = null;

export function getLastSyncError(): string | null {
  return lastSyncError;
}

export function clearLastSyncError(): void {
  lastSyncError = null;
}

async function enqueue(
  operationType: OfflineOperationType,
  payload: Record<string, unknown>,
): Promise<void> {
  const idempotencyKey = uuidv4();
  await database.write(async () => {
    await database.get<OfflineTransaction>('offline_transactions').create(rec => {
      rec.operationType = operationType;
      rec.payloadJson = JSON.stringify(payload);
      rec.idempotencyKey = idempotencyKey;
      rec.savedAt = new Date().toISOString();
      rec.synced = false;
      rec.retryCount = 0;
      rec.lastError = undefined;
    });
  });
}

export type PosCheckoutPayload = Record<string, unknown>;

export async function queueOfflineCheckout(
  checkoutPayload: PosCheckoutPayload,
): Promise<void> {
  await enqueue('POS_CHECKOUT', checkoutPayload);
}

export async function queueOfflineReturn(
  returnPayload: Record<string, unknown>,
): Promise<void> {
  await enqueue('POS_RETURN', returnPayload);
}

export async function queueOfflineStockCount(
  stockCountPayload: Record<string, unknown>,
): Promise<void> {
  await enqueue('STOCK_COUNT', stockCountPayload);
}

export async function queueOfflineTillClose(
  payload: Record<string, unknown>,
): Promise<void> {
  await enqueue('TILL_CLOSE', payload);
}

export async function queueOfflinePoCreate(
  payload: Record<string, unknown>,
): Promise<void> {
  await enqueue('PO_CREATE', payload);
}

export async function queueOfflineGrnPost(
  payload: Record<string, unknown>,
): Promise<void> {
  await enqueue('GRN_POST', payload);
}

export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  const all = await database
    .get<OfflineTransaction>('offline_transactions')
    .query()
    .fetch();
  return all
    .filter(t => !t.synced && t.retryCount < MAX_RETRIES)
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

function buildSyncOperation(record: OfflineTransaction) {
  const payload = JSON.parse(record.payloadJson) as Record<string, unknown>;
  return {
    deviceId: getDeviceId(),
    idempotencyKey: record.idempotencyKey,
    operationType:
      record.operationType === 'POS_CHECKOUT' ? 'POS_SALE' : record.operationType,
    entityType: record.operationType,
    payload,
    lamportClock: Date.now(),
    conflictPolicy: 'LAST_WRITE_WINS',
  };
}

async function processRecord(record: OfflineTransaction): Promise<void> {
  const payload = JSON.parse(record.payloadJson) as Record<string, unknown>;
  const headers = {'X-Idempotency-Key': record.idempotencyKey};

  switch (record.operationType) {
    case 'POS_CHECKOUT':
      await postSyncQueue([buildSyncOperation(record)]);
      return;
    case 'POS_RETURN':
      await apiCall('/pos/returns', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers,
      });
      return;
    case 'STOCK_COUNT': {
      const adjustments = (payload.adjustments as Array<Record<string, unknown>>) ?? [];
      for (const adj of adjustments) {
        if (Number(adj.variance) > 0) {
          await apiCall('/inventory/receive', {
            method: 'POST',
            body: JSON.stringify(adj.receiveBody),
            headers,
          });
        } else {
          await apiCall('/inventory/shrinkage', {
            method: 'POST',
            body: JSON.stringify(adj.shrinkageBody),
            headers,
          });
        }
      }
      return;
    }
    case 'TILL_CLOSE': {
      const sessionId = String(payload.sessionId);
      await apiCall(`/pos/till-sessions/${sessionId}/close`, {
        method: 'PATCH',
        body: JSON.stringify({
          closingCash: payload.closingCash,
          notes: payload.notes,
        }),
        headers,
      });
      if (payload.retailBody) {
        await apiCall('/retail/till/close', {
          method: 'POST',
          body: JSON.stringify(payload.retailBody),
          headers,
        });
      }
      return;
    }
    case 'PO_CREATE': {
      const localPoId = String(payload.localPoId);
      const supplierLocalId = String(payload.supplierLocalId);
      const supplier = await database
        .get<Supplier>('suppliers')
        .find(supplierLocalId);
      await syncPoCreateToServer({
        supplier,
        lines: payload.lines as POLineRequest[],
        notes: payload.notes as string | undefined,
        localPoId,
        sendAfter: Boolean(payload.sendAfter),
      });
      return;
    }
    case 'GRN_POST': {
      const grnId = String(payload.localGrnId);
      const poServerId = payload.poServerId as string | undefined;
      if (poServerId && payload.grnBody) {
        const created = await createGrnForPo(
          poServerId,
          payload.grnBody as Parameters<typeof createGrnForPo>[1],
        );
        const serverGrnId = String(
          (created as {id?: string}).id ?? (created as {grnId?: string}).grnId,
        );
        if (serverGrnId) {
          await confirmGrn(serverGrnId);
        }
      } else if (payload.receiveBodies) {
        for (const body of payload.receiveBodies as Array<
          Parameters<typeof receiveStock>[0]
        >) {
          await receiveStock(body);
        }
      }
      await postGrnLocally(grnId);
      return;
    }
    default:
      throw new Error(`Unknown operation ${record.operationType}`);
  }
}

function canFlushSync(roles: AppRole[]): boolean {
  return roles.includes('CEO') || roles.includes('OPS_MANAGER');
}

export async function syncPendingTransactions(
  roles: AppRole[],
): Promise<{synced: number; failed: number}> {
  const unsynced = await getPendingTransactions();
  let synced = 0;
  let failed = 0;
  lastSyncError = null;

  for (const record of unsynced) {
    try {
      await processRecord(record);
      await database.write(async () => {
        await record.update(r => {
          r.synced = true;
          r.lastError = undefined;
        });
      });
      synced += 1;
    } catch (e: unknown) {
      const message = isApiError(e)
        ? String((e.body as {message?: string})?.message ?? e.message)
        : e instanceof Error
          ? e.message
          : 'Sync failed';
      lastSyncError = message;
      await database.write(async () => {
        await record.update(r => {
          r.retryCount += 1;
          r.lastError = message;
        });
      });
      failed += 1;
    }
  }

  if (synced > 0 && canFlushSync(roles)) {
    try {
      await postSyncFlush();
    } catch {
      /* optional */
    }
  }

  return {synced, failed};
}
