import type { BusinessType } from '../../../shared/api/tenantRoles'
import { ChoiceCard } from '../OnboardingShell'

const OPTIONS: { type: BusinessType; emoji: string; label: string }[] = [
  { type: 'RETAIL', emoji: '🛒', label: 'Shop / Retail' },
  { type: 'FOOD', emoji: '🍽️', label: 'Food & Bar' },
  { type: 'PHARMACY', emoji: '💊', label: 'Pharmacy' },
  { type: 'SERVICES', emoji: '💈', label: 'Services / Salon' },
  { type: 'WHOLESALE', emoji: '📦', label: 'Wholesale' },
  { type: 'CONSTRUCTION', emoji: '🏗️', label: 'Construction' },
  { type: 'OTHER', emoji: '🏢', label: 'Something else' },
]

export function StepType({
  value,
  onSelect,
  onContinue,
}: {
  value: BusinessType | null
  onSelect: (type: BusinessType) => void
  onContinue: () => void
}) {
  return (
    <>
      {OPTIONS.map((opt) => (
        <ChoiceCard
          key={opt.type}
          emoji={opt.emoji}
          label={opt.label}
          selected={value === opt.type}
          onClick={() => onSelect(opt.type)}
        />
      ))}
      <ContinueFooter disabled={!value} onContinue={onContinue} />
    </>
  )
}

function ContinueFooter({ disabled, onContinue }: { disabled: boolean; onContinue: () => void }) {
  return (
    <div className="onboarding__footer">
      <button
        type="button"
        className="onboarding-btn onboarding-btn--primary"
        disabled={disabled}
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  )
}
