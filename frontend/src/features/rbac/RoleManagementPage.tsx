import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAnyPermission } from '../../shared/hooks/usePermission'
import { listTenantRoles } from '../../shared/api/tenantRoles'
import { RoleSetupWizard } from './RoleSetupWizard'

export function RoleManagementPage() {
  const canManage = useAnyPermission(['ROLE_MANAGE', 'TENANT_CONFIG'])
  const rolesQuery = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: listTenantRoles,
    enabled: canManage,
  })

  if (!canManage) {
    return <p className="text-sm text-neutral-600">You do not have permission to manage roles.</p>
  }

  const roles = rolesQuery.data ?? []

  if (roles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Roles & permissions</h1>
        <p className="text-sm text-neutral-600">Complete initial role setup for your tenant.</p>
        <RoleSetupWizard onComplete={() => void rolesQuery.refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Roles & permissions</h1>
        <Link className="text-sm text-[var(--color-brand-700)] underline" to="/admin/users-tenants">
          Manage users
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-overlay)] text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3">Users</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-3">
                  <span className="mr-2">{role.emoji}</span>
                  {role.name}
                  {role.isOwner ? (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Owner</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-600">{role.permissions.length} granted</td>
                <td className="px-4 py-3">{role.userCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
