export const roles = [
  'CEO',
  'CFO',
  'SALES',
  'OPERATIONS',
  'HR',
  'MARKETING',
  'ACCOUNTING',
] as const

export type Role = (typeof roles)[number]

export const rolePathMap: Record<Role, string> = {
  CEO: 'ceo',
  CFO: 'cfo',
  SALES: 'sales',
  OPERATIONS: 'operations',
  HR: 'hr',
  MARKETING: 'marketing',
  ACCOUNTING: 'accounting',
}

export const roleApiMap: Record<Role, string> = {
  CEO: 'ceo',
  CFO: 'cfo',
  SALES: 'sales',
  OPERATIONS: 'ops',
  HR: 'hr',
  MARKETING: 'marketing',
  ACCOUNTING: 'accounting',
}

export const pathRoleMap = Object.fromEntries(
  Object.entries(rolePathMap).map(([key, value]) => [value, key]),
) as Record<string, Role>
