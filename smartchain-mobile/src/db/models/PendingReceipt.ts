import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class PendingReceipt extends Model {
  static table = 'pending_receipts';

  @text('transaction_id') transactionId!: string;
  @text('receipt_data') receiptData!: string;
  @field('printed') printed!: boolean;
  @text('saved_at') savedAt!: string;
}
