import {Model} from '@nozbe/watermelondb';
import {text} from '@nozbe/watermelondb/decorators';

export type SerialStatus = 'IN_STOCK' | 'SOLD';

export class SerialNumber extends Model {
  static table = 'serial_numbers';

  @text('variant_id') variantId!: string;
  @text('product_id') productId!: string;
  @text('serial') serial!: string;
  @text('status') status!: SerialStatus;
  @text('sale_id') saleId?: string;
}
