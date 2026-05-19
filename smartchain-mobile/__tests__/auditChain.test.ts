import {
  appendAuditEntry,
  computeAuditHash,
  GENESIS_HASH,
  verifyAuditChain,
} from '../src/fiscal/auditChain';

describe('auditChain', () => {
  it('chains hashes from genesis', () => {
    const e1 = appendAuditEntry(GENESIS_HASH, {
      entityType: 'SALE',
      entityId: 'order-1',
      action: 'POS_CHECKOUT',
      actorId: 'cashier-1',
      timestamp: '2026-05-19T10:00:00.000Z',
    });
    const e2 = appendAuditEntry(e1.hash, {
      entityType: 'TILL',
      entityId: 'session-1',
      action: 'TILL_CLOSE',
      actorId: 'cashier-1',
      timestamp: '2026-05-19T18:00:00.000Z',
    });
    expect(verifyAuditChain([e1, e2])).toBe(true);
    expect(
      computeAuditHash({
        ...e1,
        hash: 'tampered',
      }),
    ).not.toBe('tampered');
  });

  it('rejects broken chain', () => {
    const e1 = appendAuditEntry(GENESIS_HASH, {
      entityType: 'SALE',
      entityId: 'a',
      action: 'POS_CHECKOUT',
      actorId: 'u',
      timestamp: 't1',
    });
    const e2 = appendAuditEntry(GENESIS_HASH, {
      entityType: 'SALE',
      entityId: 'b',
      action: 'POS_CHECKOUT',
      actorId: 'u',
      timestamp: 't2',
    });
    expect(verifyAuditChain([e1, e2])).toBe(false);
  });

  it('hash chain stays valid across mixed event types', () => {
    let previousHash = GENESIS_HASH;
    const buildEntry = (
      entityType: string,
      entityId: string,
      action: string,
      timestamp: string,
    ) => {
      const entry = appendAuditEntry(previousHash, {
        entityType,
        entityId,
        action,
        actorId: 'manager-1',
        timestamp,
      });
      previousHash = entry.hash;
      return entry;
    };

    const entries = [
      buildEntry('SALE', 'sale-1', 'POS_CHECKOUT', '2026-05-19T10:00:00.000Z'),
      buildEntry(
        'TILL',
        'drawer-1',
        'CASH_DRAWER_OPEN',
        '2026-05-19T10:05:00.000Z',
      ),
      buildEntry('SALE', 'sale-2', 'POS_CHECKOUT', '2026-05-19T10:10:00.000Z'),
    ];
    expect(verifyAuditChain(entries)).toBe(true);
  });
});
