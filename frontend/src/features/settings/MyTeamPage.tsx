import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'
import { normalizeApiError } from '../../shared/api/errors'
import {
  CATEGORY_LABELS,
  ROLE_COLOURS,
  ROLE_EMOJIS,
  createTenantRole,
  deleteTenantRole,
  listPermissionsByCategory,
  listTenantRoles,
  replaceRolePermissions,
  updateCustomPermissionGrants,
  updateTenantRole,
  type PermissionCategoryGroup,
  type PermissionDto,
  type TenantRoleDto,
} from '../../shared/api/tenantRoles'
import { listTenantUsers, updateTenantUserRole, type TenantUser } from '../../shared/api/userTenant'
import { usePermission } from '../../shared/hooks/usePermission'
import { HistoryBackButton } from '../../shared/components/navigation/HistoryBackButton'
import { RoleProfileEditor } from '../../shared/roleProfiles/RoleProfileEditor'
import { useAuthStore } from '../../shared/stores/authStore'
import { emptyRoleProfile, type RoleProfile } from '../../shared/types/roleProfiles'

type TabId = 'roles' | 'staff'

interface ToastState {
  type: 'success' | 'error'
  message: string
}

interface RoleDraft {
  name: string
  description: string
  emoji: string
  colour: string
  permissionCodes: string[]
  customPermissionGrants: Record<string, string[]>
  roleProfile: RoleProfile
}

function emptyDraft(): RoleDraft {
  return {
    name: '',
    description: '',
    emoji: '🎯',
    colour: ROLE_COLOURS[0],
    permissionCodes: [],
    customPermissionGrants: {},
    roleProfile: emptyRoleProfile(),
  }
}

function roleToDraft(role: TenantRoleDto): RoleDraft {
  return {
    name: role.name,
    description: role.description ?? '',
    emoji: role.emoji ?? '🎯',
    colour: role.colour ?? ROLE_COLOURS[0],
    permissionCodes: role.permissions.map((p) => p.code),
    customPermissionGrants: Object.fromEntries(
      role.permissions
        .filter((permission) => permission.tenantDefined)
        .map((permission) => [permission.code, [...(permission.grantsPlatformCodes ?? [])]]),
    ),
    roleProfile: role.roleProfile,
  }
}

function ToastBanner({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) {
    return null
  }
  return (
    <div
      className={
        toast.type === 'success'
          ? 'mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800'
          : 'mb-4 rounded-lg border border-red-50 bg-red-50 px-4 py-3 text-sm text-red-800'
      }
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <span>{toast.message}</span>
        <button type="button" className="text-xs underline" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

function RoleEditor({
  draft,
  systemPermissionGroups,
  permissionIndex,
  readOnly,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: RoleDraft
  systemPermissionGroups: PermissionCategoryGroup[]
  permissionIndex: Record<string, PermissionDto>
  readOnly: boolean
  saving: boolean
  onChange: (changes: Partial<RoleDraft>) => void
  onSave: () => void
  onCancel?: () => void
}) {
  const selectedCustomPermissions = draft.permissionCodes
    .map((code) => permissionIndex[code])
    .filter((permission): permission is PermissionDto => Boolean(permission?.tenantDefined))

  function togglePermission(code: string) {
    if (readOnly) {
      return
    }
    const permission = permissionIndex[code]
    const checked = draft.permissionCodes.includes(code)
    const nextCodes = checked
      ? draft.permissionCodes.filter((current) => current !== code)
      : [...draft.permissionCodes, code]
    const nextCustomPermissionGrants = { ...draft.customPermissionGrants }

    if (permission?.tenantDefined) {
      if (checked) {
        delete nextCustomPermissionGrants[code]
      } else {
        nextCustomPermissionGrants[code] = [...(permission.grantsPlatformCodes ?? [])]
      }
    }

    onChange({
      permissionCodes: nextCodes,
      customPermissionGrants: nextCustomPermissionGrants,
    })
  }

  function toggleCustomGrant(permissionCode: string, grantCode: string) {
    if (readOnly) {
      return
    }
    const current = draft.customPermissionGrants[permissionCode] ?? []
    const next = current.includes(grantCode)
      ? current.filter((code) => code !== grantCode)
      : [...current, grantCode]
    onChange({
      customPermissionGrants: {
        ...draft.customPermissionGrants,
        [permissionCode]: next,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Name</span>
          <input
            className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
            value={draft.name}
            disabled={readOnly}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Description</span>
          <input
            className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
            value={draft.description}
            disabled={readOnly}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </label>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-neutral-700">Emoji</span>
        <div className="flex flex-wrap gap-2">
          {ROLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={readOnly}
              className={
                draft.emoji === emoji
                  ? 'rounded-lg border-2 border-[var(--color-brand-700)] px-2 py-1 text-lg'
                  : 'rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-lg'
              }
              onClick={() => onChange({ emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-neutral-700">Colour</span>
        <div className="flex flex-wrap gap-2">
          {ROLE_COLOURS.map((colour) => (
            <button
              key={colour}
              type="button"
              disabled={readOnly}
              aria-label={`Colour ${colour}`}
              className={
                draft.colour === colour
                  ? 'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-[var(--color-brand-700)]'
                  : 'h-8 w-8 rounded-full'
              }
              style={{ backgroundColor: colour }}
              onClick={() => onChange({ colour })}
            />
          ))}
        </div>
      </div>

      <RoleProfileEditor
        profile={draft.roleProfile}
        readOnly={readOnly}
        onChange={(roleProfile) => onChange({ roleProfile })}
      />

      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-slate-50 p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">System permissions</h3>
          <p className="mb-0 text-xs text-slate-600">
            These drive menus, API guards, and built-in platform access.
          </p>
        </div>
        {systemPermissionGroups.map((group) => (
          <section key={group.category} className="rounded-xl border border-[var(--border-subtle)] bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold">{CATEGORY_LABELS[group.category] ?? group.category}</h3>
            <ul className="space-y-2">
              {group.permissions.map((perm) => {
                const checked = draft.permissionCodes.includes(perm.code)
                return (
                  <li key={perm.code}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={() => togglePermission(perm.code)}
                      />
                      <span>
                        <span className="font-medium">{perm.label}</span>
                        {perm.description ? (
                          <span className="mt-0.5 block text-xs text-neutral-500">{perm.description}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {selectedCustomPermissions.length > 0 ? (
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <h3 className="text-sm font-semibold text-violet-950">Tenant-defined capabilities</h3>
          <p className="mt-1 text-xs text-violet-800">
            Use this section to tell the platform what each custom capability should unlock.
          </p>
          <div className="mt-4 space-y-4">
            {selectedCustomPermissions.map((permission) => (
              <div key={permission.code} className="rounded-lg border border-violet-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-semibold text-slate-900">{permission.label}</p>
                    <p className="m-0 mt-1 font-mono text-xs text-violet-700">{permission.code}</p>
                    {permission.description ? (
                      <p className="m-0 mt-2 text-xs text-slate-600">{permission.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-violet-800 underline"
                    disabled={readOnly}
                    onClick={() => togglePermission(permission.code)}
                  >
                    Remove from role
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Grant these system permissions too
                  </p>
                  <p className="m-0 mt-1 text-xs text-slate-500">
                    This keeps the CEO-friendly custom label while wiring it to real app access.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {systemPermissionGroups.map((group) => (
                    <div key={`${permission.code}-${group.category}`}>
                      <p className="mb-2 text-xs font-semibold text-slate-700">
                        {CATEGORY_LABELS[group.category] ?? group.category}
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {group.permissions.map((grant) => {
                          const current = draft.customPermissionGrants[permission.code] ?? []
                          const checked = current.includes(grant.code)
                          return (
                            <label
                              key={`${permission.code}-${grant.code}`}
                              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={readOnly}
                                onChange={() => toggleCustomGrant(permission.code, grant.code)}
                              />
                              <span>
                                <span className="font-medium">{grant.label}</span>
                                {grant.description ? (
                                  <span className="mt-0.5 block text-xs text-neutral-500">{grant.description}</span>
                                ) : null}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={saving || !draft.name.trim()}
            onClick={onSave}
          >
            {saving ? 'Saving…' : 'Save role'}
          </button>
          {onCancel ? (
            <button
              type="button"
              className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function MyTeamPage() {
  const canManage = usePermission('ROLE_MANAGE')
  const tenantId = useAuthStore((s) => s.tenantId)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<TabId>('roles')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft())
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const rolesQuery = useQuery({
    queryKey: ['tenant-roles', tenantId],
    queryFn: listTenantRoles,
    enabled: canManage,
  })

  const permissionsQuery = useQuery({
    queryKey: ['tenant-permissions-by-category'],
    queryFn: listPermissionsByCategory,
    enabled: canManage,
  })

  const usersQuery = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => listTenantUsers(tenantId, { page: 0, size: 100, query: '' }),
    enabled: canManage && tab === 'staff',
  })

  const roles = rolesQuery.data ?? []
  const permissionGroups = permissionsQuery.data ?? []
  const users = usersQuery.data?.rows ?? []

  const permissionIndex = useMemo(
    () =>
      Object.fromEntries(
        permissionGroups.flatMap((group) => group.permissions.map((permission) => [permission.code, permission])),
      ) as Record<string, PermissionDto>,
    [permissionGroups],
  )

  const systemPermissionGroups = useMemo(
    () =>
      permissionGroups
        .map((group) => ({
          ...group,
          permissions: group.permissions.filter((permission) => !permission.tenantDefined),
        }))
        .filter((group) => group.permissions.length > 0),
    [permissionGroups],
  )

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  )

  useEffect(() => {
    if (creating) {
      return
    }
    if (selectedRole) {
      setDraft(roleToDraft(selectedRole))
    }
  }, [creating, selectedRole])

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0 && !creating) {
      setSelectedRoleId(roles[0].id)
    }
  }, [roles, selectedRoleId, creating])

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        emoji: draft.emoji,
        colour: draft.colour,
        permissionCodes: draft.permissionCodes,
        roleProfile: draft.roleProfile,
      }

      const selectedCustomCodes = draft.permissionCodes.filter((code) => permissionIndex[code]?.tenantDefined)

      if (creating) {
        const created = await createTenantRole(payload)
        await Promise.all(
          selectedCustomCodes.map((code) =>
            updateCustomPermissionGrants(code, draft.customPermissionGrants[code] ?? []),
          ),
        )
        return created
      }

      if (!selectedRoleId) {
        throw new Error('No role selected')
      }

      const updated = await updateTenantRole(selectedRoleId, payload)
      await replaceRolePermissions(selectedRoleId, draft.permissionCodes)
      await Promise.all(
        selectedCustomCodes.map((code) =>
          updateCustomPermissionGrants(code, draft.customPermissionGrants[code] ?? []),
        ),
      )
      return updated
    },
    onSuccess: async (role) => {
      setToast({ type: 'success', message: creating ? 'Role created' : 'Role updated' })
      setCreating(false)
      setSelectedRoleId(role.id)
      await queryClient.invalidateQueries({ queryKey: ['tenant-roles', tenantId] })
      await queryClient.invalidateQueries({ queryKey: ['tenant-permissions-by-category'] })
    },
    onError: (error) => setToast({ type: 'error', message: normalizeApiError(error).message }),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => deleteTenantRole(roleId),
    onSuccess: async () => {
      setToast({ type: 'success', message: 'Role deleted' })
      setSelectedRoleId(null)
      await queryClient.invalidateQueries({ queryKey: ['tenant-roles', tenantId] })
    },
    onError: (error) => setToast({ type: 'error', message: normalizeApiError(error).message }),
  })

  const duplicateRoleMutation = useMutation({
    mutationFn: async (role: TenantRoleDto) =>
      createTenantRole({
        name: `${role.name} (copy)`,
        description: role.description,
        emoji: role.emoji ?? '🎯',
        colour: role.colour ?? ROLE_COLOURS[0],
        permissionCodes: role.permissions.map((permission) => permission.code),
        roleProfile: role.roleProfile,
      }),
    onSuccess: async (role) => {
      setToast({ type: 'success', message: 'Role duplicated' })
      setCreating(false)
      setSelectedRoleId(role.id)
      await queryClient.invalidateQueries({ queryKey: ['tenant-roles', tenantId] })
    },
    onError: (error) => setToast({ type: 'error', message: normalizeApiError(error).message }),
  })

  const roleChangeMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      updateTenantUserRole(tenantId, userId, { roleId }),
    onSuccess: async () => {
      setToast({ type: 'success', message: 'Staff role updated' })
      await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
    onError: (error) => setToast({ type: 'error', message: normalizeApiError(error).message }),
    onSettled: () => setUpdatingUserId(null),
  })

  function startCreate() {
    setCreating(true)
    setSelectedRoleId(null)
    setDraft(emptyDraft())
  }

  function onStaffRoleChange(user: TenantUser, roleId: string) {
    setUpdatingUserId(user.id)
    roleChangeMutation.mutate({ userId: user.id, roleId })
  }

  const staffColumns = useMemo((): DataTableColumn<TenantUser>[] => [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'roleId',
      header: 'Role',
      sortable: false,
      render: (_v, user) => (
        <select
          className="rounded-md border border-[var(--border-default)] px-2 py-1"
          value={user.roleId ?? ''}
          disabled={roleChangeMutation.isPending && updatingUserId === user.id}
          onChange={e => onStaffRoleChange(user, e.target.value)}
          aria-label={`Role for ${user.name}`}
        >
          {roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.emoji} {role.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: v => String(v ?? 'active'),
    },
  ], [roleChangeMutation.isPending, roles, updatingUserId])

  if (!canManage) {
    return <p className="text-sm text-neutral-600">You do not have permission to manage your team.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <HistoryBackButton
            label="Back to settings"
            fallbackTo="/settings"
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm text-[var(--color-brand-700)] underline"
          />
          <h1 className="mt-2 text-2xl font-semibold">My team</h1>
          <p className="text-sm text-neutral-600">Manage roles, permissions, and staff assignments.</p>
        </div>
      </header>

      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <div className="flex gap-2 border-b border-[var(--border-subtle)]">
        <button
          type="button"
          className={
            tab === 'roles'
              ? 'border-b-2 border-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-[var(--color-brand-700)]'
              : 'px-4 py-2 text-sm text-neutral-600'
          }
          onClick={() => setTab('roles')}
        >
          Roles
        </button>
        <button
          type="button"
          className={
            tab === 'staff'
              ? 'border-b-2 border-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-[var(--color-brand-700)]'
              : 'px-4 py-2 text-sm text-neutral-600'
          }
          onClick={() => setTab('staff')}
        >
          Staff
        </button>
      </div>

      {tab === 'roles' ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2">
            <button
              type="button"
              className="mb-2 w-full rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-2 text-sm font-medium"
              onClick={startCreate}
            >
              + New role
            </button>
            {rolesQuery.isLoading ? <p className="text-sm text-neutral-500">Loading roles…</p> : null}
            {roles.map((role) => (
              <div
                key={role.id}
                className={
                  selectedRoleId === role.id && !creating
                    ? 'rounded-lg border border-[var(--color-brand-700)] bg-white p-3'
                    : 'rounded-lg border border-[var(--border-subtle)] bg-white p-3'
                }
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setCreating(false)
                    setSelectedRoleId(role.id)
                  }}
                >
                  <span className="mr-2">{role.emoji}</span>
                  <span className="font-medium">{role.name}</span>
                  <span className="mt-1 block text-xs text-neutral-500">{role.userCount} staff</span>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs text-[var(--color-brand-700)] underline"
                    onClick={() => {
                      setCreating(false)
                      setSelectedRoleId(role.id)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--color-brand-700)] underline"
                    disabled={duplicateRoleMutation.isPending}
                    onClick={() => duplicateRoleMutation.mutate(role)}
                  >
                    Duplicate
                  </button>
                  {!role.isOwner && !role.isSystem ? (
                    <button
                      type="button"
                      className="text-xs text-red-600 underline"
                      disabled={deleteRoleMutation.isPending || role.userCount > 0}
                      onClick={() => {
                        if (window.confirm(`Delete role "${role.name}"?`)) {
                          deleteRoleMutation.mutate(role.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </aside>

          <section className="min-w-0">
            {creating || selectedRole ? (
              <RoleEditor
                draft={draft}
                systemPermissionGroups={systemPermissionGroups}
                permissionIndex={permissionIndex}
                readOnly={!!selectedRole?.isOwner}
                saving={saveRoleMutation.isPending}
                onChange={(changes) => setDraft((prev) => ({ ...prev, ...changes }))}
                onSave={() => saveRoleMutation.mutate()}
                onCancel={creating ? () => setCreating(false) : undefined}
              />
            ) : (
              <p className="text-sm text-neutral-500">Select a role to edit or create a new one.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white p-4">
          <DataTable
            columns={staffColumns}
            rows={users}
            isLoading={usersQuery.isLoading}
            getRowKey={row => row.id}
            showSearch={false}
            emptyStateLabel="No staff members found"
            noResultsLabel="No staff members found"
          />
        </div>
      )}
    </div>
  )
}
