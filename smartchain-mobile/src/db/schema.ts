import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'offline_transactions',
      columns: [
        {name: 'payload', type: 'string'},
        {name: 'idempotency_key', type: 'string'},
        {name: 'saved_at', type: 'string'},
        {name: 'synced', type: 'boolean'},
        {name: 'retry_count', type: 'number'},
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
