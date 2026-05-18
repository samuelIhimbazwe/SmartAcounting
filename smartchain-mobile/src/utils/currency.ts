export type CurrencyCode = 'FRW' | 'USD';

export function formatMoney(amount: number, currency: CurrencyCode): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${Math.round(amount)} FRW`;
}
