import { navigateFromPush } from './navigationRef';

/** Maps backend push data routes to mobile tab/screen targets. */
const PUSH_ROUTE_MAP: Record<string, { tab: string; screen?: string }> = {
  '/stock': { tab: 'Stock', screen: 'StockList' },
  '/till': { tab: 'Till', screen: 'TillOpen' },
  '/pos': { tab: 'POS', screen: 'Checkout' },
  '/anomaly/cases': { tab: 'Dashboard' },
  '/credit-ledger': { tab: 'Dashboard' },
};

export function navigateFromPushRoute(route: string): void {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const mapped = PUSH_ROUTE_MAP[normalized];
  if (!mapped) {
    navigateFromPush(normalized as never);
    return;
  }
  navigateFromPush({
    name: mapped.tab,
    params: mapped.screen ? { screen: mapped.screen } : undefined,
  } as never);
}
