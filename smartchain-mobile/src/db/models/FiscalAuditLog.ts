import {Model} from '@nozbe/watermelondb';
import {text} from '@nozbe/watermelondb/decorators';

export class FiscalAuditLog extends Model {
  static table = 'fiscal_audit_log';

  @text('entity_type') entityType!: string;
  @text('entity_id') entityId!: string;
  @text('action') action!: string;
  @text('actor_id') actorId!: string;
  @text('timestamp') timestamp!: string;
  @text('previous_hash') previousHash!: string;
  @text('hash') hash!: string;
}
