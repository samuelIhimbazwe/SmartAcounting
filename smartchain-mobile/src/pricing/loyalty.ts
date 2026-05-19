export const POINTS_PER_100_FRW = 1;
export const REDEEM_POINTS_BLOCK = 100;
export const REDEEM_VALUE_FRW = 500;

export function pointsEarnedForTotal(totalFrw: number): number {
  if (totalFrw <= 0) {
    return 0;
  }
  return Math.floor(totalFrw / 100) * POINTS_PER_100_FRW;
}

export function discountFromRedeemPoints(points: number): number {
  if (points <= 0) {
    return 0;
  }
  const blocks = Math.floor(points / REDEEM_POINTS_BLOCK);
  return blocks * REDEEM_VALUE_FRW;
}

export function maxRedeemablePoints(balance: number, requested: number): number {
  const balanceBlocks =
    Math.floor(balance / REDEEM_POINTS_BLOCK) * REDEEM_POINTS_BLOCK;
  const requestedBlocks =
    Math.floor(requested / REDEEM_POINTS_BLOCK) * REDEEM_POINTS_BLOCK;
  return Math.min(balanceBlocks, Math.max(0, requestedBlocks));
}
