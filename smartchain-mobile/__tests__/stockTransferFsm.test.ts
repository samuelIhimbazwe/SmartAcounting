type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  if (from === 'DRAFT' && to === 'IN_TRANSIT') {
    return true;
  }
  if (from === 'IN_TRANSIT' && (to === 'RECEIVED' || to === 'CANCELLED')) {
    return true;
  }
  return false;
}

describe('stock transfer state machine', () => {
  it('allows submit from draft to in transit', () => {
    expect(canTransition('DRAFT', 'IN_TRANSIT')).toBe(true);
  });

  it('allows receive from in transit', () => {
    expect(canTransition('IN_TRANSIT', 'RECEIVED')).toBe(true);
  });

  it('rejects receive from draft', () => {
    expect(canTransition('DRAFT', 'RECEIVED')).toBe(false);
  });

  it('allows cancel from in transit', () => {
    expect(canTransition('IN_TRANSIT', 'CANCELLED')).toBe(true);
  });
});
