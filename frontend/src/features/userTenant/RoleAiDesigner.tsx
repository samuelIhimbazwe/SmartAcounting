import { useMutation, useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeApiError } from '../../shared/api/errors'
import {
  CATEGORY_LABELS,
  createTenantRole,
  designRoleFromPrompt,
  listPermissionsByCategory,
  updateCustomPermissionGrants,
  type RoleDesignSuggestionDto,
  type TenantRoleDto,
} from '../../shared/api/tenantRoles'
import { RoleProfileEditor } from '../../shared/roleProfiles/RoleProfileEditor'
import { RoleProfileSummary } from '../../shared/roleProfiles/RoleProfileSummary'
import type { RoleProfile } from '../../shared/types/roleProfiles'

const EXAMPLE_PROMPTS = [
  'Junior store manager — can run POS and view stock but cannot approve procurement or edit finances',
  'Night shift cashier — checkout and till only, no reports or HR',
  'Finance assistant — read invoices and export reports, no payroll approval or period close',
]

interface RoleAiDesignerProps {
  tenantRoles: TenantRoleDto[]
  onRoleCreated: (role: TenantRoleDto) => void
  onSelectExistingRole?: (roleId: string) => void
  compact?: boolean
}

export function RoleAiDesigner({
  tenantRoles,
  onRoleCreated,
  onSelectExistingRole,
  compact = false,
}: RoleAiDesignerProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [baseRoleId, setBaseRoleId] = useState('')
  const [suggestion, setSuggestion] = useState<RoleDesignSuggestionDto | null>(null)
  const [customGrantSelections, setCustomGrantSelections] = useState<Record<string, string[]>>({})
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)

  const permissionsQuery = useQuery({
    queryKey: ['tenant-permissions-by-category'],
    queryFn: listPermissionsByCategory,
  })

  const systemPermissionGroups = useMemo(
    () =>
      (permissionsQuery.data ?? [])
        .map((group) => ({
          ...group,
          permissions: group.permissions.filter((permission) => !permission.tenantDefined),
        }))
        .filter((group) => group.permissions.length > 0),
    [permissionsQuery.data],
  )

  const designMutation = useMutation({
    mutationFn: () =>
      designRoleFromPrompt(prompt.trim(), baseRoleId || null),
    onSuccess: (result) => {
      setSuggestion(result)
      setShowProfileEditor(false)
      setCustomGrantSelections(
        Object.fromEntries(
          result.customPermissions.map((custom) => [custom.code, [...(custom.optionalGrants ?? [])]]),
        ),
      )
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!suggestion) {
        throw new Error('No suggestion')
      }
      const s = suggestion.suggested
      await Promise.all(
        suggestion.customPermissions.map((custom) =>
          updateCustomPermissionGrants(custom.code, customGrantSelections[custom.code] ?? []),
        ),
      )
      return createTenantRole({
        name: s.name,
        description: s.description,
        emoji: s.emoji,
        colour: s.colour,
        permissionCodes: [
          ...s.permissionCodes,
          ...(s.customPermissionCodes ?? []),
        ],
        roleProfile: s.roleProfile,
      })
    },
    onSuccess: (role) => {
      onRoleCreated(role)
      setSuggestion(null)
      setCustomGrantSelections({})
      setShowRecommendedOnly(false)
      setShowProfileEditor(false)
      setPrompt('')
      setBaseRoleId('')
    },
  })

  const permissionLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of permissionsQuery.data ?? []) {
      for (const perm of group.permissions) {
        map.set(perm.code, perm.label)
      }
    }
    return map
  }, [permissionsQuery.data])

  const groupedSuggested = useMemo(() => {
    if (!suggestion) {
      return []
    }
    const byCategory = new Map<string, string[]>()
    const allCodes = [
      ...suggestion.suggested.permissionCodes,
      ...(suggestion.suggested.customPermissionCodes ?? []),
    ]
    const customLabels = new Map(
      (suggestion.customPermissions ?? []).map((c) => [c.code, c.label]),
    )
    for (const code of allCodes) {
      const cat =
        permissionsQuery.data?.find((g) => g.permissions.some((p) => p.code === code))?.category
        ?? (code.startsWith('CUSTOM_') ? 'CUSTOM' : 'OTHER')
      const list = byCategory.get(cat) ?? []
      list.push(code)
      byCategory.set(cat, list)
    }
    return [...byCategory.entries()].map(([category, codes]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      codes: codes.map((code) => ({
        code,
        label: customLabels.get(code) ?? permissionLabels.get(code) ?? code,
      })),
    }))
  }, [suggestion, permissionsQuery.data, permissionLabels])

  const hasAnyRecommendedGrants = useMemo(
    () => Boolean(suggestion?.customPermissions.some((custom) => (custom.optionalGrants ?? []).length > 0)),
    [suggestion],
  )

  function toggleCustomGrant(customCode: string, grantCode: string) {
    const current = customGrantSelections[customCode] ?? []
    const next = current.includes(grantCode)
      ? current.filter((code) => code !== grantCode)
      : [...current, grantCode]
    setCustomGrantSelections((prev) => ({ ...prev, [customCode]: next }))
  }

  function reapplyAllRecommendedGrants() {
    if (!suggestion) {
      return
    }
    setCustomGrantSelections((prev) => {
      const next = { ...prev }
      for (const custom of suggestion.customPermissions) {
        const current = next[custom.code] ?? []
        const merged = new Set([...current, ...(custom.optionalGrants ?? [])])
        next[custom.code] = [...merged]
      }
      return next
    })
  }

  function matchTypeLabel(type: string) {
    switch (type) {
      case 'EXACT_DUPLICATE':
        return t('management.ai.matchDuplicate')
      case 'VARIANT_OF_EXISTING':
        return t('management.ai.matchVariant')
      case 'NEAREST_EXISTING':
        return t('management.ai.matchNearest')
      default:
        return t('management.ai.matchNew')
    }
  }

  function updateSuggestedRoleProfile(roleProfile: RoleProfile) {
    setSuggestion((current) =>
      current
        ? {
            ...current,
            suggested: {
              ...current.suggested,
              roleProfile,
            },
          }
        : current,
    )
  }

  return (
    <div className={compact ? 'space-y-3' : 'rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-indigo-50/80 to-white p-4 shadow-[var(--shadow-card)]'}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-base font-semibold text-neutral-900">{t('management.ai.title')}</h3>
          <p className="m-0 mt-1 text-sm text-neutral-600">{t('management.ai.subtitle')}</p>
        </div>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-neutral-800">{t('management.ai.promptLabel')}</span>
        <textarea
          className="mt-1 min-h-[88px] w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('management.ai.promptPlaceholder')}
        />
      </label>

      {tenantRoles.length > 0 ? (
        <label className="block text-sm">
          <span className="text-neutral-700">{t('management.ai.baseRoleLabel')}</span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm"
            value={baseRoleId}
            onChange={(e) => setBaseRoleId(e.target.value)}
          >
            <option value="">{t('management.ai.baseRoleAuto')}</option>
            {tenantRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.emoji} {role.name} ({role.permissions.length} permissions)
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!compact ? (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-800 hover:bg-indigo-50"
              onClick={() => setPrompt(example)}
            >
              {example.length > 52 ? `${example.slice(0, 52)}…` : example}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={!prompt.trim() || designMutation.isPending}
        onClick={() => designMutation.mutate()}
      >
        {designMutation.isPending ? t('management.ai.generating') : t('management.ai.generate')}
      </button>

      {designMutation.isError ? (
        <p className="text-sm text-rose-700" role="alert">
          {normalizeApiError(designMutation.error).message}
        </p>
      ) : null}

      {suggestion ? (
        <div className="space-y-3 rounded-xl border border-indigo-100 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
              {matchTypeLabel(suggestion.matchType)}
            </span>
            {suggestion.aiEnhanced ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800">
                {t('management.ai.enhanced')}
              </span>
            ) : null}
            {!suggestion.fullySupported ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-900">
                {t('management.ai.partial')}
              </span>
            ) : null}
          </div>

          <p className="m-0 text-sm font-medium text-neutral-900">{suggestion.summary}</p>
          <p className="m-0 text-sm text-neutral-600">{suggestion.reasoning}</p>

          {suggestion.unsupportedNotes.length > 0 ? (
            <ul className="m-0 list-disc pl-5 text-xs text-amber-800">
              {suggestion.unsupportedNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <div className="rounded-lg border border-[var(--border-subtle)] p-3">
            <p className="m-0 text-sm font-semibold">
              {suggestion.suggested.emoji} {suggestion.suggested.name}
            </p>
            {suggestion.basedOnRoleName ? (
              <p className="m-0 mt-1 text-xs text-neutral-500">
                {t('management.ai.basedOn', { role: suggestion.basedOnRoleName })}
              </p>
            ) : null}
            <p className="m-0 mt-2 text-xs text-neutral-600">{suggestion.suggested.description}</p>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-600">Experience profile</p>
              <button
                type="button"
                className="text-xs font-medium text-indigo-700 underline"
                onClick={() => setShowProfileEditor((current) => !current)}
              >
                {showProfileEditor ? 'Hide experience settings' : 'Adjust experience'}
              </button>
            </div>
            <RoleProfileSummary profile={suggestion.suggested.roleProfile} className="border border-white bg-white p-3 rounded-lg" />
            {showProfileEditor ? (
              <RoleProfileEditor
                profile={suggestion.suggested.roleProfile}
                onChange={updateSuggestedRoleProfile}
                title="Suggested role experience"
                description="Review the dashboard pack, menus, workflows, landing page, and UI switches before creating the role."
              />
            ) : null}
          </div>

          {suggestion.customPermissions.length > 0 ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-violet-900">
                    {t('management.ai.customPermissionsTitle')}
                  </p>
                  <p className="m-0 mt-1 text-xs text-violet-800">{t('management.ai.customPermissionsHint')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-900 disabled:opacity-50"
                    disabled={!hasAnyRecommendedGrants}
                    onClick={reapplyAllRecommendedGrants}
                  >
                    {t('management.ai.reapplySuggested')}
                  </button>
                  <label className="flex items-center gap-2 text-xs font-medium text-violet-900">
                    <input
                      type="checkbox"
                      checked={showRecommendedOnly}
                      onChange={() => setShowRecommendedOnly((prev) => !prev)}
                    />
                    {t('management.ai.showRecommendedOnly')}
                  </label>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {suggestion.customPermissions.map((custom) => {
                  const visibleGroups = systemPermissionGroups
                    .map((group) => ({
                      ...group,
                      permissions: showRecommendedOnly
                        ? group.permissions.filter((permission) =>
                            (custom.optionalGrants ?? []).includes(permission.code),
                          )
                        : group.permissions,
                    }))
                    .filter((group) => group.permissions.length > 0)

                  return (
                    <div key={custom.code} className="rounded-lg border border-violet-200 bg-white p-3">
                      <p className="m-0 text-sm font-semibold text-violet-950">
                        {custom.label}{' '}
                        <span className="font-mono text-xs text-violet-700">({custom.code})</span>
                      </p>
                      {custom.description ? (
                        <p className="m-0 mt-1 text-xs text-slate-600">{custom.description}</p>
                      ) : null}
                      <p className="m-0 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t('management.ai.customGrantsTitle')}
                      </p>
                      <p className="m-0 mt-1 text-xs text-slate-500">
                        {t('management.ai.customGrantsHint')}
                      </p>
                      <div className="mt-3 space-y-3">
                        {visibleGroups.length === 0 ? (
                          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            {t('management.ai.noRecommendedGrants')}
                          </p>
                        ) : null}
                        {visibleGroups.map((group) => (
                          <div key={`${custom.code}-${group.category}`}>
                            <p className="mb-2 text-xs font-semibold text-slate-700">
                              {CATEGORY_LABELS[group.category] ?? group.category}
                            </p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {group.permissions.map((permission) => {
                                const checked = (customGrantSelections[custom.code] ?? []).includes(permission.code)
                                const recommended = (custom.optionalGrants ?? []).includes(permission.code)
                                return (
                                  <label
                                    key={`${custom.code}-${permission.code}`}
                                    className={
                                      recommended
                                        ? 'flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm'
                                        : 'flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm'
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleCustomGrant(custom.code, permission.code)}
                                    />
                                    <span>
                                      <span className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium text-slate-800">{permission.label}</span>
                                        {recommended ? (
                                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-900">
                                            {t('management.ai.recommendedBadge')}
                                          </span>
                                        ) : null}
                                      </span>
                                      {permission.description ? (
                                        <span className="mt-0.5 block text-xs text-slate-500">
                                          {permission.description}
                                        </span>
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
                  )
                })}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('management.ai.permissions', {
                count:
                  suggestion.suggested.permissionCodes.length +
                  (suggestion.suggested.customPermissionCodes?.length ?? 0),
              })}
            </p>
            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
              {groupedSuggested.map((group) => (
                <div key={group.category}>
                  <p className="m-0 text-xs font-medium text-neutral-700">{group.label}</p>
                  <ul className="m-0 mt-1 flex flex-wrap gap-1">
                    {group.codes.map((entry) => (
                      <li
                        key={entry.code}
                        className={
                          entry.code.startsWith('CUSTOM_')
                            ? 'rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-900'
                            : 'rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700'
                        }
                        title={entry.code}
                      >
                        {entry.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {suggestion.similarRoles.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t('management.ai.similarRoles')}
              </p>
              <ul className="m-0 space-y-2 p-0">
                {suggestion.similarRoles.map((similar) => (
                  <li
                    key={similar.roleId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                  >
                    <span>
                      {similar.emoji} {similar.name}{' '}
                      <span className="text-xs text-neutral-500">({similar.matchPercent}% {similar.reason})</span>
                    </span>
                    {onSelectExistingRole ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-indigo-700 underline"
                        onClick={() => onSelectExistingRole(similar.roleId)}
                      >
                        {t('management.ai.useExisting')}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {suggestion.matchType !== 'EXACT_DUPLICATE' ? (
              <button
                type="button"
                className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? t('management.ai.creating') : t('management.ai.createRole')}
              </button>
            ) : (
              <p className="text-sm text-neutral-600">{t('management.ai.duplicateHint')}</p>
            )}
            <button
              type="button"
              className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm"
              onClick={() => {
                setSuggestion(null)
                setCustomGrantSelections({})
                setShowRecommendedOnly(false)
                setShowProfileEditor(false)
              }}
            >
              {t('management.ai.discard')}
            </button>
          </div>

          {createMutation.isError ? (
            <p className="text-sm text-rose-700">{normalizeApiError(createMutation.error).message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
