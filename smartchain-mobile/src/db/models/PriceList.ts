import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class PriceList extends Model {
  static table = 'price_lists';

  @text('server_id') serverId?: string;
  @text('name') name!: string;
  @text('currency_code') currencyCode!: string;
  @field('discount_pct') discountPct?: number;
  @text('valid_from') validFrom?: string;
  @text('valid_to') validTo?: string;
  @text('deleted_at') deletedAt?: string;
}
