import {v4 as uuidv4} from 'uuid';
import {database} from '../db';
import {OfflineTransaction} from '../db/models/OfflineTransaction';
import {postSyncFlush, postSyncQueue} from '../api/sync';
import {getDeviceId} from '../utils/deviceId';
import type {AppRole} from '../utils/roles';

/**
 * Mobile offline queue.
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
 * The idempotency key lives in the *body*, not in an HTTP header — the
 * backend's `SyncService` reads it from the DTO. A globally unique UUID
 * generated with `uuid` (backed by `react-native-get-random-values`) gives
 * us replay-safety on retry.
 *
 * Records are retried up to 5 times; `retryCount` is incremented on each
 * failure. Beyond that they remain in WatermelonDB for operator inspection.
 */

const MAX_RETRIES = 5;

/** POS checkout JSON matching backend PosCheckoutRequest (camelCase). */
export type PosCheckoutPayload = Record<string, unknown>;

export async function queueOfflineCheckout(
  checkoutPayload: PosCheckoutPayload,
): Promise<void> {
  const idempotencyKey = uuidv4();
  await database.write(async () => {
    await database.get<OfflineTransaction>('offline_transactions').create(rec => {
      rec.payloadJson = JSON.stringify(checkoutPayload);
      rec.idempotencyKey = idempotencyKey;
      rec.savedAt = new Date().toISOString();
      rec.synced = false;
      rec.retryCount = 0;
    });
  });
}

/** All pending (unsynced) records still under the retry cap. */
export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  const all = await database
    .get<OfflineTransaction>('offline_transactions')
    .query()
    .fetch();
  return all.filter(t => !t.synced && t.retryCount < MAX_RETRIES);
}

function buildSyncOperation(record: OfflineTransaction) {
  const checkoutPayload = JSON.parse(record.payloadJson) as PosCheckoutPayload;
  return {
    deviceId: getDeviceId(),
    idempotencyKey: record.idempotencyKey,
    operationType: 'POS_SALE',
    entityType: 'POS_CHECKOUT',
    payload: checkoutPayload,
    lamportClock: Date.now(),
    conflictPolicy: 'LAST_WRITE_WINS',
  };
}

function canFlushSync(roles: AppRole[]): boolean {
  return roles.includes('CEO') || roles.includes('OPS_MANAGER');
}

/**
 * Drain pending transactions to the backend.
 *
 * - On success, the record is marked `synced = true`.
 * - On failure (network or server), `retryCount` is incremented; once a
 *   record hits `MAX_RETRIES` it stays put for manual review.
 * - After any successful pushes, `/sync/flush` is fired (it is role-gated to
 *   CEO/OPS_MANAGER so cashiers skip it).
 */
export async function syncPendingTransactions(
  roles: AppRole[],
): Promise<{synced: number; failed: number}> {
  const unsynced = await getPendingTransactions();

  let synced = 0;
  let failed = 0;

  for (const record of unsynced) {
    try {
      const op = buildSyncOperation(record);
      await postSyncQueue([op]);
      await database.write(async () => {
        await record.update(r => {
          r.synced = true;
        });
      });
      synced += 1;
    } catch {
      await database.write(async () => {
        await record.update(r => {
          r.retryCount += 1;
        });
      });
      failed += 1;
    }
  }

  if (synced > 0 && canFlushSync(roles)) {
    try {
      await postSyncFlush();
    } catch {
      /* flush requires CEO/OPS — ignore 403 for cashiers, transient otherwise */
    }
  }

  return {synced, failed};
}
