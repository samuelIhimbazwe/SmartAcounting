import {
  CAPABILITY_BUNDLE_OPTIONS,
  DASHBOARD_OPTIONS,
  LAYOUT_VARIANT_OPTIONS,
  NAV_ITEM_OPTIONS,
  UI_FLAG_OPTIONS,
  WORKFLOW_TEMPLATE_OPTIONS,
} from './catalog'
import { emptyRoleProfile, normalizeRoleProfile, type RoleProfile } from '../types/roleProfiles'

interface RoleProfileSummaryProps {
  profile?: RoleProfile | null
  className?: string
}

function lookup(ids: string[], options: Array<{ id: string; label: string }>): string[] {
  const map = new Map(options.map((option) => [option.id, option.label]))
  return ids.map((id) => map.get(id) ?? id)
}

function compactList(values: string[], emptyLabel: string): string {
  if (values.length === 0) {
    return emptyLabel
  }
  if (values.length <= 3) {
    return values.join(', ')
  }
  return `${values.slice(0, 3).join(', ')} +${values.length - 3}`
}

export function RoleProfileSummary({ profile, className }: RoleProfileSummaryProps) {
  const normalized = normalizeRoleProfile(profile ?? emptyRoleProfile())
  const activeFlags = UI_FLAG_OPTIONS.filter((flag) => normalized.uiFlags[flag.id]).map((flag) => flag.label)
  const layoutLabel = LAYOUT_VARIANT_OPTIONS.find((option) => option.id === normalized.layoutVariant)?.label ?? 'Inferred'
  const hasExplicitChoices =
    normalized.capabilityBundleIds.length > 0 ||
    normalized.dashboardIds.length > 0 ||
    normalized.navItemIds.length > 0 ||
    normalized.workflowTemplateIds.length > 0 ||
    normalized.landingRoute !== null ||
    normalized.layoutVariant !== null ||
    activeFlags.length > 0

  return (
    <div className={className ?? 'rounded-lg border border-slate-200 bg-slate-50 p-3'}>
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-600">Experience profile</p>
      {!hasExplicitChoices ? (
        <p className="m-0 mt-1 text-xs text-slate-500">Using inferred defaults from permissions and recommended bundles.</p>
      ) : (
        <div className="mt-2 space-y-1.5 text-xs text-slate-600">
          <p className="m-0">
            <strong>Bundles:</strong>{' '}
            {compactList(lookup(normalized.capabilityBundleIds, CAPABILITY_BUNDLE_OPTIONS), 'Inferred')}
          </p>
          <p className="m-0">
            <strong>Dashboards:</strong> {compactList(lookup(normalized.dashboardIds, DASHBOARD_OPTIONS), 'Inferred')}
          </p>
          <p className="m-0">
            <strong>Navigation:</strong> {compactList(lookup(normalized.navItemIds, NAV_ITEM_OPTIONS), 'Inferred')}
          </p>
          <p className="m-0">
            <strong>Workflows:</strong>{' '}
            {compactList(lookup(normalized.workflowTemplateIds, WORKFLOW_TEMPLATE_OPTIONS), 'Inferred')}
          </p>
          <p className="m-0">
            <strong>Landing:</strong> {normalized.landingRoute ?? 'Inferred'}
          </p>
          <p className="m-0">
            <strong>Layout:</strong> {layoutLabel}
          </p>
          <p className="m-0">
            <strong>UI switches:</strong> {compactList(activeFlags, 'None')}
          </p>
        </div>
      )}
    </div>
  )
}
