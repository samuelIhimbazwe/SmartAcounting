import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class LayawayOrder extends Model {
  static table = 'layaway_orders';

  @text('server_id') serverId?: string;
  @text('customer_id') customerId!: string;
  @text('status') status!: string;
  @text('currency_code') currencyCode!: string;
  @field('total_amount') totalAmount!: number;
  @field('deposit_amount') depositAmount!: number;
  @field('balance_due') balanceDue!: number;
  @text('collection_date') collectionDate?: string;
  @text('cart_json') cartJson!: string;
  @field('needs_sync') needsSync!: boolean;
}
