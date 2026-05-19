import {navigateFromPush} from './navigationRef';
import type {AppRole} from '../utils/roles';
import {isCashierShell} from '../utils/roles';

/** Maps backend push data routes to mobile tab/screen targets. */
const PUSH_ROUTE_MAP: Record<string, {tab: string; screen?: string}> = {
  '/stock': {tab: 'Stock', screen: 'StockList'},
  '/till': {tab: 'Till', screen: 'TillOpen'},
  '/pos': {tab: 'POS', screen: 'Checkout'},
  '/anomaly/cases': {tab: 'Dashboard'},
  '/credit-ledger': {tab: 'Dashboard'},
};

const CASHIER_ALLOWED_TABS = new Set(['Till', 'POS', 'Settings']);

export function navigateFromPushRoute(
  route: string,
  roles: AppRole[] = [],
): void {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const mapped = PUSH_ROUTE_MAP[normalized];

  if (isCashierShell(roles) && mapped && !CASHIER_ALLOWED_TABS.has(mapped.tab)) {
    navigateFromPush({name: 'Till', params: {screen: 'TillOpen'}} as never);
    return;
  }

  if (!mapped) {
    navigateFromPush(normalized as never);
    return;
  }
  navigateFromPush({
    name: mapped.tab,
    params: mapped.screen ? {screen: mapped.screen} : undefined,
  } as never);
}
