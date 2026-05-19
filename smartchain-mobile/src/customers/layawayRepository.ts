import {database} from '../db';
import {LayawayOrder} from '../db/models/LayawayOrder';
import {adjustVariantStock} from '../inventory/inventoryRepository';
import type {CartItem} from '../store/slices/posSlice';

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
  return getLayaway(id);
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
  return true;
}
