import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { Link } from 'react-router-dom'

import { normalizeApiError } from '../../shared/api/errors'

import { DataTable, type DataTableColumn } from '../../shared/components/ui/DataTable'

import {

  inviteTenantUser,

  listTenantUsers,

  listTenants,

  updateTenantUserRole,

  type TenantUser,

} from '../../shared/api/userTenant'

import { listTenantRoles, type TenantRoleDto } from '../../shared/api/tenantRoles'

import { useAnyPermission } from '../../shared/hooks/usePermission'

import { useAuthStore } from '../../shared/stores/authStore'

import { roles, type Role } from '../../shared/types/roles'

import { RoleAiDesigner } from './RoleAiDesigner'



type TabId = 'members' | 'roles'



const CREATE_ROLE_OPTION = '__create_role__'



export function UserTenantManagementPage() {

  const { t } = useTranslation()

  const queryClient = useQueryClient()

  const tenantId = useAuthStore((state) => state.tenantId)

  const setTenantId = useAuthStore((state) => state.setTenantId)

  const canManageRoles = useAnyPermission(['ROLE_MANAGE', 'TENANT_CONFIG'])



  const [tab, setTab] = useState<TabId>('members')

  const [inviteEmail, setInviteEmail] = useState('')

  const [inviteRole, setInviteRole] = useState<Role>('ACCOUNTING')

  const [inviteRoleId, setInviteRoleId] = useState('')

  const [inviteError, setInviteError] = useState<string | null>(null)

  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [memberSearch, setMemberSearch] = useState('')

  const [page, setPage] = useState(0)

  const [size, setSize] = useState(10)

  const [roleUpdateSuccess, setRoleUpdateSuccess] = useState<string | null>(null)

  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null)

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const [roleCreatedBanner, setRoleCreatedBanner] = useState<string | null>(null)

  const inviteStatusRef = useRef<HTMLParagraphElement | null>(null)

  const roleStatusRef = useRef<HTMLParagraphElement | null>(null)



  const tenantsQuery = useQuery({

    queryKey: ['tenants'],

    queryFn: listTenants,

  })



  const tenantRolesQuery = useQuery({

    queryKey: ['tenant-roles', tenantId],

    queryFn: listTenantRoles,

    enabled: Boolean(tenantId) && canManageRoles,

  })

  const tenantRoles = tenantRolesQuery.data ?? []



  const usersQuery = useQuery({

    queryKey: ['tenant-users', tenantId, page, size, memberSearch],

    queryFn: () =>

      listTenantUsers(tenantId, {

        page,

        size,

        query: memberSearch,

      }),

  })



  const roleMutation = useMutation({

    mutationFn: ({ userId, role, roleId }: { userId: string; role?: Role; roleId?: string }) =>

      updateTenantUserRole(tenantId, userId, { role, roleId }),

    onSuccess: async () => {

      setRoleUpdateError(null)

      setRoleUpdateSuccess(t('management.roleUpdated'))

      await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId, page, size, memberSearch] })

    },

    onError: (error) => {

      setRoleUpdateSuccess(null)

      setRoleUpdateError(normalizeApiError(error).message)

    },

    onSettled: () => {

      setUpdatingUserId(null)

    },

  })



  const inviteMutation = useMutation({

    mutationFn: () =>

      inviteTenantUser(tenantId, {

        email: inviteEmail,

        ...(inviteRoleId ? { roleId: inviteRoleId } : { role: inviteRole }),

      }),

    onSuccess: async () => {

      setInviteSuccess(t('management.inviteSent'))

      setInviteError(null)

      setInviteEmail('')

      setPage(0)

      await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId, page, size, memberSearch] })

    },

    onError: (error) => {

      setInviteSuccess(null)

      setInviteError(normalizeApiError(error).message)

    },

  })



  const tenantOptions = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data])

  const members = usersQuery.data?.rows ?? []

  const totalMembers = usersQuery.data?.total ?? 0

  const totalPages = Math.max(1, Math.ceil(totalMembers / size))



  function onRoleCreated(role: TenantRoleDto) {

    void queryClient.invalidateQueries({ queryKey: ['tenant-roles', tenantId] })

    setInviteRoleId(role.id)

    setRoleCreatedBanner(t('management.roleCreatedBanner', { name: role.name }))

    setTab('members')

  }



  function onSelectExistingRole(roleId: string) {

    setInviteRoleId(roleId)

    setTab('members')

    setRoleCreatedBanner(t('management.existingRoleSelected'))

  }



  const memberColumns: DataTableColumn<TenantUser>[] = [

    { key: 'name', header: t('management.name') },

    { key: 'email', header: t('management.email') },

    {

      key: 'status',

      header: t('management.status'),

      render: (value) => String(value ?? 'active'),

    },

    {

      key: 'role',

      header: t('management.role'),

      render: (value, member) =>

        tenantRoles.length > 0 ? (

          <select

            className="rounded-md border border-[var(--border-default)] px-2 py-1"

            value={member.roleId ?? ''}

            onChange={(event) => {

              const next = event.target.value

              if (next === CREATE_ROLE_OPTION) {

                setTab('roles')

                return

              }

              onChangeTenantRole(member, next)

            }}

            disabled={roleMutation.isPending && updatingUserId === member.id}

            aria-label={t('management.roleSelectLabel', { name: member.name })}

          >

            {tenantRoles.map((tr) => (

              <option key={tr.id} value={tr.id}>

                {tr.emoji} {tr.name}

              </option>

            ))}

            {canManageRoles ? (

              <option value={CREATE_ROLE_OPTION}>{t('management.createCustomRole')}</option>

            ) : null}

          </select>

        ) : (

          <select

            className="rounded-md border border-[var(--border-default)] px-2 py-1"

            value={String(value)}

            onChange={(event) => onChangeRole(member, event.target.value as Role)}

            disabled={roleMutation.isPending && updatingUserId === member.id}

            aria-label={t('management.roleSelectLabel', { name: member.name })}

          >

            {roles.map((role) => (

              <option key={role} value={role}>

                {role}

              </option>

            ))}

          </select>

        ),

    },

  ]



  useEffect(() => {

    if (inviteError || inviteSuccess) {

      inviteStatusRef.current?.focus()

    }

  }, [inviteError, inviteSuccess])



  useEffect(() => {

    if (roleUpdateError || roleUpdateSuccess) {

      roleStatusRef.current?.focus()

    }

  }, [roleUpdateError, roleUpdateSuccess])



  function onSubmitInvite(event: FormEvent<HTMLFormElement>) {

    event.preventDefault()

    setInviteSuccess(null)

    if (!inviteEmail.includes('@')) {

      setInviteError(t('management.inviteEmailInvalid'))

      return

    }

    if (!inviteRoleId && tenantRoles.length > 0) {

      setInviteError(t('management.inviteRoleRequired'))

      return

    }

    setInviteError(null)

    inviteMutation.mutate()

  }



  function onChangeRole(user: TenantUser, role: Role) {

    setUpdatingUserId(user.id)

    setRoleUpdateSuccess(null)

    roleMutation.mutate({ userId: user.id, role })

  }



  function onChangeTenantRole(user: TenantUser, roleId: string) {

    setUpdatingUserId(user.id)

    setRoleUpdateSuccess(null)

    roleMutation.mutate({ userId: user.id, roleId })

  }



  function onChangeTenant(nextTenantId: string) {

    setTenantId(nextTenantId)

    setPage(0)

    setRoleUpdateSuccess(null)

    setRoleUpdateError(null)

    setInviteSuccess(null)

    setInviteError(null)

    setRoleCreatedBanner(null)

  }



  function onInviteRoleChange(value: string) {

    if (value === CREATE_ROLE_OPTION) {

      setTab('roles')

      return

    }

    const match = tenantRoles.find((tr) => tr.id === value)

    if (match) {

      setInviteRoleId(match.id)

    } else {

      setInviteRoleId('')

      setInviteRole(value as Role)

    }

  }



  return (

    <section className="mx-auto w-full max-w-5xl space-y-4">

      <header>

        <h2 className="m-0 font-[var(--font-display)] text-2xl font-semibold text-neutral-900">

          {t('management.title')}

        </h2>

        <p className="m-0 mt-1 text-sm text-neutral-600">{t('management.subtitleExtended')}</p>

        {canManageRoles ? (

          <p className="m-0 mt-2 text-sm">

            <Link to="/settings/roles" className="text-[var(--color-brand-700)] underline">

              {t('management.openFullRoleEditor')}

            </Link>

          </p>

        ) : null}

      </header>



      <div className="flex gap-2 border-b border-[var(--border-subtle)]">

        <button

          type="button"

          className={

            tab === 'members'

              ? 'border-b-2 border-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-[var(--color-brand-700)]'

              : 'px-4 py-2 text-sm text-neutral-600'

          }

          onClick={() => setTab('members')}

        >

          {t('management.tabMembers')}

        </button>

        {canManageRoles ? (

          <button

            type="button"

            className={

              tab === 'roles'

                ? 'border-b-2 border-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-[var(--color-brand-700)]'

                : 'px-4 py-2 text-sm text-neutral-600'

            }

            onClick={() => setTab('roles')}

          >

            {t('management.tabRolesAi')}

          </button>

        ) : null}

      </div>



      {roleCreatedBanner ? (

        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">

          {roleCreatedBanner}

        </p>

      ) : null}



      <article className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-card)]">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          <label className="block text-sm md:col-span-2">

            {t('management.tenant')}

            <select

              className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"

              value={tenantId}

              onChange={(event) => onChangeTenant(event.target.value)}

            >

              {tenantOptions.length === 0 && <option value={tenantId}>{tenantId}</option>}

              {tenantOptions.map((tenant) => (

                <option key={tenant.id} value={tenant.id}>

                  {tenant.name} ({tenant.id})

                </option>

              ))}

            </select>

          </label>

          <label className="block text-sm">

            {t('management.tenantId')}

            <input

              className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"

              value={tenantId}

              onChange={(event) => onChangeTenant(event.target.value)}

            />

          </label>

        </div>

        {tenantsQuery.isError && (

          <p className="m-0 mt-3 text-xs text-amber-700">{t('management.tenantsUnavailable')}</p>

        )}

      </article>



      {tab === 'roles' && canManageRoles ? (

        <>

          <RoleAiDesigner

            tenantRoles={tenantRoles}

            onRoleCreated={onRoleCreated}

            onSelectExistingRole={onSelectExistingRole}

          />



          <article className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-card)]">

            <h3 className="m-0 text-base font-semibold text-neutral-900">{t('management.rolesListTitle')}</h3>

            <p className="m-0 mt-1 text-sm text-neutral-600">{t('management.rolesListHint')}</p>

            {tenantRolesQuery.isLoading ? (

              <p className="mt-3 text-sm text-neutral-500">{t('management.loadingRoles')}</p>

            ) : (

              <ul className="mt-3 divide-y divide-[var(--border-subtle)]">

                {tenantRoles.map((role) => (

                  <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">

                    <span>

                      {role.emoji} <strong>{role.name}</strong>

                      {role.isOwner ? (

                        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Owner</span>

                      ) : null}

                      <span className="ml-2 text-neutral-500">

                        {t('management.roleMeta', {

                          permissions: role.permissions.length,

                          users: role.userCount,

                        })}

                      </span>

                    </span>

                    {!role.isOwner ? (

                      <button

                        type="button"

                        className="text-xs text-[var(--color-brand-700)] underline"

                        onClick={() => {

                          setInviteRoleId(role.id)

                          setTab('members')

                        }}

                      >

                        {t('management.useForInvite')}

                      </button>

                    ) : null}

                  </li>

                ))}

              </ul>

            )}

          </article>

        </>

      ) : null}



      {tab === 'members' ? (

        <>

          <article className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-card)]">

            <h3 className="m-0 text-base font-semibold text-neutral-900">{t('management.inviteTitle')}</h3>

            <p className="m-0 mt-1 text-sm text-neutral-600">{t('management.inviteHint')}</p>

            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmitInvite}>

              <label className="block text-sm md:col-span-2">

                {t('management.email')}

                <input

                  id="invite-email"

                  className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"

                  type="email"

                  value={inviteEmail}

                  onChange={(event) => setInviteEmail(event.target.value)}

                  placeholder="user@company.com"

                  autoComplete="email"

                  required

                  aria-invalid={Boolean(inviteError)}

                  aria-describedby={inviteError ? 'invite-status' : undefined}

                />

              </label>

              <label className="block text-sm">

                {t('management.role')}

                <select

                  id="invite-role"

                  className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"

                  value={inviteRoleId || inviteRole}

                  onChange={(event) => onInviteRoleChange(event.target.value)}

                >

                  {tenantRoles.length > 0

                    ? tenantRoles.map((tr) => (

                        <option key={tr.id} value={tr.id}>

                          {tr.emoji} {tr.name}

                        </option>

                      ))

                    : roles.map((role) => (

                        <option key={role} value={role}>

                          {role}

                        </option>

                      ))}

                  {canManageRoles ? (

                    <option value={CREATE_ROLE_OPTION}>{t('management.createCustomRole')}</option>

                  ) : null}

                </select>

              </label>

              <div className="md:col-span-3">

                <button

                  type="submit"

                  className="rounded-md bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"

                  disabled={inviteMutation.isPending}

                  aria-busy={inviteMutation.isPending}

                >

                  {inviteMutation.isPending ? t('management.sendingInvite') : t('management.sendInvite')}

                </button>

              </div>

            </form>

            {inviteError && (

              <p

                id="invite-status"

                ref={inviteStatusRef}

                className="m-0 mt-2 text-xs text-rose-700"

                role="alert"

                aria-live="assertive"

                tabIndex={-1}

              >

                {inviteError}

              </p>

            )}

            {inviteSuccess && (

              <p

                id="invite-status"

                ref={inviteStatusRef}

                className="m-0 mt-2 text-xs text-emerald-700"

                role="status"

                aria-live="polite"

                tabIndex={-1}

              >

                {inviteSuccess}

              </p>

            )}

          </article>



          <article className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-card)]">

            <h3 className="m-0 text-base font-semibold text-neutral-900">{t('management.membersTitle')}</h3>

            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

              <label className="block text-sm md:w-80">

                {t('management.search')}

                <input

                  className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2"

                  value={memberSearch}

                  onChange={(event) => {

                    setMemberSearch(event.target.value)

                    setPage(0)

                  }}

                  placeholder={t('management.searchPlaceholder')}

                />

              </label>

              <label className="block text-sm">

                {t('management.pageSize')}

                <select

                  className="mt-1 rounded-md border border-[var(--border-default)] px-3 py-2"

                  value={size}

                  onChange={(event) => {

                    setSize(Number(event.target.value))

                    setPage(0)

                  }}

                >

                  {[10, 20, 50].map((pageSize) => (

                    <option key={pageSize} value={pageSize}>

                      {pageSize}

                    </option>

                  ))}

                </select>

              </label>

            </div>

            {usersQuery.isLoading && (

              <p className="m-0 mt-3 text-sm text-neutral-500" role="status" aria-live="polite">

                {t('management.loadingMembers')}

              </p>

            )}

            {usersQuery.isError && (

              <p className="m-0 mt-3 text-sm text-amber-700" role="alert" aria-live="assertive">

                {t('management.membersUnavailable')}

              </p>

            )}

            {usersQuery.isFetching && !usersQuery.isLoading && (

              <p className="m-0 mt-3 text-xs text-neutral-500" role="status" aria-live="polite">

                {t('dashboard.refreshingBackground')}

              </p>

            )}

            {roleUpdateError && (

              <p

                ref={roleStatusRef}

                className="m-0 mt-3 text-xs text-rose-700"

                role="alert"

                aria-live="assertive"

                tabIndex={-1}

              >

                {roleUpdateError}

              </p>

            )}

            {roleUpdateSuccess && (

              <p

                ref={roleStatusRef}

                className="m-0 mt-3 text-xs text-emerald-700"

                role="status"

                aria-live="polite"

                tabIndex={-1}

              >

                {roleUpdateSuccess}

              </p>

            )}



            <div className="mt-3">

              <DataTable<TenantUser>

                columns={memberColumns}

                rows={members}

                showSearch={false}

                showPagination={false}

                tableAriaLabel={t('management.membersTableCaption', { tenantId })}

                emptyStateLabel={t('management.emptyMembers')}

                noResultsLabel={t('management.emptyMembers')}

                isLoading={usersQuery.isLoading}

                loadingLabel={t('management.loadingMembers')}

                skeletonRowCount={Math.min(size, 8)}

              />

            </div>



            <div className="mt-3 flex items-center justify-between text-sm text-neutral-600">

              <span>{t('management.showingCount', { count: members.length, total: totalMembers })}</span>

              <div className="flex items-center gap-2">

                <button

                  type="button"

                  className="rounded-md border border-[var(--border-default)] px-3 py-1 disabled:opacity-50"

                  onClick={() => setPage((value) => Math.max(0, value - 1))}

                  disabled={page === 0 || usersQuery.isFetching}

                >

                  {t('management.previous')}

                </button>

                <span>{t('management.pageLabel', { page: page + 1, totalPages })}</span>

                <button

                  type="button"

                  className="rounded-md border border-[var(--border-default)] px-3 py-1 disabled:opacity-50"

                  onClick={() => setPage((value) => value + 1)}

                  disabled={page + 1 >= totalPages || usersQuery.isFetching}

                >

                  {t('management.next')}

                </button>

              </div>

            </div>

          </article>

        </>

      ) : null}

    </section>

  )

}


