import {
  DEFAULT_RWANDA_VAT,
  splitLineAmount,
  summarizeCart,
} from '../src/fiscal/vatEngine';

describe('vatEngine', () => {
  it('splits inclusive 18% VAT on 1180 gross', () => {
    const r = splitLineAmount(1180, 'INCLUSIVE', 0.18, false);
    expect(r.net).toBe(1000);
    expect(r.vat).toBe(180);
    expect(r.gross).toBe(1180);
  });

  it('splits exclusive 18% VAT on 1000 net', () => {
    const r = splitLineAmount(1000, 'EXCLUSIVE', 0.18, false);
    expect(r.net).toBe(1000);
    expect(r.vat).toBe(180);
    expect(r.gross).toBe(1180);
  });

  it('returns zero VAT for exempt customer', () => {
    const r = splitLineAmount(1000, 'INCLUSIVE', 0.18, true);
    expect(r.vat).toBe(0);
    expect(r.gross).toBe(1000);
  });

  it('summarizes cart with different line amounts', () => {
    const s = summarizeCart([120, 40], DEFAULT_RWANDA_VAT, false);
    expect(s.subtotalExVat).toBeGreaterThan(0);
    expect(s.totalVat).toBeGreaterThan(0);
    expect(s.totalInclVat).toBe(160);
  });
});
