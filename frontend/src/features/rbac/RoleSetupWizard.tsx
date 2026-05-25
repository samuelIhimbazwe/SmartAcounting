import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  fetchRoleSetupRecommendation,
  saveTenantRoleSetup,
  templateToSetupItem,
  type RoleTemplateDto,
} from '../../shared/api/tenantRoles'

export function RoleSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const templatesQuery = useQuery({
    queryKey: ['role-setup-templates'],
    queryFn: () => fetchRoleSetupRecommendation('SMALL', 'RETAIL'),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const templates = templatesQuery.data ?? []
      const items = templates
        .filter((t) => selected.has(t.name))
        .map((t) => templateToSetupItem(t))
      if (items.length === 0) {
        throw new Error('Select at least one role')
      }
      return saveTenantRoleSetup({ size: 'SMALL', type: 'RETAIL', roles: items })
    },
    onSuccess: () => onComplete(),
  })

  const templates = templatesQuery.data ?? []

  function toggleTemplate(template: RoleTemplateDto) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(template.name)) {
        next.delete(template.name)
      } else {
        next.add(template.name)
      }
      return next
    })
  }

  if (templatesQuery.isLoading) {
    return <p className="text-sm text-neutral-500">Loading recommended roles…</p>
  }

  if (templatesQuery.isError) {
    return <p className="text-sm text-red-600">Could not load role templates. Try again later.</p>
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-white p-4">
      <p className="text-sm text-neutral-600">Choose roles for a small retail business (you can customize later).</p>
      <ul className="space-y-2">
        {templates.map((template) => (
          <li key={template.name}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
              <input
                type="checkbox"
                checked={selected.has(template.name)}
                onChange={() => toggleTemplate(template)}
              />
              <span>
                <span className="font-medium">
                  {template.emoji} {template.name}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">{template.description}</span>
                <span className="mt-1 block text-xs text-neutral-400">
                  {template.alwaysPermissions.length} core permissions
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={saveMutation.isPending || selected.size === 0}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save role setup'}
      </button>
      {saveMutation.isError ? (
        <p className="text-sm text-red-600">{(saveMutation.error as Error).message}</p>
      ) : null}
    </div>
  )
}
