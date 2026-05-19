import {createPurchaseOrder} from '../procurement';
import {
  assertCreatePOPayloadShape,
  buildCreatePOPayload,
  CREATE_PO_PAYLOAD_KEYS,
} from '../../utils/procurementPayload';
import {parseCreatePOResponse, writePOCreateResponse} from '../../utils/procurementSync';

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const {apiClient} = jest.requireMock('../client') as {
  apiClient: {post: jest.Mock};
};

describe('POST /procurement/purchase-orders payload contract', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
  });

  it('includes inline supplier and supplier_local_id', () => {
    const payload = buildCreatePOPayload({
      supplier: {
        name: 'Kigali Wholesalers',
        phone: '+250788000000',
        tin_number: 'TIN-99',
      },
      supplierLocalId: 'local-abc-123',
      notes: 'test order',
      lines: [
        {
          productId: 'p1',
          orderedQty: 10,
          uomId: 'u1',
          unitCost: 5000,
        },
      ],
    });

    expect(payload.supplier.name).toBe('Kigali Wholesalers');
    expect(payload.supplier_local_id).toBe('local-abc-123');
    expect(payload).not.toHaveProperty('supplierId');
    expect(payload).not.toHaveProperty('supplierName');
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]).toEqual({
      productId: 'p1',
      orderedQty: 10,
      uomId: 'u1',
      unitCost: 5000,
    });

    assertCreatePOPayloadShape(payload);
    const keys = Object.keys(payload).sort();
    expect(keys.every(k => CREATE_PO_PAYLOAD_KEYS.includes(k as never))).toBe(true);
  });

  it('normalises supplier name whitespace', () => {
    const payload = buildCreatePOPayload({
      supplier: {
        name: '  Kigali  Wholesalers  ',
        phone: '+250788000000',
        tin_number: 'TIN-99',
      },
      supplierLocalId: 'local-abc-123',
      lines: [],
    });
    expect(payload.supplier.name).toBe('Kigali Wholesalers');
  });

  it('posts exact payload shape to /procurement/purchase-orders', async () => {
    apiClient.post.mockResolvedValue({
      data: {id: 'srv-po-001', supplierId: 'srv-sup-001', status: 'DRAFT'},
    });

    const payload = buildCreatePOPayload({
      supplier: {
        name: 'Kigali Wholesalers',
        phone: '+250788000000',
        tin_number: 'TIN-99',
      },
      supplierLocalId: 'local-abc-123',
      lines: [{productId: 'p1', orderedQty: 10, uomId: 'u1', unitCost: 5000}],
    });

    const res = await createPurchaseOrder(payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/procurement/purchase-orders',
      payload,
    );
    const parsed = parseCreatePOResponse(res);
    expect(parsed.id).toBe('srv-po-001');
    expect(parsed.supplierId).toBe('srv-sup-001');
  });

  it('writes both serverIds after successful create', async () => {
    const mockPO = {serverId: null as string | null, update: jest.fn()};
    const mockSupplier = {serverId: null as string | null, update: jest.fn()};
    mockPO.update.mockImplementation(async (fn: (r: {serverId: string | null}) => void) => {
      fn(mockPO);
    });
    mockSupplier.update.mockImplementation(
      async (fn: (r: {serverId: string | null}) => void) => {
        fn(mockSupplier);
      },
    );

    const response = {id: 'srv-po-001', supplierId: 'srv-sup-001', status: 'DRAFT'};
    const batchFn = jest.fn(async (fn: () => Promise<void>) => fn());

    await writePOCreateResponse({
      po: mockPO,
      supplier: mockSupplier,
      response,
      databaseWrite: batchFn,
    });

    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(mockPO.update).toHaveBeenCalled();
    expect(mockSupplier.update).toHaveBeenCalled();
    expect(mockPO.serverId).toBe('srv-po-001');
    expect(mockSupplier.serverId).toBe('srv-sup-001');
  });

  it('does not crash if response has no supplierId', async () => {
    const mockPO = {serverId: null as string | null, update: jest.fn()};
    const mockSupplier = {serverId: null as string | null, update: jest.fn()};
    mockPO.update.mockImplementation(async (fn: (r: {serverId: string | null}) => void) => {
      fn(mockPO);
    });

    const response = {id: 'srv-po-001', status: 'DRAFT'};

    await expect(
      writePOCreateResponse({
        po: mockPO,
        supplier: mockSupplier,
        response,
        databaseWrite: async fn => fn(),
      }),
    ).resolves.not.toThrow();

    expect(mockPO.update).toHaveBeenCalled();
    expect(mockSupplier.update).not.toHaveBeenCalled();
    expect(mockSupplier.serverId).toBeNull();
  });
});
