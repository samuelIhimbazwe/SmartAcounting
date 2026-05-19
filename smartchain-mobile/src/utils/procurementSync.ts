import type {CreatePOResponse} from './procurementPayload';

export type ServerIdWritable = {
  update: (
    writer: (record: {serverId?: string | null}) => void,
  ) => Promise<unknown>;
};

export function parseCreatePOResponse(
  raw: Record<string, unknown>,
): CreatePOResponse {
  const id = String(raw.id ?? raw.purchaseOrderId ?? '');
  const supplierRaw = raw.supplierId ?? raw.supplier_id;
  return {
    id,
    supplierId:
      supplierRaw != null && String(supplierRaw).length > 0
        ? String(supplierRaw)
        : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
  };
}

/**
 * After POST /procurement/purchase-orders: persist PO + supplier server ids
 * in a single write batch (both or neither for supplier when supplierId present).
 */
export async function writePOCreateResponse(input: {
  po: ServerIdWritable;
  supplier: ServerIdWritable;
  response: CreatePOResponse;
  databaseWrite: (fn: () => Promise<void>) => Promise<void>;
}): Promise<void> {
  if (!input.response.id) {
    throw new Error('PO create response missing id');
  }

  await input.databaseWrite(async () => {
    await input.po.update(record => {
      record.serverId = input.response.id;
    });
    if (input.response.supplierId) {
      await input.supplier.update(record => {
        record.serverId = input.response.supplierId!;
      });
    }
  });
}
