import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class OfflineTransaction extends Model {
  static table = 'offline_transactions';

  @text('payload') payloadJson!: string;
  @text('idempotency_key') idempotencyKey!: string;
  @text('saved_at') savedAt!: string;
  @field('synced') synced!: boolean;
  @field('retry_count') retryCount!: number;
}
