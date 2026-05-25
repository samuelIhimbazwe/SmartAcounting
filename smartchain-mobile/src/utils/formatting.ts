/** Rwanda locale-aware currency and date formatting for mobile UI. */

export function formatFrw(amount: number, locale: string = 'en'): string {
  if (locale === 'fr' || locale === 'rw') {
    return new Intl.NumberFormat('fr-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `FRW ${amount.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
}

export function formatDateLocalized(
  date: Date | string,
  locale: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const fmt = locale === 'en' ? 'en-US' : 'fr-RW';
  return new Intl.DateTimeFormat(fmt, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}
