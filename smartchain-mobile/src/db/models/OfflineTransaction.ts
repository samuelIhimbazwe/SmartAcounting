import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export type OfflineOperationType =
  | 'POS_CHECKOUT'
  | 'POS_RETURN'
  | 'STOCK_COUNT'
  | 'TILL_CLOSE'
  | 'PO_CREATE'
  | 'GRN_POST';

export class OfflineTransaction extends Model {
  static table = 'offline_transactions';

  @text('operation_type') operationType!: OfflineOperationType;
  @text('payload') payloadJson!: string;
  @text('idempotency_key') idempotencyKey!: string;
  @text('saved_at') savedAt!: string;
  @field('synced') synced!: boolean;
  @field('retry_count') retryCount!: number;
  @text('last_error') lastError?: string;
}
