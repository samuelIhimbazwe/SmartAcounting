import {Q} from '@nozbe/watermelondb';
import {database} from '../db';
import {Product} from '../db/models/Product';
import {ProductVariant} from '../db/models/ProductVariant';
import {Supplier} from '../db/models/Supplier';
import {Uom} from '../db/models/Uom';
import {VariantBatch} from '../db/models/VariantBatch';
import {SerialNumber} from '../db/models/SerialNumber';
import {PurchaseOrder, type PoStatus} from '../db/models/PurchaseOrder';
import {PurchaseOrderLine} from '../db/models/PurchaseOrderLine';
import {Grn, type GrnStatus} from '../db/models/Grn';
import {GrnLine} from '../db/models/GrnLine';
import {
  mapBalanceRow,
  stringifyAttributes,
  variantDisplayLabel,
} from './modelHelpers';
import {pickFefoBatch, purchaseQtyToSaleUnits} from './inventoryMath';
import type {BatchRow} from './inventoryMath';

const DEFAULT_LOCATION = 'MAIN';

export async function ensureDefaultUoms(): Promise<void> {
  const existing = await database.get<Uom>('uoms').query().fetch();
  if (existing.length > 0) {
    return;
  }
  await database.write(async () => {
    const uoms = database.get<Uom>('uoms');
    await uoms.create(r => {
      r.name = 'unit';
      r.conversionFactor = 1;
    });
    await uoms.create(r => {
      r.name = 'carton';
      r.conversionFactor = 12;
    });
  });
}

export async function upsertProductFromBalance(
  row: Record<string, unknown>,
): Promise<Product> {
  const b = mapBalanceRow(row);
  const serverId = b.productId;
  const sku = b.sku ?? 'UNKNOWN';
  const name = b.productName ?? b.name ?? sku;

  const products = database.get<Product>('products');
  let product: Product | undefined;
  if (serverId) {
    const found = await products
      .query(Q.where('server_id', serverId))
      .fetch();
    product = found[0];
  }
  if (!product) {
    const bySku = await products.query(Q.where('sku', sku)).fetch();
    product = bySku[0];
  }

  await ensureDefaultUoms();
  const uoms = await database.get<Uom>('uoms').query().fetch();
  const unitUom = uoms.find(u => u.name === 'unit') ?? uoms[0];

  return database.write(async () => {
    if (product) {
      await product.update(p => {
        p.name = name;
        p.sku = sku;
        if (serverId) {
          p.serverId = serverId;
        }
        p.baseUnitPrice = b.unitPrice ?? p.baseUnitPrice;
        p.currencyCode = b.currencyCode ?? p.currencyCode;
        if (b.reorderPoint != null) {
          p.reorderPoint = b.reorderPoint;
        }
      });
    } else {
      product = await products.create(p => {
        p.serverId = serverId;
        p.name = name;
        p.sku = sku;
        p.uomConversionFactor = 1;
        p.reorderPoint = b.reorderPoint ?? 0;
        p.reorderQty = 0;
        p.isSerialTracked = false;
        p.baseUnitPrice = b.unitPrice ?? 0;
        p.currencyCode = b.currencyCode ?? 'FRW';
        p.saleUomId = unitUom.id;
        p.purchaseUomId = unitUom.id;
      });
    }

    const variants = database.get<ProductVariant>('product_variants');
    const existingVariants = await variants
      .query(Q.where('product_id', product!.id))
      .fetch();
    const barcode = b.barcode ?? sku;
    const qty = b.quantityOnHand ?? 0;

    if (existingVariants.length === 0) {
      await variants.create(v => {
        v.productId = product!.id;
        v.sku = sku;
        v.name = 'Default';
        v.attributes = {};
        v.barcode = barcode;
        v.stockQty = qty;
      });
    } else {
      const def = existingVariants[0];
      await def.update(v => {
        v.stockQty = qty;
        if (barcode) {
          v.barcode = barcode;
        }
      });
    }
    return product!;
  });
}

export async function findVariantByBarcode(
  barcode: string,
): Promise<{product: Product; variant: ProductVariant} | null> {
  const trimmed = barcode.trim();
  if (!trimmed) {
    return null;
  }
  const variants = await database
    .get<ProductVariant>('product_variants')
    .query(Q.where('barcode', trimmed))
    .fetch();
  if (variants.length === 0) {
    return null;
  }
  const variant = variants[0];
  const product = await database.get<Product>('products').find(variant.productId);
  return {product, variant};
}

export async function getProductWithVariants(productId: string) {
  const product = await database.get<Product>('products').find(productId);
  const variants = await database
    .get<ProductVariant>('product_variants')
    .query(Q.where('product_id', productId))
    .fetch();
  return {product, variants};
}

export async function createVariant(
  productId: string,
  input: {
    sku: string;
    name: string;
    attributes?: Record<string, string>;
    barcode: string;
    priceOverride?: number;
    stockQty?: number;
  },
): Promise<ProductVariant> {
  return database.write(async () => {
    return database.get<ProductVariant>('product_variants').create(v => {
      v.productId = productId;
      v.sku = input.sku;
      v.name = input.name;
      v.attributes = input.attributes ?? {};
      v.barcode = input.barcode;
      v.priceOverride = input.priceOverride;
      v.stockQty = input.stockQty ?? 0;
    });
  });
}

export async function adjustVariantStock(
  variantId: string,
  delta: number,
): Promise<void> {
  const variant = await database
    .get<ProductVariant>('product_variants')
    .find(variantId);
  await database.write(async () => {
    await variant.update(v => {
      v.stockQty = Math.max(0, v.stockQty + delta);
    });
  });
}

export async function listActiveSuppliers(): Promise<Supplier[]> {
  const all = await database.get<Supplier>('suppliers').query().fetch();
  return all.filter(s => !s.isDeleted);
}

export async function createSupplier(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tinNumber?: string;
  notes?: string;
  serverId?: string;
}): Promise<Supplier> {
  return database.write(async () =>
    database.get<Supplier>('suppliers').create(s => {
      s.name = input.name;
      s.phone = input.phone;
      s.email = input.email;
      s.address = input.address;
      s.tinNumber = input.tinNumber;
      s.notes = input.notes;
      s.serverId = input.serverId;
    }),
  );
}

export async function updateSupplier(
  id: string,
  patch: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    tinNumber: string;
    notes: string;
  }>,
): Promise<void> {
  const supplier = await database.get<Supplier>('suppliers').find(id);
  await database.write(async () => {
    await supplier.update(s => {
      if (patch.name != null) {
        s.name = patch.name;
      }
      if (patch.phone != null) {
        s.phone = patch.phone;
      }
      if (patch.email != null) {
        s.email = patch.email;
      }
      if (patch.address != null) {
        s.address = patch.address;
      }
      if (patch.tinNumber != null) {
        s.tinNumber = patch.tinNumber;
      }
      if (patch.notes != null) {
        s.notes = patch.notes;
      }
    });
  });
}

export async function softDeleteSupplier(id: string): Promise<void> {
  const supplier = await database.get<Supplier>('suppliers').find(id);
  await database.write(async () => {
    await supplier.update(s => {
      s.deletedAt = new Date().toISOString();
    });
  });
}

export async function updateSupplierServerId(
  localSupplierId: string,
  serverId: string,
): Promise<void> {
  const supplier = await database.get<Supplier>('suppliers').find(localSupplierId);
  await database.write(async () => {
    await supplier.update(s => {
      s.serverId = serverId;
    });
  });
}

export async function listProducts(): Promise<Product[]> {
  return database.get<Product>('products').query().fetch();
}

export async function listLowStockProducts(): Promise<
  {product: Product; variant: ProductVariant; totalQty: number}[]
> {
  const products = await listProducts();
  const out: {product: Product; variant: ProductVariant; totalQty: number}[] =
    [];
  for (const product of products) {
    const variants = await database
      .get<ProductVariant>('product_variants')
      .query(Q.where('product_id', product.id))
      .fetch();
    const totalQty = variants.reduce((a: number, v: ProductVariant) => a + v.stockQty, 0);
    if (product.reorderPoint > 0 && totalQty <= product.reorderPoint) {
      const primary = variants[0];
      if (primary) {
        out.push({product, variant: primary, totalQty});
      }
    }
  }
  return out;
}

export async function createDraftPo(input: {
  supplierId: string;
  notes?: string;
  expectedDeliveryDate?: string;
  createdBy?: string;
  lines: {
    productId: string;
    variantId?: string;
    serverProductId?: string;
    orderedQty: number;
    unitCost: number;
    sku: string;
    productName: string;
    uomId?: string;
  }[];
  needsSync?: boolean;
}): Promise<PurchaseOrder> {
  return database.write(async () => {
    const po = await database.get<PurchaseOrder>('purchase_orders').create(p => {
      p.supplierId = input.supplierId;
      p.status = 'DRAFT';
      p.createdAt = new Date().toISOString();
      p.expectedDeliveryDate = input.expectedDeliveryDate;
      p.notes = input.notes;
      p.createdBy = input.createdBy;
      p.needsSync = input.needsSync ?? false;
    });
    const lines = database.get<PurchaseOrderLine>('purchase_order_lines');
    for (const line of input.lines) {
      await lines.create(l => {
        l.poId = po.id;
        l.productId = line.productId;
        l.variantId = line.variantId;
        l.serverProductId = line.serverProductId;
        l.orderedQty = line.orderedQty;
        l.unitCost = line.unitCost;
        l.receivedQty = 0;
        l.sku = line.sku;
        l.productName = line.productName;
        l.uomId = line.uomId;
      });
    }
    return po;
  });
}

export async function updatePoStatus(
  poId: string,
  status: PoStatus,
  serverId?: string,
): Promise<void> {
  const po = await database.get<PurchaseOrder>('purchase_orders').find(poId);
  await database.write(async () => {
    await po.update(p => {
      p.status = status;
      if (serverId) {
        p.serverId = serverId;
      }
      p.needsSync = false;
    });
  });
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  return database
    .get<PurchaseOrder>('purchase_orders')
    .query(Q.sortBy('created_at', Q.desc))
    .fetch();
}

export async function getPoWithLines(poId: string) {
  const po = await database.get<PurchaseOrder>('purchase_orders').find(poId);
  const lines = await database
    .get<PurchaseOrderLine>('purchase_order_lines')
    .query(Q.where('po_id', poId))
    .fetch();
  const supplier = await database.get<Supplier>('suppliers').find(po.supplierId);
  return {po, lines, supplier};
}

export interface ReceiveLineInput {
  productId: string;
  variantId?: string;
  qtyReceived: number;
  unitCost: number;
  expiryDate?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  sku: string;
  productName: string;
  purchaseUomQty?: boolean;
}

export async function createGrn(input: {
  poId?: string;
  supplierId: string;
  receivedBy?: string;
  notes?: string;
  lines: ReceiveLineInput[];
  needsSync?: boolean;
}): Promise<Grn> {
  return database.write(async () => {
    const grn = await database.get<Grn>('grns').create(g => {
      g.poId = input.poId;
      g.supplierId = input.supplierId;
      g.receivedBy = input.receivedBy;
      g.receivedAt = new Date().toISOString();
      g.status = 'PENDING';
      g.notes = input.notes;
      g.needsSync = input.needsSync ?? false;
    });
    for (const line of input.lines) {
      await database.get<GrnLine>('grn_lines').create(l => {
        l.grnId = grn.id;
        l.productId = line.productId;
        l.variantId = line.variantId;
        l.qtyReceived = line.qtyReceived;
        l.unitCost = line.unitCost;
        l.expiryDate = line.expiryDate;
        l.batchNumber = line.batchNumber;
        l.serialNumbers = line.serialNumbers ?? [];
        l.sku = line.sku;
        l.productName = line.productName;
      });
    }
    return grn;
  });
}

/** Apply GRN locally: stock, batches, serials. */
export async function postGrnLocally(grnId: string): Promise<void> {
  const grn = await database.get<Grn>('grns').find(grnId);
  const lines = await database
    .get<GrnLine>('grn_lines')
    .query(Q.where('grn_id', grnId))
    .fetch();

  await database.write(async () => {
    for (const line of lines) {
      let saleQty = line.qtyReceived;
      if (line.variantId) {
        const product = await database
          .get<Product>('products')
          .find(line.productId);
        saleQty = purchaseQtyToSaleUnits(
          line.qtyReceived,
          product.uomConversionFactor || 1,
        );
        const variant = await database
          .get<ProductVariant>('product_variants')
          .find(line.variantId);
        await variant.update(v => {
          v.stockQty = v.stockQty + saleQty;
        });

        if (line.batchNumber) {
          const batches = database.get<VariantBatch>('variant_batches');
          const existing = await batches
            .query(
              Q.where('variant_id', line.variantId),
              Q.where('batch_number', line.batchNumber),
            )
            .fetch();
          if (existing[0]) {
            await existing[0].update(b => {
              b.qty = b.qty + saleQty;
              if (line.expiryDate) {
                b.expiryDate = line.expiryDate;
              }
            });
          } else {
            await batches.create(b => {
              b.variantId = line.variantId!;
              b.productId = line.productId;
              b.batchNumber = line.batchNumber!;
              b.qty = saleQty;
              b.expiryDate = line.expiryDate;
            });
          }
        }

        for (const serial of line.serialNumbers ?? []) {
          await database.get<SerialNumber>('serial_numbers').create(s => {
            s.variantId = line.variantId!;
            s.productId = line.productId;
            s.serial = serial;
            s.status = 'IN_STOCK';
          });
        }
      }
    }
    await grn.update(g => {
      g.status = 'POSTED';
    });
  });
}

export async function getVariantBatches(variantId: string): Promise<BatchRow[]> {
  const rows = await database
    .get<VariantBatch>('variant_batches')
    .query(Q.where('variant_id', variantId))
    .fetch();
  return rows.map(b => ({
    batchNumber: b.batchNumber,
    qty: b.qty,
    expiryDate: b.expiryDate,
  }));
}

export async function pickCheckoutBatch(
  variantId: string,
  qty: number,
): Promise<{batchNumber: string; expiryDate?: string} | null> {
  const batches = await getVariantBatches(variantId);
  const pick = pickFefoBatch(batches, qty);
  if (!pick) {
    return null;
  }
  return {
    batchNumber: pick.batch.batchNumber,
    expiryDate: pick.batch.expiryDate ?? undefined,
  };
}

export async function consumeBatchQty(
  variantId: string,
  batchNumber: string,
  qty: number,
): Promise<void> {
  const rows = await database
    .get<VariantBatch>('variant_batches')
    .query(
      Q.where('variant_id', variantId),
      Q.where('batch_number', batchNumber),
    )
    .fetch();
  if (!rows[0]) {
    return;
  }
  await database.write(async () => {
    await rows[0].update(b => {
      b.qty = Math.max(0, b.qty - qty);
    });
  });
}

export async function markSerialSold(
  serial: string,
  saleId: string,
): Promise<void> {
  const rows = await database
    .get<SerialNumber>('serial_numbers')
    .query(Q.where('serial', serial))
    .fetch();
  if (!rows[0]) {
    return;
  }
  await database.write(async () => {
    await rows[0].update(s => {
      s.status = 'SOLD';
      s.saleId = saleId;
    });
  });
}

export async function findSerial(serial: string) {
  const rows = await database
    .get<SerialNumber>('serial_numbers')
    .query(Q.where('serial', serial.trim()))
    .fetch();
  return rows[0] ?? null;
}

export async function listUoms(): Promise<Uom[]> {
  await ensureDefaultUoms();
  return database.get<Uom>('uoms').query().fetch();
}

export async function updateProductSettings(
  productId: string,
  settings: {
    reorderPoint: number;
    reorderQty: number;
    preferredSupplierId?: string | null;
    isSerialTracked?: boolean;
    purchaseUomId?: string | null;
    saleUomId?: string | null;
    uomConversionFactor?: number;
  },
): Promise<void> {
  const product = await database.get<Product>('products').find(productId);
  await database.write(async () => {
    await product.update(p => {
      p.reorderPoint = settings.reorderPoint;
      p.reorderQty = settings.reorderQty;
      if (settings.preferredSupplierId !== undefined) {
        p.preferredSupplierId = settings.preferredSupplierId ?? undefined;
      }
      if (settings.isSerialTracked !== undefined) {
        p.isSerialTracked = settings.isSerialTracked;
      }
      if (settings.purchaseUomId !== undefined) {
        p.purchaseUomId = settings.purchaseUomId ?? undefined;
      }
      if (settings.saleUomId !== undefined) {
        p.saleUomId = settings.saleUomId ?? undefined;
      }
      if (settings.uomConversionFactor !== undefined) {
        p.uomConversionFactor = settings.uomConversionFactor;
      }
    });
  });
}

export async function updateProductReorder(
  productId: string,
  reorderPoint: number,
  reorderQty: number,
  preferredSupplierId?: string,
): Promise<void> {
  await updateProductSettings(productId, {
    reorderPoint,
    reorderQty,
    preferredSupplierId,
  });
}

export async function getSaleUomLabel(productId: string): Promise<string> {
  const product = await database.get<Product>('products').find(productId);
  if (!product.saleUomId) {
    return 'unit';
  }
  try {
    const uom = await database.get<Uom>('uoms').find(product.saleUomId);
    return uom.name;
  } catch {
    return 'unit';
  }
}

export function variantLabel(variant: ProductVariant): string {
  return variantDisplayLabel(variant.name, variant.attributes);
}

export {DEFAULT_LOCATION, stringifyAttributes};
