import {Model} from '@nozbe/watermelondb';
import {children, field, relation, text} from '@nozbe/watermelondb/decorators';
import type {GrnLine} from './GrnLine';
import type {Supplier} from './Supplier';

export type GrnStatus = 'PENDING' | 'POSTED';

export class Grn extends Model {
  static table = 'grns';

  @text('server_id') serverId?: string;
  @text('po_id') poId?: string;
  @text('supplier_id') supplierId!: string;
  @text('received_by') receivedBy?: string;
  @text('received_at') receivedAt!: string;
  @text('status') status!: GrnStatus;
  @text('notes') notes?: string;
  @field('needs_sync') needsSync!: boolean;

  @children('grn_lines') lines!: GrnLine[];
  @relation('suppliers', 'supplier_id') supplier!: Supplier;
}
