import {
  CAPABILITY_BUNDLE_OPTIONS,
  DASHBOARD_OPTIONS,
  LANDING_ROUTE_OPTIONS,
  LAYOUT_VARIANT_OPTIONS,
  NAV_ITEM_OPTIONS,
  UI_FLAG_OPTIONS,
  WORKFLOW_TEMPLATE_OPTIONS,
} from './catalog'
import { emptyRoleProfile, type RoleProfile } from '../types/roleProfiles'

interface RoleProfileEditorProps {
  profile: RoleProfile
  onChange: (profile: RoleProfile) => void
  readOnly?: boolean
  title?: string
  description?: string
  editedSource?: string
}

const NAV_OPTIONS_BY_GROUP = NAV_ITEM_OPTIONS.reduce<Record<string, typeof NAV_ITEM_OPTIONS>>((acc, item) => {
  acc[item.group] = [...(acc[item.group] ?? []), item]
  return acc
}, {})

const NAV_GROUP_LABELS: Record<string, string> = {
  'nav.groupOperations': 'Operations',
  'nav.groupFinance': 'Finance',
  'nav.groupCompliance': 'Compliance',
  'nav.groupSettings': 'Settings',
}

export function RoleProfileEditor({
  profile,
  onChange,
  readOnly = false,
  title = 'Role experience profile',
  description = 'Fine-tune the shell, dashboards, landing page, and workflow packs for this role.',
  editedSource = 'ADMIN_AUTHORED',
}: RoleProfileEditorProps) {
  function updateRoleProfile(changes: Partial<RoleProfile>) {
    onChange({
      ...profile,
      ...changes,
      recommendationSource: editedSource,
    })
  }

  function toggleProfileList(
    key: 'capabilityBundleIds' | 'dashboardIds' | 'navItemIds' | 'workflowTemplateIds',
    value: string,
  ) {
    if (readOnly) {
      return
    }
    const current = profile[key] as string[]
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    updateRoleProfile({ [key]: next } as Partial<RoleProfile>)
  }

  function toggleUiFlag(flagId: string) {
    if (readOnly) {
      return
    }
    updateRoleProfile({
      uiFlags: {
        ...profile.uiFlags,
        [flagId]: !profile.uiFlags[flagId],
      },
    })
  }

  function resetRoleProfile() {
    if (readOnly) {
      return
    }
    onChange(emptyRoleProfile())
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mb-0 text-xs text-slate-600">{description}</p>
        </div>
        {!readOnly ? (
          <button type="button" className="text-xs text-[var(--color-brand-700)] underline" onClick={resetRoleProfile}>
            Reset to inferred defaults
          </button>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Capability bundles</p>
        <div className="grid gap-2 md:grid-cols-2">
          {CAPABILITY_BUNDLE_OPTIONS.map((bundle) => {
            const checked = profile.capabilityBundleIds.includes(bundle.id)
            return (
              <label key={bundle.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => toggleProfileList('capabilityBundleIds', bundle.id)}
                />
                <span>
                  <span className="font-medium">{bundle.label}</span>
                  {bundle.description ? <span className="mt-0.5 block text-xs text-slate-500">{bundle.description}</span> : null}
                  <span className="mt-1 block font-mono text-[11px] text-slate-400">{bundle.id}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Dashboards</p>
          <div className="space-y-2">
            {DASHBOARD_OPTIONS.map((dashboard) => {
              const checked = profile.dashboardIds.includes(dashboard.id)
              return (
                <label key={dashboard.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => toggleProfileList('dashboardIds', dashboard.id)}
                  />
                  <span>
                    <span className="font-medium">{dashboard.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{dashboard.route}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Workflow packs</p>
          <div className="space-y-2">
            {WORKFLOW_TEMPLATE_OPTIONS.map((workflow) => {
              const checked = profile.workflowTemplateIds.includes(workflow.id)
              return (
                <label key={workflow.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => toggleProfileList('workflowTemplateIds', workflow.id)}
                  />
                  <span>
                    <span className="font-medium">{workflow.label}</span>
                    {workflow.description ? <span className="mt-0.5 block text-xs text-slate-500">{workflow.description}</span> : null}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Navigation packs</p>
        <div className="space-y-3">
          {Object.entries(NAV_OPTIONS_BY_GROUP).map(([group, items]) => (
            <div key={group} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">{NAV_GROUP_LABELS[group] ?? group}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map((item) => {
                  const checked = profile.navItemIds.includes(item.id)
                  return (
                    <label key={item.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={() => toggleProfileList('navItemIds', item.id)}
                      />
                      <span>
                        <span className="font-medium">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{item.route}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Landing page</span>
          <select
            className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
            value={profile.landingRoute ?? ''}
            disabled={readOnly}
            onChange={(e) => updateRoleProfile({ landingRoute: e.target.value || null })}
          >
            <option value="">Use inferred default</option>
            {LANDING_ROUTE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.description})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-neutral-700">Layout variant</span>
          <select
            className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
            value={profile.layoutVariant ?? ''}
            disabled={readOnly}
            onChange={(e) => updateRoleProfile({ layoutVariant: e.target.value || null })}
          >
            <option value="">Use inferred layout</option>
            {LAYOUT_VARIANT_OPTIONS.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">UI switches</p>
        <div className="grid gap-2 md:grid-cols-2">
          {UI_FLAG_OPTIONS.map((flag) => {
            const checked = Boolean(profile.uiFlags[flag.id])
            return (
              <label key={flag.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <input type="checkbox" checked={checked} disabled={readOnly} onChange={() => toggleUiFlag(flag.id)} />
                <span>
                  <span className="font-medium">{flag.label}</span>
                  {flag.description ? <span className="mt-0.5 block text-xs text-slate-500">{flag.description}</span> : null}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </section>
  )
}
