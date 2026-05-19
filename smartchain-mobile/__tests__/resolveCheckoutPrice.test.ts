jest.mock('../src/pricing/pricingEngine', () => ({
  resolveUnitPrice: jest.fn(
    async (input: {priceListId?: string | null; fallback: number}) => {
      if (input.priceListId === 'branch') {
        return 900;
      }
      if (input.priceListId === 'customer') {
        return 850;
      }
      if (input.priceListId === 'global') {
        return 800;
      }
      return input.fallback;
    },
  ),
}));

import {resolveCheckoutUnitPrice} from '../src/pricing/resolveCheckoutPrice';

describe('resolveCheckoutUnitPrice order', () => {
  it('applies branch then customer then global', async () => {
    const price = await resolveCheckoutUnitPrice({
      locationId: 'loc-1',
      branchPriceListId: 'branch',
      customerPriceListId: 'customer',
      globalPriceListId: 'global',
      productId: 'p1',
      fallback: 1000,
    });
    expect(price).toBe(800);
  });

  it('uses fallback when no lists', async () => {
    const price = await resolveCheckoutUnitPrice({
      fallback: 1200,
      productId: 'p1',
    });
    expect(price).toBe(1200);
  });
});
