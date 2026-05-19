jest.mock('../src/db', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn(),
  },
}));

import {
  buildEfdRequestHeaders,
  EFD_IDEMPOTENCY_HEADER,
} from '../src/services/efd';

describe('efd idempotency', () => {
  it('uses stable sale id as X-Idempotency-Key header', () => {
    const saleId = '22222222-2222-4222-8222-222222222201';
    const headers = buildEfdRequestHeaders(saleId);
    expect(headers[EFD_IDEMPOTENCY_HEADER]).toBe(saleId);
    expect(headers['Content-Type']).toBe('application/json');
  });
});
