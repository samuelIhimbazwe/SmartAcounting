import {formatDateLocalized, formatFrw} from '../utils/formatting';

describe('formatting', () => {
  it('formatFrw uses FRW prefix for English', () => {
    expect(formatFrw(1500, 'en')).toContain('FRW');
    expect(formatFrw(1500, 'en')).toContain('1,500');
  });

  it('formatFrw uses locale currency for French', () => {
    const out = formatFrw(2000, 'fr');
    expect(out).toMatch(/2[\s\u00a0]?000/);
  });

  it('formatDateLocalized formats ISO strings', () => {
    const out = formatDateLocalized('2026-05-20T12:00:00Z', 'en');
    expect(out).toMatch(/05/);
    expect(out).toMatch(/2026/);
  });
});
