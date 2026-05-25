import { useState } from 'react'
import type { PermissionDto } from '../../../shared/api/tenantRoles'
import { CATEGORY_LABELS } from '../../../shared/api/tenantRoles'
import { RoleProfileEditor } from '../../../shared/roleProfiles/RoleProfileEditor'
import { RoleProfileSummary } from '../../../shared/roleProfiles/RoleProfileSummary'
import type { RoleProfile } from '../../../shared/types/roleProfiles'
import { emptyRoleProfile } from '../../../shared/types/roleProfiles'
import type { OnboardingRoleState } from '../hooks/useOnboarding'

function enabledCodes(role: OnboardingRoleState): string[] {
  return [
    ...role.alwaysPermissions,
    ...role.enabledOptional.filter((c) => role.optionalPermissions.includes(c)),
  ]
}

function labelsFor(codes: string[], catalog: PermissionDto[]): string[] {
  return codes.map((code) => catalog.find((p) => p.code === code)?.label ?? code)
}

function offCategories(role: OnboardingRoleState, catalog: PermissionDto[]): string {
  const on = new Set(enabledCodes(role))
  const off = new Set<string>()
  for (const perm of catalog) {
    if (!on.has(perm.code)) {
      off.add(CATEGORY_LABELS[perm.category] ?? perm.category)
    }
  }
  return [...off].slice(0, 3).join(', ') || 'none'
}

export function StepReview({
  roles,
  soloMode,
  permissionCatalog,
  saving,
  onEdit,
  onRoleProfileChange,
  onBack,
  onConfirm,
}: {
  roles: OnboardingRoleState[]
  soloMode: boolean
  permissionCatalog: PermissionDto[]
  saving: boolean
  onEdit: (index: number) => void
  onRoleProfileChange: (index: number, roleProfile: RoleProfile) => void
  onBack: () => void
  onConfirm: () => void
}) {
  const [expandedRoleIndex, setExpandedRoleIndex] = useState<number | null>(null)

  if (soloMode) {
    return (
      <>
        <p className="onboarding__subtitle">Just you ? full access to everything.</p>
        <div>
          <div className="onboarding-review-card__head">Business Owner</div>
          <p className="onboarding-review-card__meta">All permissions enabled</p>
          <div className="mt-3">
            <RoleProfileSummary profile={roles[0]?.roleProfile} />
          </div>
        </div>
        <div className="onboarding__footer">
          <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={onBack}>
            Change something
          </button>
          <button type="button" className="onboarding-btn onboarding-btn--primary" disabled={saving} onClick={onConfirm}>
            {saving ? 'Saving?' : 'This looks right'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {roles.map((role, index) => {
        const can = labelsFor(enabledCodes(role), permissionCatalog).slice(0, 6).join(', ')
        const cannot = offCategories(role, permissionCatalog)
        const experienceOpen = expandedRoleIndex === index
        return (
          <div key={`${role.name}-${index}`} className="onboarding-review-card">
            <div className="onboarding-review-card__head">
              {role.emoji} {role.name}
            </div>
            <p className="onboarding-review-card__meta">
              <strong>Can:</strong> {can || 'basic access'}
            </p>
            <p className="onboarding-review-card__meta">
              <strong>Cannot:</strong> {cannot}
            </p>
            <div className="mt-3">
              <RoleProfileSummary profile={role.roleProfile} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {!role.isOwner ? (
                <button type="button" className="onboarding-link" onClick={() => onEdit(index)}>
                  Edit access
                </button>
              ) : null}
              <button
                type="button"
                className="onboarding-link"
                onClick={() => setExpandedRoleIndex((current) => (current === index ? null : index))}
              >
                {experienceOpen ? 'Hide experience settings' : 'Adjust experience'}
              </button>
            </div>
            {experienceOpen ? (
              <div className="mt-4">
                <RoleProfileEditor
                  profile={role.roleProfile ?? emptyRoleProfile()}
                  onChange={(roleProfile) => onRoleProfileChange(index, roleProfile)}
                  title={`${role.name} experience`}
                  description="Review the dashboards, menus, workflows, and landing page this role should get on day one."
                />
              </div>
            ) : null}
          </div>
        )
      })}
      <div className="onboarding__footer">
        <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={onBack}>
          Change something
        </button>
        <button type="button" className="onboarding-btn onboarding-btn--primary" disabled={saving} onClick={onConfirm}>
          {saving ? 'Saving?' : 'This looks right'}
        </button>
      </div>
    </>
  )
}
