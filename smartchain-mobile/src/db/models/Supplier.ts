import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class Supplier extends Model {
  static table = 'suppliers';

  @text('server_id') serverId?: string;
  @text('name') name!: string;
  @text('phone') phone?: string;
  @text('email') email?: string;
  @text('address') address?: string;
  @text('tin_number') tinNumber?: string;
  @text('notes') notes?: string;
  @text('deleted_at') deletedAt?: string;

  get isDeleted(): boolean {
    return Boolean(this.deletedAt);
  }
}
