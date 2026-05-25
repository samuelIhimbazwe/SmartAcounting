import CryptoJS from 'crypto-js'

export const GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000'

export interface AuditEntryInput {
  entityType: string
  entityId: string
  action: string
  actorId: string
  timestamp: string
  previousHash: string
}

export interface AuditEntry extends AuditEntryInput {
  hash: string
}

export function computeAuditHash(entry: AuditEntryInput): string {
  const payload = [entry.previousHash, entry.entityId, entry.action, entry.timestamp].join('|')
  return CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex)
}

export function appendAuditEntry(
  previousHash: string,
  input: Omit<AuditEntryInput, 'previousHash'>,
): AuditEntry {
  const base: AuditEntryInput = { ...input, previousHash }
  const hash = computeAuditHash(base)
  return { ...base, hash }
}

export function verifyAuditChain(entries: AuditEntry[]): boolean {
  let expectedPrev = GENESIS_HASH
  for (const e of entries) {
    if (e.previousHash !== expectedPrev) {
      return false
    }
    if (computeAuditHash(e) !== e.hash) {
      return false
    }
    expectedPrev = e.hash
  }
  return true
}
