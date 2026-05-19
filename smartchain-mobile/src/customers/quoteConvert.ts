import type {CartItem, SelectedCustomer} from '../store/slices/posSlice';
import {getCustomer} from './customerRepository';
import {getQuote, markQuoteConverted} from './quoteRepository';

export async function convertQuoteToCheckoutPayload(quoteId: string): Promise<{
  cart: CartItem[];
  customer: SelectedCustomer | null;
  currency: 'FRW' | 'USD';
} | null> {
  const quote = await getQuote(quoteId);
  if (!quote || quote.status !== 'OPEN') {
    return null;
  }
  let cart: CartItem[] = [];
  try {
    cart = JSON.parse(quote.cartJson) as CartItem[];
  } catch {
    return null;
  }
  let customer: SelectedCustomer | null = null;
  if (quote.customerId) {
    try {
      const c = await getCustomer(quote.customerId);
      customer = {
        customerId: c.id,
        serverId: c.serverId,
        customerName: c.name,
        priceListId: c.priceListId,
        creditLimit: c.creditLimit,
        creditBalance: c.creditBalance,
        loyaltyPoints: c.loyaltyPoints,
        loyaltyEnabled: c.loyaltyEnabled,
      };
    } catch {
      customer = null;
    }
  }
  await markQuoteConverted(quoteId);
  const currency =
    quote.currencyCode === 'USD' ? 'USD' : 'FRW';
  return {cart, customer, currency};
}
