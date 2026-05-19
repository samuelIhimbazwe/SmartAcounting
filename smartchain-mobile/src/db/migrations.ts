import {schemaMigrations, createTable, addColumns} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'offline_transactions',
          columns: [
            {name: 'operation_type', type: 'string', isOptional: true},
            {name: 'last_error', type: 'string', isOptional: true},
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'uoms',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'conversion_factor', type: 'number'},
          ],
        }),
        createTable({
          name: 'suppliers',
          columns: [
            {name: 'server_id', type: 'string', isOptional: true},
            {name: 'name', type: 'string'},
            {name: 'phone', type: 'string', isOptional: true},
            {name: 'email', type: 'string', isOptional: true},
            {name: 'address', type: 'string', isOptional: true},
            {name: 'tin_number', type: 'string', isOptional: true},
            {name: 'notes', type: 'string', isOptional: true},
            {name: 'deleted_at', type: 'string', isOptional: true},
          ],
        }),
        createTable({
          name: 'products',
          columns: [
            {name: 'server_id', type: 'string', isOptional: true},
            {name: 'name', type: 'string'},
            {name: 'sku', type: 'string'},
            {name: 'preferred_supplier_id', type: 'string', isOptional: true},
            {name: 'purchase_uom_id', type: 'string', isOptional: true},
            {name: 'sale_uom_id', type: 'string', isOptional: true},
            {name: 'uom_conversion_factor', type: 'number'},
            {name: 'reorder_point', type: 'number'},
            {name: 'reorder_qty', type: 'number'},
            {name: 'is_serial_tracked', type: 'boolean'},
            {name: 'base_unit_price', type: 'number'},
            {name: 'currency_code', type: 'string'},
          ],
        }),
        createTable({
          name: 'product_variants',
          columns: [
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'server_id', type: 'string', isOptional: true},
            {name: 'sku', type: 'string'},
            {name: 'name', type: 'string'},
            {name: 'attributes_json', type: 'string'},
            {name: 'barcode', type: 'string', isIndexed: true},
            {name: 'price_override', type: 'number', isOptional: true},
            {name: 'stock_qty', type: 'number'},
          ],
        }),
        createTable({
          name: 'variant_batches',
          columns: [
            {name: 'variant_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'batch_number', type: 'string'},
            {name: 'qty', type: 'number'},
            {name: 'expiry_date', type: 'string', isOptional: true},
          ],
        }),
        createTable({
          name: 'serial_numbers',
          columns: [
            {name: 'variant_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'serial', type: 'string', isIndexed: true},
            {name: 'status', type: 'string'},
            {name: 'sale_id', type: 'string', isOptional: true},
          ],
        }),
        createTable({
          name: 'purchase_orders',
          columns: [
            {name: 'server_id', type: 'string', isOptional: true},
            {name: 'supplier_id', type: 'string'},
            {name: 'status', type: 'string'},
            {name: 'created_by', type: 'string', isOptional: true},
            {name: 'created_at', type: 'string'},
            {name: 'expected_delivery_date', type: 'string', isOptional: true},
            {name: 'notes', type: 'string', isOptional: true},
            {name: 'needs_sync', type: 'boolean'},
          ],
        }),
        createTable({
          name: 'purchase_order_lines',
          columns: [
            {name: 'po_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string'},
            {name: 'variant_id', type: 'string', isOptional: true},
            {name: 'server_product_id', type: 'string', isOptional: true},
            {name: 'ordered_qty', type: 'number'},
            {name: 'uom_id', type: 'string', isOptional: true},
            {name: 'unit_cost', type: 'number'},
            {name: 'received_qty', type: 'number'},
            {name: 'sku', type: 'string'},
            {name: 'product_name', type: 'string'},
          ],
        }),
        createTable({
          name: 'grns',
          columns: [
            {name: 'server_id', type: 'string', isOptional: true},
            {name: 'po_id', type: 'string', isOptional: true},
            {name: 'supplier_id', type: 'string'},
            {name: 'received_by', type: 'string', isOptional: true},
            {name: 'received_at', type: 'string'},
            {name: 'status', type: 'string'},
            {name: 'notes', type: 'string', isOptional: true},
            {name: 'needs_sync', type: 'boolean'},
          ],
        }),
        createTable({
          name: 'grn_lines',
          columns: [
            {name: 'grn_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string'},
            {name: 'variant_id', type: 'string', isOptional: true},
            {name: 'qty_received', type: 'number'},
            {name: 'unit_cost', type: 'number'},
            {name: 'expiry_date', type: 'string', isOptional: true},
            {name: 'batch_number', type: 'string', isOptional: true},
            {name: 'serial_numbers_json', type: 'string', isOptional: true},
            {name: 'sku', type: 'string'},
            {name: 'product_name', type: 'string'},
          ],
        }),
      ],
    },
  ],
});
