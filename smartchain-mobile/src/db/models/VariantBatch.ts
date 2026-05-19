import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class VariantBatch extends Model {
  static table = 'variant_batches';

  @text('variant_id') variantId!: string;
  @text('product_id') productId!: string;
  @text('batch_number') batchNumber!: string;
  @field('qty') qty!: number;
  @text('expiry_date') expiryDate?: string;
}
