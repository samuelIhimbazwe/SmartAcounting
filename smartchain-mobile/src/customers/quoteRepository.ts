import {database} from '../db';
import {SalesQuote} from '../db/models/SalesQuote';

export async function createQuote(input: {
  customerId?: string;
  currencyCode: string;
  cartJson: string;
  totalAmount: number;
  expiryDate?: string;
}): Promise<SalesQuote> {
  return database.write(async () =>
    database.get<SalesQuote>('sales_quotes').create(q => {
      q.customerId = input.customerId;
      q.status = 'OPEN';
      q.currencyCode = input.currencyCode;
      q.totalAmount = input.totalAmount;
      q.expiryDate = input.expiryDate;
      q.cartJson = input.cartJson;
      q.needsSync = true;
    }),
  );
}

export async function getQuote(id: string): Promise<SalesQuote | null> {
  try {
    return await database.get<SalesQuote>('sales_quotes').find(id);
  } catch {
    return null;
  }
}

export async function listQuotes(status?: string): Promise<SalesQuote[]> {
  const rows = await database.get<SalesQuote>('sales_quotes').query().fetch();
  if (!status) {
    return rows;
  }
  return rows.filter(q => q.status === status);
}

export async function markQuoteConverted(id: string): Promise<void> {
  const q = await database.get<SalesQuote>('sales_quotes').find(id);
  await database.write(async () => {
    await q.update(row => {
      row.status = 'CONVERTED';
    });
  });
}
