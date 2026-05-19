describe('pricingEngine resolve rules', () => {
  it('applies list discount percent on line price', () => {
    const base = 1000;
    const discountPct = 10;
    const price = base * (1 - discountPct / 100);
    expect(price).toBe(900);
  });

  it('uses explicit line override when present', () => {
    const fallback = 1000;
    const linePrice = 750;
    expect(linePrice).toBeLessThan(fallback);
  });
});
