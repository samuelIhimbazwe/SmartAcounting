import {selectHasPermission} from '../src/store/slices/authSlice';
import {authInitialState} from '../src/store/slices/authSlice';
import {hasPermission, resolveMobileTabs} from '../src/utils/permissions';

describe('permissions', () => {
  it('ANALYTICS_ALL grants broad access', () => {
    const tabs = resolveMobileTabs(['ANALYTICS_ALL'], []);
    expect(tabs.showDashboard).toBe(true);
    expect(tabs.showStock).toBe(true);
  });

  it('cashier permissions show till and pos only', () => {
    const tabs = resolveMobileTabs(
      ['POS_ACCESS', 'POS_TILL_MANAGE', 'EBM_SUBMIT'],
      ['CASHIER'],
    );
    expect(tabs.showTill).toBe(true);
    expect(tabs.showPos).toBe(true);
    expect(tabs.showStock).toBe(false);
    expect(tabs.cashierShell).toBe(true);
  });

  it('hasPermission respects catalog codes', () => {
    const perms = new Set(['INVENTORY_READ']);
    expect(hasPermission(perms, 'INVENTORY_READ')).toBe(true);
    expect(hasPermission(perms, 'FINANCE_WRITE')).toBe(false);
  });

  it('selectHasPermission reads JWT permission list from auth state', () => {
    const state = {
      auth: {
        ...authInitialState,
        permissions: ['POS_ACCESS', 'INVENTORY_READ'],
      },
    };
    expect(selectHasPermission(state, 'POS_ACCESS')).toBe(true);
    expect(selectHasPermission(state, 'POS_RETURNS')).toBe(false);
  });
});
