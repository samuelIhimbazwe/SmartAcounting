import {
  discountFromRedeemPoints,
  maxRedeemablePoints,
  pointsEarnedForTotal,
} from '../src/pricing/loyalty';

describe('loyalty', () => {
  it('earns 1 point per 100 FRW', () => {
    expect(pointsEarnedForTotal(250)).toBe(2);
    expect(pointsEarnedForTotal(99)).toBe(0);
  });

  it('redeems 100 points for 500 FRW', () => {
    expect(discountFromRedeemPoints(100)).toBe(500);
    expect(discountFromRedeemPoints(250)).toBe(1000);
    expect(discountFromRedeemPoints(50)).toBe(0);
  });

  it('caps redeemable points to balance in blocks of 100', () => {
    expect(maxRedeemablePoints(350, 500)).toBe(300);
    expect(maxRedeemablePoints(80, 500)).toBe(0);
  });
});
