import {Q} from '@nozbe/watermelondb';
import {database} from '../db';
import {FiscalAuditLog} from '../db/models/FiscalAuditLog';
import {
  appendAuditEntry,
  GENESIS_HASH,
  type AuditEntry,
  verifyAuditChain,
} from './auditChain';

export async function getLatestAuditHash(): Promise<string> {
  const rows = await database
    .get<FiscalAuditLog>('fiscal_audit_log')
    .query(Q.sortBy('timestamp', Q.desc), Q.take(1))
    .fetch();
  if (rows.length === 0) {
    return GENESIS_HASH;
  }
  return rows[0].hash;
}

export async function recordFiscalAudit(input: {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
}): Promise<AuditEntry> {
  const previousHash = await getLatestAuditHash();
  const entry = appendAuditEntry(previousHash, {
    ...input,
    timestamp: new Date().toISOString(),
  });
  await database.write(async () => {
    await database.get<FiscalAuditLog>('fiscal_audit_log').create(r => {
      r.entityType = entry.entityType;
      r.entityId = entry.entityId;
      r.action = entry.action;
      r.actorId = entry.actorId;
      r.timestamp = entry.timestamp;
      r.previousHash = entry.previousHash;
      r.hash = entry.hash;
    });
  });
  return entry;
}

/** Alias for audit UI — returns all entries matching optional filters. */
export async function getAllAuditEntries(filters?: {
  entityType?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
}): Promise<AuditEntry[]> {
  return listFiscalAuditEntries(filters);
}

export async function listFiscalAuditEntries(filters?: {
  entityType?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
}): Promise<AuditEntry[]> {
  const rows = await database
    .get<FiscalAuditLog>('fiscal_audit_log')
    .query(Q.sortBy('timestamp', Q.asc))
    .fetch();
  let entries: AuditEntry[] = rows.map(r => ({
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    actorId: r.actorId,
    timestamp: r.timestamp,
    previousHash: r.previousHash,
    hash: r.hash,
  }));
  if (filters?.entityType) {
    entries = entries.filter(e => e.entityType === filters.entityType);
  }
  if (filters?.action) {
    entries = entries.filter(e => e.action === filters.action);
  }
  if (filters?.actorId) {
    entries = entries.filter(e => e.actorId === filters.actorId);
  }
  if (filters?.from) {
    entries = entries.filter(e => e.timestamp >= filters.from!);
  }
  if (filters?.to) {
    entries = entries.filter(e => e.timestamp <= filters.to!);
  }
  return entries;
}

export async function exportAuditCsv(): Promise<string> {
  const entries = await listFiscalAuditEntries();
  const header =
    'entity_type,entity_id,action,actor_id,timestamp,previous_hash,hash';
  const lines = entries.map(
    e =>
      `${e.entityType},${e.entityId},${e.action},${e.actorId},${e.timestamp},${e.previousHash},${e.hash}`,
  );
  return [header, ...lines].join('\n');
}

export async function verifyLocalAuditChain(): Promise<boolean> {
  const entries = await listFiscalAuditEntries();
  return verifyAuditChain(entries);
}
