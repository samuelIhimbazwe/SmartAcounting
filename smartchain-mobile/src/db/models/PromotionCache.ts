import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class PromotionCache extends Model {
  static table = 'promotions_cache';

  @text('server_id') serverId?: string;
  @text('name') name!: string;
  @text('promotion_type') promotionType!: string;
  @field('discount_value') discountValue?: number;
  @field('bundle_price') bundlePrice?: number;
  @field('buy_quantity') buyQuantity?: number;
  @field('get_quantity') getQuantity?: number;
  @field('minimum_purchase') minimumPurchase?: number;
  @field('maximum_discount') maximumDiscount?: number;
  @text('applies_to') appliesTo?: string;
  @text('product_ids_json') productIdsJson?: string;
  @field('active') active!: boolean;
  @text('valid_from') validFrom?: string;
  @text('valid_to') validTo?: string;
  @field('allow_stack') allowStack!: boolean;
}
