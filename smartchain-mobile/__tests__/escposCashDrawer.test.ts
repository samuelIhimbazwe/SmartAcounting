import {
  CASH_DRAWER_KICK,
  cashDrawerKickBytes,
  bytesToBinaryString,
} from '../src/hardware/escpos';

describe('ESC/POS cash drawer', () => {
  it('uses standard kick byte sequence', () => {
    expect(cashDrawerKickBytes()).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    expect(CASH_DRAWER_KICK).toBe(bytesToBinaryString(cashDrawerKickBytes()));
    expect(CASH_DRAWER_KICK.charCodeAt(0)).toBe(0x1b);
    expect(CASH_DRAWER_KICK.charCodeAt(1)).toBe(0x70);
    expect(CASH_DRAWER_KICK.charCodeAt(2)).toBe(0x00);
    expect(CASH_DRAWER_KICK.charCodeAt(3)).toBe(0x19);
    expect(CASH_DRAWER_KICK.charCodeAt(4)).toBe(0xfa);
  });
});
