import {Q} from '@nozbe/watermelondb';
import {database} from '../db';
import {FiscalAuditLog} from '../db/models/FiscalAuditLog';

export type SaleHistoryRow = {
  salesOrderId: string;
  timestamp: string;
  actorId: string;
};

const PAGE_SIZE = 20;
const MAX_IN_MEMORY = 50;

export async function fetchSaleHistoryPage(
  cursor?: string,
  limit = PAGE_SIZE,
): Promise<{rows: SaleHistoryRow[]; nextCursor?: string}> {
  const safeLimit = Math.min(limit, MAX_IN_MEMORY);
  const rows = cursor
    ? await database
        .get<FiscalAuditLog>('fiscal_audit_log')
        .query(
          Q.where('action', 'POS_CHECKOUT'),
          Q.where('entity_type', 'SALE'),
          Q.where('timestamp', Q.lt(cursor)),
          Q.sortBy('timestamp', Q.desc),
          Q.take(safeLimit + 1),
        )
        .fetch()
    : await database
        .get<FiscalAuditLog>('fiscal_audit_log')
        .query(
          Q.where('action', 'POS_CHECKOUT'),
          Q.where('entity_type', 'SALE'),
          Q.sortBy('timestamp', Q.desc),
          Q.take(safeLimit + 1),
        )
        .fetch();

  const mapped: SaleHistoryRow[] = rows.slice(0, safeLimit).map(r => ({
    salesOrderId: r.entityId,
    timestamp: r.timestamp,
    actorId: r.actorId,
  }));

  const nextCursor =
    rows.length > safeLimit ? mapped[mapped.length - 1]?.timestamp : undefined;
  return {rows: mapped, nextCursor};
}
