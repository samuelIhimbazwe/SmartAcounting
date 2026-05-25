import { useState } from 'react'
import { inviteTenantUser } from '../../../shared/api/userTenant'
import type { TenantRoleDto } from '../../../shared/api/tenantRoles'
import { normalizeApiError } from '../../../shared/api/errors'
import '../onboarding.css'

type InviteMode = 'email' | 'phone'

function toInviteEmail(value: string, mode: InviteMode): string {
  const trimmed = value.trim()
  if (mode === 'phone') {
    const digits = trimmed.replace(/\D/g, '')
    if (!digits) {
      return ''
    }
    return `${digits}@invite.local`
  }
  return trimmed
}

function RoleInviteRow({
  role,
  tenantId,
  onInvited,
}: {
  role: TenantRoleDto
  tenantId: string
  onInvited: (message: string) => void
}) {
  const [mode, setMode] = useState<InviteMode>('email')
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const email = toInviteEmail(value, mode)
    if (!email) {
      setError(mode === 'phone' ? 'Enter a phone number' : 'Enter an email address')
      return
    }
    setPending(true)
    setError(null)
    try {
      await inviteTenantUser(tenantId, { email, roleId: role.id })
      onInvited(`Invite sent for ${role.name}`)
      setValue('')
    } catch (caught) {
      setError(normalizeApiError(caught).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="onboarding-review-card">
      <div className="onboarding-review-card__head">
        <span>{role.emoji ?? '👤'}</span>
        <span>{role.name}</span>
      </div>
      <div className="onboarding-invite__mode">
        <button
          type="button"
          className={mode === 'email' ? 'onboarding-invite__mode-btn onboarding-invite__mode-btn--active' : 'onboarding-invite__mode-btn'}
          onClick={() => setMode('email')}
        >
          Email
        </button>
        <button
          type="button"
          className={mode === 'phone' ? 'onboarding-invite__mode-btn onboarding-invite__mode-btn--active' : 'onboarding-invite__mode-btn'}
          onClick={() => setMode('phone')}
        >
          Phone
        </button>
      </div>
      <div className="onboarding-invite__row">
        <input
          className="onboarding-input onboarding-invite__input"
          type={mode === 'email' ? 'email' : 'tel'}
          placeholder={mode === 'email' ? 'colleague@example.com' : '0781234567'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Invite ${role.name} by ${mode}`}
        />
        <button
          type="button"
          className="onboarding-btn onboarding-btn--primary onboarding-invite__send"
          disabled={pending || !value.trim()}
          onClick={() => void submit()}
        >
          {pending ? 'Sending…' : 'Invite'}
        </button>
      </div>
      {error ? <p className="onboarding-invite__error">{error}</p> : null}
    </div>
  )
}

export function StepInvite({
  roles,
  tenantId,
  onSkip,
  onDone,
}: {
  roles: TenantRoleDto[]
  tenantId: string
  onSkip: () => void
  onDone: () => void
}) {
  const [toast, setToast] = useState<string | null>(null)
  const invitable = roles.filter((role) => !role.isOwner)

  return (
    <>
      {toast ? <p className="onboarding-invite__toast">{toast}</p> : null}

      {invitable.length === 0 ? (
        <p className="onboarding__subtitle">No additional roles to invite. You can add staff anytime from Settings.</p>
      ) : (
        invitable.map((role) => (
          <RoleInviteRow
            key={role.id}
            role={role}
            tenantId={tenantId}
            onInvited={(message) => setToast(message)}
          />
        ))
      )}

      <div className="onboarding__footer">
        <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={onDone}>
          Go to dashboard
        </button>
        <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={onSkip}>
          I&apos;ll add staff later
        </button>
      </div>
    </>
  )
}
