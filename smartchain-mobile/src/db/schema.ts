import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'offline_transactions',
      columns: [
        {name: 'operation_type', type: 'string'},
        {name: 'payload', type: 'string'},
        {name: 'idempotency_key', type: 'string'},
        {name: 'saved_at', type: 'string'},
        {name: 'synced', type: 'boolean'},
        {name: 'retry_count', type: 'number'},
        {name: 'last_error', type: 'string', isOptional: true},
      ],
    }),
    tableSchema({
      name: 'pending_receipts',
      columns: [
        {name: 'transaction_id', type: 'string'},
        {name: 'receipt_data', type: 'string'},
        {name: 'printed', type: 'boolean'},
        {name: 'created_at', type: 'string'},
      ],
    }),
  ],
});
