import type { Role } from '../types/roles'

const allRoles: Role[] = ['CEO', 'CFO', 'SALES', 'OPERATIONS', 'HR', 'MARKETING', 'ACCOUNTING']

const accessMatrix: Record<Role, Role[]> = {
  CEO: allRoles,
  CFO: ['CFO', 'ACCOUNTING'],
  SALES: ['SALES'],
  OPERATIONS: ['OPERATIONS'],
  HR: ['HR'],
  MARKETING: ['MARKETING'],
  ACCOUNTING: ['ACCOUNTING'],
}

export function canAccessRoleDashboard(sessionRole: Role, targetRole: Role) {
  return accessMatrix[sessionRole].includes(targetRole)
}
