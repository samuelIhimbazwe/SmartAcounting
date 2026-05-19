export interface InlineSupplierRequest {
  name: string;
  phone: string;
  tin_number: string;
}

export interface POLineRequest {
  productId: string;
  variantId?: string;
  orderedQty: number;
  uomId: string;
  unitCost: number;
}

export interface CreatePOPayload {
  supplier: InlineSupplierRequest;
  supplier_local_id: string;
  notes?: string;
  lines: POLineRequest[];
}

export interface CreatePOResponse {
  id: string;
  supplierId?: string;
  status?: string;
}

export interface BuildCreatePOInput {
  supplier: InlineSupplierRequest;
  supplierLocalId: string;
  notes?: string;
  lines: POLineRequest[];
}

/** Collapse internal whitespace; backend find-or-create is case-sensitive. */
export function normaliseSupplierName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function buildCreatePOPayload(input: BuildCreatePOInput): CreatePOPayload {
  const payload: CreatePOPayload = {
    supplier: {
      name: normaliseSupplierName(input.supplier.name),
      phone: input.supplier.phone,
      tin_number: input.supplier.tin_number,
    },
    supplier_local_id: input.supplierLocalId,
    lines: input.lines,
  };
  if (input.notes?.trim()) {
    payload.notes = input.notes.trim();
  }
  return payload;
}

export function supplierModelToInline(input: {
  name: string;
  phone?: string | null;
  tinNumber?: string | null;
}): InlineSupplierRequest {
  return {
    name: normaliseSupplierName(input.name),
    phone: input.phone?.trim() ?? '',
    tin_number: input.tinNumber?.trim() ?? '',
  };
}

/** Allowed top-level keys on mobile PO create (no legacy supplierId/supplierName). */
export const CREATE_PO_PAYLOAD_KEYS = [
  'supplier',
  'supplier_local_id',
  'notes',
  'lines',
] as const;

export function assertCreatePOPayloadShape(payload: CreatePOPayload): void {
  const keys = Object.keys(payload).sort();
  const allowed = [...CREATE_PO_PAYLOAD_KEYS].filter(
    k => k !== 'notes' || payload.notes != null,
  );
  for (const key of keys) {
    if (!allowed.includes(key as (typeof CREATE_PO_PAYLOAD_KEYS)[number])) {
      throw new Error(`Unexpected PO payload field: ${key}`);
    }
  }
  if (!('supplier' in payload) || !('supplier_local_id' in payload) || !('lines' in payload)) {
    throw new Error('Missing required PO payload fields');
  }
}
