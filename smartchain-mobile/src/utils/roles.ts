/** Mirrors backend authority naming (`ROLE_*`) and dashboard path segments. */
export type AppRole =
  | 'CEO'
  | 'CFO'
  | 'SALES_MANAGER'
  | 'OPS_MANAGER'
  | 'HR_MANAGER'
  | 'MARKETING_MANAGER'
  | 'ACCOUNTING_CONTROLLER'
  | 'CASHIER'
  | 'POS_OPERATOR';

const ROLE_PREFIX = 'ROLE_';

export function normalizeRole(authority: string): AppRole | null {
  if (!authority.startsWith(ROLE_PREFIX)) {
    return null;
  }
  const raw = authority.slice(ROLE_PREFIX.length);
  const map: Record<string, AppRole> = {
    CEO: 'CEO',
    CFO: 'CFO',
    SALES_MANAGER: 'SALES_MANAGER',
    OPS_MANAGER: 'OPS_MANAGER',
    HR_MANAGER: 'HR_MANAGER',
    MARKETING_MANAGER: 'MARKETING_MANAGER',
    ACCOUNTING_CONTROLLER: 'ACCOUNTING_CONTROLLER',
    CASHIER: 'CASHIER',
    POS_OPERATOR: 'POS_OPERATOR',
  };
  return map[raw] ?? null;
}

export function normalizeRoles(authorities: string[]): AppRole[] {
  const out: AppRole[] = [];
  for (const a of authorities) {
    const r = normalizeRole(a);
    if (r) {
      out.push(r);
    }
  }
  return out;
}

export function roleDashboardPath(role: AppRole): string {
  const m: Record<AppRole, string> = {
    CEO: 'ceo',
    CFO: 'cfo',
    SALES_MANAGER: 'sales',
    OPS_MANAGER: 'operations',
    HR_MANAGER: 'hr',
    MARKETING_MANAGER: 'marketing',
    ACCOUNTING_CONTROLLER: 'accounting',
    CASHIER: 'sales',
    POS_OPERATOR: 'sales',
  };
  return m[role];
}

export function hasAnyRole(roles: AppRole[], ...need: AppRole[]): boolean {
  return need.some(r => roles.includes(r));
}

export function isCashierRole(role: AppRole | null): boolean {
  return role === 'CASHIER' || role === 'POS_OPERATOR';
}

export function isCashierShell(roles: AppRole[]): boolean {
  return roles.some(r => r === 'CASHIER' || r === 'POS_OPERATOR');
}

export function canManageTillSession(roles: AppRole[]): boolean {
  return hasAnyRole(
    roles,
    'CEO',
    'CFO',
    'OPS_MANAGER',
    'SALES_MANAGER',
    'ACCOUNTING_CONTROLLER',
  );
}

export function canManageInventory(roles: AppRole[]): boolean {
  return hasAnyRole(roles, 'CEO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER');
}

export function canManageProcurement(roles: AppRole[]): boolean {
  return hasAnyRole(roles, 'CEO', 'CFO', 'OPS_MANAGER');
}

export function canPrintXReport(roles: AppRole[]): boolean {
  return hasAnyRole(
    roles,
    'CEO',
    'CFO',
    'OPS_MANAGER',
    'ACCOUNTING_CONTROLLER',
  );
}

export function canViewFiscalAudit(roles: AppRole[]): boolean {
  return hasAnyRole(roles, 'CEO', 'ACCOUNTING_CONTROLLER');
}

export function canUseOnAccountTender(roles: AppRole[]): boolean {
  return hasAnyRole(
    roles,
    'CEO',
    'CFO',
    'SALES_MANAGER',
    'ACCOUNTING_CONTROLLER',
    'OPS_MANAGER',
  );
}

export function pickPrimaryRole(roles: AppRole[]): AppRole | null {
  const order: AppRole[] = [
    'CEO',
    'CFO',
    'OPS_MANAGER',
    'SALES_MANAGER',
    'ACCOUNTING_CONTROLLER',
    'HR_MANAGER',
    'MARKETING_MANAGER',
    'CASHIER',
    'POS_OPERATOR',
  ];
  for (const r of order) {
    if (roles.includes(r)) {
      return r;
    }
  }
  return roles[0] ?? null;
}
