import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class PriceListLine extends Model {
  static table = 'price_list_lines';

  @text('price_list_id') priceListId!: string;
  @text('product_id') productId!: string;
  @text('variant_id') variantId?: string;
  @field('unit_price') unitPrice!: number;
}
