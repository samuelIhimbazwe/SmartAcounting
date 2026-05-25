import type { ReactNode } from 'react'
import './onboarding.css'

export function OnboardingShell({
  title,
  subtitle,
  stepIndex,
  totalSteps,
  onBack,
  showBack,
  children,
}: {
  title: string
  subtitle?: string
  stepIndex: number
  totalSteps: number
  onBack?: () => void
  showBack?: boolean
  children: ReactNode
}) {
  return (
    <main className="onboarding">
      {showBack && onBack ? (
        <button type="button" className="onboarding__back" onClick={onBack} aria-label="Go back">
          ← Back
        </button>
      ) : (
        <div className="onboarding__back-spacer" />
      )}
      <div className="onboarding__inner">
        <h1 className="onboarding__title">{title}</h1>
        {subtitle ? <p className="onboarding__subtitle">{subtitle}</p> : null}
        {children}
        <div className="onboarding__dots" aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <span key={i} className={i === stepIndex ? 'onboarding__dot onboarding__dot--active' : 'onboarding__dot'} />
          ))}
        </div>
      </div>
    </main>
  )
}

export function ChoiceCard({
  emoji,
  label,
  detail,
  selected,
  onClick,
}: {
  emoji: string
  label: string
  detail?: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={selected ? 'onboarding-card onboarding-card--selected' : 'onboarding-card'}
      onClick={onClick}
    >
      <span className="onboarding-card__emoji">{emoji}</span>
      <span className="onboarding-card__label">
        {label}
        {detail ? <span className="onboarding-card__summary">{detail}</span> : null}
      </span>
      {selected ? <span className="onboarding-card__check">✓</span> : null}
    </button>
  )
}
