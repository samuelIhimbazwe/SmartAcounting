import { useState } from 'react'
import type { PermissionDto, RoleTemplateDto } from '../../../shared/api/tenantRoles'
import { suggestRolePermissions } from '../../../shared/api/tenantRoles'
import { ChoiceCard } from '../OnboardingShell'
import type { OnboardingRoleState } from '../hooks/useOnboarding'

function summarizePermissions(codes: string[], catalog: PermissionDto[]): string {
  const labels = codes
    .slice(0, 4)
    .map((code) => catalog.find((p) => p.code === code)?.label ?? code.replace(/_/g, ' ').toLowerCase())
  return labels.join(', ')
}

export function StepStaff({
  templates,
  selectedRoles,
  permissionCatalog,
  onToggle,
  onAddCustom,
  onContinue,
}: {
  templates: RoleTemplateDto[]
  selectedRoles: OnboardingRoleState[]
  permissionCatalog: PermissionDto[]
  onToggle: (template: RoleTemplateDto) => void
  onAddCustom: (name: string, suggested: string[]) => void
  onContinue: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [customName, setCustomName] = useState('')
  const [loadingSuggest, setLoadingSuggest] = useState(false)

  async function submitCustom() {
    const name = customName.trim()
    if (!name) return
    setLoadingSuggest(true)
    try {
      const suggested = await suggestRolePermissions(name)
      onAddCustom(name, suggested)
      setCustomName('')
      setAdding(false)
    } finally {
      setLoadingSuggest(false)
    }
  }

  return (
    <>
      {templates.map((template) => {
        const selected = selectedRoles.some((r) => r.name === template.name)
        const summary = summarizePermissions(
          [...template.alwaysPermissions, ...template.optionalPermissions.slice(0, 2)],
          permissionCatalog,
        )
        return (
          <ChoiceCard
            key={template.name}
            emoji={template.emoji}
            label={template.name}
            detail={template.isOwner ? 'Full access to everything' : summary}
            selected={selected}
            onClick={() => onToggle(template)}
          />
        )
      })}

      {!adding ? (
        <button type="button" className="onboarding-link" onClick={() => setAdding(true)}>
          + Add someone else
        </button>
      ) : (
        <div>
          <input
            className="onboarding-input"
            placeholder="Role name, e.g. Night shift lead"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <div className="onboarding__footer">
            <button
              type="button"
              className="onboarding-btn onboarding-btn--primary"
              disabled={!customName.trim() || loadingSuggest}
              onClick={() => void submitCustom()}
            >
              {loadingSuggest ? 'Suggesting…' : 'Add role'}
            </button>
            <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding ? (
        <div className="onboarding__footer">
          <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      ) : null}
    </>
  )
}
