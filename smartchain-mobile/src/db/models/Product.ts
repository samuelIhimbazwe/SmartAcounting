import {Model} from '@nozbe/watermelondb';
import {children, field, relation, text} from '@nozbe/watermelondb/decorators';
import type {ProductVariant} from './ProductVariant';
import type {Supplier} from './Supplier';
import type {Uom} from './Uom';

export class Product extends Model {
  static table = 'products';

  @text('server_id') serverId?: string;
  @text('name') name!: string;
  @text('sku') sku!: string;
  @text('preferred_supplier_id') preferredSupplierId?: string;
  @text('purchase_uom_id') purchaseUomId?: string;
  @text('sale_uom_id') saleUomId?: string;
  @field('uom_conversion_factor') uomConversionFactor!: number;
  @field('reorder_point') reorderPoint!: number;
  @field('reorder_qty') reorderQty!: number;
  @field('is_serial_tracked') isSerialTracked!: boolean;
  @field('base_unit_price') baseUnitPrice!: number;
  @text('currency_code') currencyCode!: string;

  @children('product_variants') variants!: ProductVariant[];
  @relation('suppliers', 'preferred_supplier_id') preferredSupplier!: Supplier;
  @relation('uoms', 'purchase_uom_id') purchaseUom!: Uom;
  @relation('uoms', 'sale_uom_id') saleUom!: Uom;
}
