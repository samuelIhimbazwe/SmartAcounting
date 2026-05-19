import {Model} from '@nozbe/watermelondb';
import {field, json, relation, text} from '@nozbe/watermelondb/decorators';
import type {Grn} from './Grn';

export class GrnLine extends Model {
  static table = 'grn_lines';

  @text('grn_id') grnId!: string;
  @text('product_id') productId!: string;
  @text('variant_id') variantId?: string;
  @field('qty_received') qtyReceived!: number;
  @field('unit_cost') unitCost!: number;
  @text('expiry_date') expiryDate?: string;
  @text('batch_number') batchNumber?: string;
  @json('serial_numbers_json', sanitizeSerials) serialNumbers!: string[];

  @text('sku') sku!: string;
  @text('product_name') productName!: string;

  @relation('grns', 'grn_id') grn!: Grn;
}

function sanitizeSerials(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter(s => typeof s === 'string');
  }
  return [];
}
