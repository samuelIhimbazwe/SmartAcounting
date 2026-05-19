import {createPurchaseOrder, sendPurchaseOrder} from '../api/procurement';
import {database} from '../db';
import {PurchaseOrder} from '../db/models/PurchaseOrder';
import type {Supplier} from '../db/models/Supplier';
import {
  assertCreatePOPayloadShape,
  buildCreatePOPayload,
  supplierModelToInline,
  type POLineRequest,
} from '../utils/procurementPayload';
import {parseCreatePOResponse, writePOCreateResponse} from '../utils/procurementSync';
import {updatePoStatus} from './inventoryRepository';

export async function syncPoCreateToServer(input: {
  supplier: Supplier;
  lines: POLineRequest[];
  notes?: string;
  localPoId: string;
  sendAfter?: boolean;
}): Promise<void> {
  const body = buildCreatePOPayload({
    supplier: supplierModelToInline(input.supplier),
    supplierLocalId: input.supplier.id,
    notes: input.notes,
    lines: input.lines,
  });
  assertCreatePOPayloadShape(body);

  const raw = await createPurchaseOrder(body);
  const response = parseCreatePOResponse(raw);

  const po = await database.get<PurchaseOrder>('purchase_orders').find(input.localPoId);

  await writePOCreateResponse({
    po,
    supplier: input.supplier,
    response,
    databaseWrite: fn => database.write(fn),
  });

  if (response.id) {
    const status = input.sendAfter ? 'SENT' : 'DRAFT';
    if (input.sendAfter) {
      await sendPurchaseOrder(response.id);
    }
    await updatePoStatus(input.localPoId, status, response.id);
  }
}
