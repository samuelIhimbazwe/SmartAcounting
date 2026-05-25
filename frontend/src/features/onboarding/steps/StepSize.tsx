import type { BusinessSize } from '../../../shared/api/tenantRoles'
import { ChoiceCard } from '../OnboardingShell'

const OPTIONS: { size: BusinessSize; emoji: string; label: string }[] = [
  { size: 'SOLO', emoji: '👤', label: 'Just me' },
  { size: 'SMALL', emoji: '👤👤', label: '2–10 people' },
  { size: 'MEDIUM', emoji: '👥', label: '10–50 people' },
  { size: 'LARGE', emoji: '🏢', label: '50+ people' },
]

export function StepSize({
  value,
  onSelect,
  onContinue,
}: {
  value: BusinessSize | null
  onSelect: (size: BusinessSize) => void
  onContinue: () => void
}) {
  return (
    <>
      {OPTIONS.map((opt) => (
        <ChoiceCard
          key={opt.size}
          emoji={opt.emoji}
          label={opt.label}
          selected={value === opt.size}
          onClick={() => onSelect(opt.size)}
        />
      ))}
      <div className="onboarding__footer">
        <button type="button" className="onboarding-btn onboarding-btn--primary" disabled={!value} onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  )
}
