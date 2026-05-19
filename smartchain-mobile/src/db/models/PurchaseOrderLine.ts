import {Model} from '@nozbe/watermelondb';
import {field, relation, text} from '@nozbe/watermelondb/decorators';
import type {PurchaseOrder} from './PurchaseOrder';

export class PurchaseOrderLine extends Model {
  static table = 'purchase_order_lines';

  @text('po_id') poId!: string;
  @text('product_id') productId!: string;
  @text('variant_id') variantId?: string;
  @text('server_product_id') serverProductId?: string;
  @field('ordered_qty') orderedQty!: number;
  @text('uom_id') uomId?: string;
  @field('unit_cost') unitCost!: number;
  @field('received_qty') receivedQty!: number;
  @text('sku') sku!: string;
  @text('product_name') productName!: string;

  @relation('purchase_orders', 'po_id') purchaseOrder!: PurchaseOrder;
}
