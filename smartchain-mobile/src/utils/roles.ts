/** Mirrors backend authority naming (`ROLE_*`) and dashboard path segments. */
export type AppRole =
  | 'CEO'
  | 'CFO'
  | 'SALES_MANAGER'
  | 'OPS_MANAGER'
  | 'HR_MANAGER'
  | 'MARKETING_MANAGER'
  | 'ACCOUNTING_CONTROLLER';

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
  };
  return m[role];
}

export function hasAnyRole(roles: AppRole[], ...need: AppRole[]): boolean {
  return need.some(r => roles.includes(r));
}
