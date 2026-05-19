import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'VIP';

export class Customer extends Model {
  static table = 'customers';

  @text('server_id') serverId?: string;
  @text('name') name!: string;
  @text('phone') phone?: string;
  @text('email') email?: string;
  @text('tin_number') tinNumber?: string;
  @text('customer_type') customerType!: CustomerType;
  @text('price_list_id') priceListId?: string;
  @field('credit_limit') creditLimit!: number;
  @field('credit_balance') creditBalance!: number;
  @field('loyalty_points') loyaltyPoints!: number;
  @field('loyalty_enabled') loyaltyEnabled!: boolean;
  @text('notes') notes?: string;
  @text('deleted_at') deletedAt?: string;

  get isDeleted(): boolean {
    return Boolean(this.deletedAt);
  }
}
