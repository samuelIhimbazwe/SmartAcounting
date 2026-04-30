import type { Role } from '../../shared/types/roles'

export function canManageUsers(role: Role) {
  return role === 'CEO' || role === 'CFO' || role === 'HR'
}
