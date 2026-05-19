import {Model} from '@nozbe/watermelondb';
import {children, field, relation, text} from '@nozbe/watermelondb/decorators';
import type {PurchaseOrderLine} from './PurchaseOrderLine';
import type {Supplier} from './Supplier';

export type PoStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'CANCELLED';

export class PurchaseOrder extends Model {
  static table = 'purchase_orders';

  @text('server_id') serverId?: string;
  @text('supplier_id') supplierId!: string;
  @text('status') status!: PoStatus;
  @text('created_by') createdBy?: string;
  @text('ordered_at') orderedAt!: string;
  @text('expected_delivery_date') expectedDeliveryDate?: string;
  @text('notes') notes?: string;
  @field('needs_sync') needsSync!: boolean;

  @children('purchase_order_lines') lines!: PurchaseOrderLine[];
  @relation('suppliers', 'supplier_id') supplier!: Supplier;
}
