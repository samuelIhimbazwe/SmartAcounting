import Fuse from 'fuse.js';

describe('catalog fuse search', () => {
  const hits = Array.from({length: 100}, (_, i) => ({
    productId: `p${i}`,
    name: `Product ${i}`,
    sku: `SKU-${i}`,
    barcode: `BC${i}`,
  }));

  it('returns matches under 300ms for 100-item index', () => {
    const fuse = new Fuse(hits, {
      keys: ['name', 'sku', 'barcode'],
      threshold: 0.35,
    });
    const start = Date.now();
    const results = fuse.search('Product 42', {limit: 20});
    const elapsed = Date.now() - start;
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(300);
  });
});
