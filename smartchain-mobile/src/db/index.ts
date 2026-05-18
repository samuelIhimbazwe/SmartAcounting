import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {schema} from './schema';
import {OfflineTransaction} from './models/OfflineTransaction';
import {PendingReceipt} from './models/PendingReceipt';

const adapter = new SQLiteAdapter({
  schema,
  jsi: false,
  onSetUpError: error => console.error(error),
});

export const database = new Database({
  adapter,
  modelClasses: [OfflineTransaction, PendingReceipt],
});
