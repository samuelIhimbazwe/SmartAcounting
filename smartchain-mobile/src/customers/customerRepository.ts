import {Q} from '@nozbe/watermelondb';
import {database} from '../db';
import {Customer, type CustomerType} from '../db/models/Customer';

export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  tinNumber?: string;
  customerType?: CustomerType;
  priceListId?: string | null;
  creditLimit?: number;
  loyaltyEnabled?: boolean;
  notes?: string;
  serverId?: string;
  creditBalance?: number;
  loyaltyPoints?: number;
};

export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.trim().toLowerCase();
  const all = (await database.get<Customer>('customers').query().fetch()).filter(
    c => !c.isDeleted,
  );
  if (!q) {
    return all;
  }
  return all.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q),
  );
}

export async function getCustomer(id: string): Promise<Customer> {
  return database.get<Customer>('customers').find(id);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  return database.write(async () =>
    database.get<Customer>('customers').create(c => {
      c.name = input.name.trim();
      c.phone = input.phone;
      c.email = input.email;
      c.tinNumber = input.tinNumber;
      c.customerType = input.customerType ?? 'RETAIL';
      c.priceListId = input.priceListId ?? undefined;
      c.creditLimit = input.creditLimit ?? 0;
      c.creditBalance = 0;
      c.loyaltyPoints = 0;
      c.loyaltyEnabled = input.loyaltyEnabled ?? true;
      c.notes = input.notes;
      c.serverId = input.serverId;
    }),
  );
}

export async function updateCustomer(
  id: string,
  patch: Partial<CustomerInput>,
): Promise<void> {
  const row = await getCustomer(id);
  await database.write(async () => {
    await row.update(c => {
      if (patch.name != null) {
        c.name = patch.name.trim();
      }
      if (patch.phone !== undefined) {
        c.phone = patch.phone;
      }
      if (patch.email !== undefined) {
        c.email = patch.email;
      }
      if (patch.tinNumber !== undefined) {
        c.tinNumber = patch.tinNumber;
      }
      if (patch.customerType != null) {
        c.customerType = patch.customerType;
      }
      if (patch.priceListId !== undefined) {
        c.priceListId = patch.priceListId ?? undefined;
      }
      if (patch.creditLimit != null) {
        c.creditLimit = patch.creditLimit;
      }
      if (patch.loyaltyEnabled != null) {
        c.loyaltyEnabled = patch.loyaltyEnabled;
      }
      if (patch.notes !== undefined) {
        c.notes = patch.notes;
      }
      if (patch.serverId !== undefined) {
        c.serverId = patch.serverId;
      }
    });
  });
}

export async function softDeleteCustomer(id: string): Promise<void> {
  const row = await getCustomer(id);
  await database.write(async () => {
    await row.update(c => {
      c.deletedAt = new Date().toISOString();
    });
  });
}

export async function upsertCustomerFromServer(row: Record<string, unknown>): Promise<Customer> {
  const serverId = String(row.id ?? '');
  const existing = serverId
    ? (
        await database
          .get<Customer>('customers')
          .query(Q.where('server_id', serverId))
          .fetch()
      )[0]
    : undefined;
  const payload: CustomerInput = {
    name: String(row.name ?? ''),
    phone: row.phone != null ? String(row.phone) : undefined,
    email: row.email != null ? String(row.email) : undefined,
    tinNumber: row.tinNumber != null ? String(row.tinNumber) : undefined,
    customerType: (row.customerType as CustomerType) ?? 'RETAIL',
    priceListId: row.priceListId != null ? String(row.priceListId) : null,
    creditLimit: Number(row.creditLimit ?? 0),
    loyaltyEnabled: row.loyaltyEnabled !== false,
    notes: row.notes != null ? String(row.notes) : undefined,
    serverId,
  };
  if (existing) {
    await updateCustomer(existing.id, payload);
    const updated = await getCustomer(existing.id);
    await database.write(async () => {
      await updated.update(c => {
        c.creditBalance = Number(row.creditBalance ?? c.creditBalance);
        c.loyaltyPoints = Number(row.loyaltyPoints ?? c.loyaltyPoints);
      });
    });
    return getCustomer(existing.id);
  }
  const created = await createCustomer(payload);
  await database.write(async () => {
    await created.update(c => {
      c.creditBalance = Number(row.creditBalance ?? 0);
      c.loyaltyPoints = Number(row.loyaltyPoints ?? 0);
    });
  });
  return getCustomer(created.id);
}

export function customerHasCredit(customer: Customer): boolean {
  return (customer.creditLimit ?? 0) > 0;
}
