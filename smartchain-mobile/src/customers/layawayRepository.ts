import {database} from '../db';
import {LayawayOrder} from '../db/models/LayawayOrder';
import {Customer} from '../db/models/Customer';
import {adjustVariantStock} from '../inventory/inventoryRepository';
import type {CartItem} from '../store/slices/posSlice';
import {
  cancelLayawayOnServer,
  collectLayawayOnServer,
  createLayawayOnServer,
  recordLayawayPaymentOnServer,
} from '../api/layaway';

const LAYAWAY_DEPOSIT_PCT = 0.3;

type CartLine = Pick<CartItem, 'variantId' | 'quantity'>;

async function applyCartStockDelta(cartJson: string, sign: -1 | 1): Promise<void> {
  const items = JSON.parse(cartJson) as CartLine[];
  for (const item of items) {
    if (item.variantId && item.quantity > 0) {
      await adjustVariantStock(item.variantId, sign * item.quantity);
    }
  }
}

async function resolveCustomerServerId(localCustomerId: string): Promise<string | null> {
  try {
    const customer = await database.get<Customer>('customers').find(localCustomerId);
    return customer.serverId ?? null;
  } catch {
    return null;
  }
}

async function syncCreateToServer(order: LayawayOrder): Promise<void> {
  const customerServerId = await resolveCustomerServerId(order.customerId);
  if (!customerServerId) {
    return;
  }
  try {
    const remote = await createLayawayOnServer(customerServerId, {
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      currencyCode: order.currencyCode,
      cartJson: order.cartJson,
      collectionDate: order.collectionDate,
    });
    await database.write(async () => {
      await order.update(r => {
        r.serverId = remote.id;
        r.needsSync = false;
      });
    });
  } catch {
    // Offline or auth failure — local record kept; retry on next mutation.
  }
}

async function syncMutationToServer(
  order: LayawayOrder,
  action: 'payment' | 'collect' | 'cancel',
  amount?: number,
): Promise<void> {
  const customerServerId = await resolveCustomerServerId(order.customerId);
  if (!customerServerId || !order.serverId) {
    return;
  }
  try {
    if (action === 'payment' && amount != null) {
      await recordLayawayPaymentOnServer(customerServerId, order.serverId, amount);
    } else if (action === 'collect') {
      await collectLayawayOnServer(customerServerId, order.serverId);
    } else if (action === 'cancel') {
      await cancelLayawayOnServer(customerServerId, order.serverId);
    }
  } catch {
    // Best-effort sync; local state remains source of truth on device.
  }
}

export async function createLayaway(input: {
  customerId: string;
  currencyCode: string;
  cartJson: string;
  totalAmount: number;
  depositAmount: number;
  collectionDate?: string;
}): Promise<LayawayOrder> {
  const balance = Math.max(0, input.totalAmount - input.depositAmount);
  const order = await database.write(async () =>
    database.get<LayawayOrder>('layaway_orders').create(r => {
      r.customerId = input.customerId;
      r.status = 'OPEN';
      r.currencyCode = input.currencyCode;
      r.totalAmount = input.totalAmount;
      r.depositAmount = input.depositAmount;
      r.balanceDue = balance;
      r.collectionDate = input.collectionDate;
      r.cartJson = input.cartJson;
      r.needsSync = true;
    }),
  );
  await applyCartStockDelta(input.cartJson, -1);
  void syncCreateToServer(order);
  return order;
}

export function minLayawayDeposit(total: number): number {
  return Math.round(total * LAYAWAY_DEPOSIT_PCT * 100) / 100;
}

export async function listOpenLayaways(): Promise<LayawayOrder[]> {
  const rows = await database.get<LayawayOrder>('layaway_orders').query().fetch();
  return rows.filter(r => r.status === 'OPEN');
}

export async function getLayaway(id: string): Promise<LayawayOrder | null> {
  try {
    return await database.get<LayawayOrder>('layaway_orders').find(id);
  } catch {
    return null;
  }
}

export async function recordLayawayPayment(
  id: string,
  amount: number,
): Promise<LayawayOrder | null> {
  const order = await getLayaway(id);
  if (!order || order.status !== 'OPEN') {
    return null;
  }
  await database.write(async () => {
    await order.update(r => {
      r.depositAmount = r.depositAmount + amount;
      r.balanceDue = Math.max(0, r.totalAmount - r.depositAmount);
    });
  });
  const updated = await getLayaway(id);
  if (updated) {
    void syncMutationToServer(updated, 'payment', amount);
  }
  return updated;
}

export async function collectLayaway(id: string): Promise<boolean> {
  const order = await getLayaway(id);
  if (!order || order.status !== 'OPEN' || order.balanceDue > 0.01) {
    return false;
  }
  await database.write(async () => {
    await order.update(r => {
      r.status = 'COLLECTED';
    });
  });
  const updated = await getLayaway(id);
  if (updated) {
    void syncMutationToServer(updated, 'collect');
  }
  return true;
}

export async function cancelLayaway(id: string): Promise<boolean> {
  const order = await getLayaway(id);
  if (!order || order.status !== 'OPEN') {
    return false;
  }
  await applyCartStockDelta(order.cartJson, 1);
  await database.write(async () => {
    await order.update(r => {
      r.status = 'CANCELLED';
    });
  });
  const updated = await getLayaway(id);
  if (updated) {
    void syncMutationToServer(updated, 'cancel');
  }
  return true;
}
