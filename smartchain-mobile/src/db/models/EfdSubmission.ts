import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class EfdSubmission extends Model {
  static table = 'efd_submissions';

  @text('sales_order_id') salesOrderId!: string;
  @text('payload_json') payloadJson!: string;
  @text('status') status!: string;
  @text('fiscal_signature') fiscalSignature?: string;
  @text('fiscal_qr_data') fiscalQrData?: string;
  @field('retry_count') retryCount!: number;
  @text('last_error') lastError?: string;
  @text('saved_at') savedAt!: string;
  @text('confirmed_at') confirmedAt?: string;
}
