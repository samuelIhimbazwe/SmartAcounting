import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {schema} from './schema';
import migrations from './migrations';
import {OfflineTransaction} from './models/OfflineTransaction';
import {PendingReceipt} from './models/PendingReceipt';
import {Uom} from './models/Uom';
import {Supplier} from './models/Supplier';
import {Product} from './models/Product';
import {ProductVariant} from './models/ProductVariant';
import {VariantBatch} from './models/VariantBatch';
import {SerialNumber} from './models/SerialNumber';
import {PurchaseOrder} from './models/PurchaseOrder';
import {PurchaseOrderLine} from './models/PurchaseOrderLine';
import {Grn} from './models/Grn';
import {GrnLine} from './models/GrnLine';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false,
  onSetUpError: error => console.error(error),
});

export const database = new Database({
  adapter,
  modelClasses: [
    OfflineTransaction,
    PendingReceipt,
    Uom,
    Supplier,
    Product,
    ProductVariant,
    VariantBatch,
    SerialNumber,
    PurchaseOrder,
    PurchaseOrderLine,
    Grn,
    GrnLine,
  ],
});
