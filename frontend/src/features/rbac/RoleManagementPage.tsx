import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAnyPermission } from '../../shared/hooks/usePermission'
import { listTenantRoles, type TenantRoleDto } from '../../shared/api/tenantRoles'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { RoleSetupWizard } from './RoleSetupWizard'

export function RoleManagementPage() {
  const canManage = useAnyPermission(['ROLE_MANAGE', 'TENANT_CONFIG'])
  const rolesQuery = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: listTenantRoles,
    enabled: canManage,
  })

  const columns = useMemo((): DataTableColumn<TenantRoleDto>[] => [
    {
      key: 'name',
      header: 'Role',
      render: (_value, role) => (
        <span>
          <span className="mr-2">{role.emoji}</span>
          {role.name}
          {role.isOwner ? (
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Owner</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (_value, role) => `${role.permissions.length} granted`,
    },
    { key: 'userCount', header: 'Users', columnType: 'number' },
  ], [])

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
      <DataTable
        columns={columns}
        rows={roles}
        isLoading={rolesQuery.isLoading}
        getRowKey={row => row.id}
        showSearch={roles.length > 10}
        emptyStateLabel="No roles configured"
      />
    </div>
  )
}
