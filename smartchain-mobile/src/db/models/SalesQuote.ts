import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class SalesQuote extends Model {
  static table = 'sales_quotes';

  @text('server_id') serverId?: string;
  @text('customer_id') customerId?: string;
  @text('status') status!: string;
  @text('currency_code') currencyCode!: string;
  @field('total_amount') totalAmount!: number;
  @text('expiry_date') expiryDate?: string;
  @text('cart_json') cartJson!: string;
  @field('needs_sync') needsSync!: boolean;
}
