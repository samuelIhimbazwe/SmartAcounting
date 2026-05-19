import {Model} from '@nozbe/watermelondb';
import {field, json, relation, text} from '@nozbe/watermelondb/decorators';
import type {Product} from './Product';

export type VariantAttributes = Record<string, string>;

export class ProductVariant extends Model {
  static table = 'product_variants';

  @text('product_id') productId!: string;
  @text('server_id') serverId?: string;
  @text('sku') sku!: string;
  @text('name') name!: string;
  @json('attributes_json', sanitizeAttributes) attributes!: VariantAttributes;
  @text('barcode') barcode!: string;
  @field('price_override') priceOverride?: number;
  @field('stock_qty') stockQty!: number;

  @relation('products', 'product_id') product!: Product;
}

function sanitizeAttributes(raw: unknown): VariantAttributes {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as VariantAttributes;
  }
  return {};
}
