import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export class Uom extends Model {
  static table = 'uoms';

  @text('name') name!: string;
  @field('conversion_factor') conversionFactor!: number;
}
