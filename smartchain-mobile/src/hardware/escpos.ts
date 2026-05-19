/** ESC/POS control bytes shared by receipt, label, and cash-drawer paths. */

export const ESC = '\x1B';
export const GS = '\x1D';

/** Kick cash drawer #1 — standard ESC p m t1 t2 (0x1B 0x70 0x00 0x19 0xFA). */
export const CASH_DRAWER_KICK = '\x1B\x70\x00\x19\xFA';

export function escPosInit(): string {
  return ESC + '@';
}

export function escPosCut(): string {
  return GS + 'V' + '\x41' + '\x03';
}

export function bytesToBinaryString(bytes: number[]): string {
  return bytes.map(b => String.fromCharCode(b)).join('');
}

export function cashDrawerKickBytes(): number[] {
  return [0x1b, 0x70, 0x00, 0x19, 0xfa];
}
