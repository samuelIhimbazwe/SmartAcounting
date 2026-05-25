import type { PermissionDto } from '../../../shared/api/tenantRoles'
import type { OnboardingRoleState } from '../hooks/useOnboarding'

const MAX_OPTIONAL = 6

export function StepFineTune({
  role,
  page,
  totalPages,
  permissionCatalog,
  onNameChange,
  onOptionalAnswer,
  onContinue,
}: {
  role: OnboardingRoleState
  roleIndex: number
  page: number
  totalPages: number
  permissionCatalog: PermissionDto[]
  onNameChange: (name: string) => void
  onOptionalAnswer: (code: string, enabled: boolean) => void
  onContinue: () => void
}) {
  const optional = role.optionalPermissions.slice(0, MAX_OPTIONAL)

  function labelFor(code: string) {
    return permissionCatalog.find((p) => p.code === code)?.label ?? code.replace(/_/g, ' ').toLowerCase()
  }

  return (
    <>
      <p className="onboarding__subtitle">
        {page} of {totalPages}
      </p>
      <input
        className="onboarding-input"
        value={role.name}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="Role name"
      />

      {role.alwaysPermissions.map((code) => (
        <div key={code} className="onboarding-perm-locked">
          <span>✅</span>
          <span>{labelFor(code)} — always on</span>
        </div>
      ))}

      {optional.map((code) => {
        const enabled = role.enabledOptional.includes(code)
        return (
          <div key={code} className="onboarding-perm-yesno">
            <span>{labelFor(code)}</span>
            <div className="onboarding-perm-yesno__btns">
              <button
                type="button"
                className={
                  enabled ? 'onboarding-perm-yesno__btn onboarding-perm-yesno__btn--on' : 'onboarding-perm-yesno__btn'
                }
                onClick={() => onOptionalAnswer(code, true)}
              >
                YES
              </button>
              <button
                type="button"
                className={
                  !enabled ? 'onboarding-perm-yesno__btn onboarding-perm-yesno__btn--on' : 'onboarding-perm-yesno__btn'
                }
                onClick={() => onOptionalAnswer(code, false)}
              >
                NO
              </button>
            </div>
          </div>
        )
      })}

      <div className="onboarding__footer">
        <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  )
}
