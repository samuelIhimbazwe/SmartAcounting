import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import {
  PLAN_CATALOG,
  formatFrw,
  type BillingCycle,
  type PlanId,
  type PlanTier,
} from './subscriptionPlans'

interface PlanSelectorProps {
  selectedPlan: PlanId
  billingCycle: BillingCycle
  onSelectPlan: (plan: PlanId) => void
  onBillingChange: (cycle: BillingCycle) => void
  onContinue: () => void
}

export function PlanSelector({
  selectedPlan,
  billingCycle,
  onSelectPlan,
  onBillingChange,
  onContinue,
}: PlanSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="auth-card">
      <p className="auth-card__eyebrow">{t('auth.signupStepProgress', { current: 1, total: 3 })}</p>
      <h1 className="auth-card__title">{t('auth.planTitle')}</h1>
      <p className="auth-card__subtitle">{t('auth.planSubtitle')}</p>

      <div className="plan-billing" role="tablist" aria-label="Billing cycle">
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === 'MONTHLY'}
          data-active={billingCycle === 'MONTHLY'}
          onClick={() => onBillingChange('MONTHLY')}
        >
          {t('auth.planBillingMonthly')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === 'ANNUAL'}
          data-active={billingCycle === 'ANNUAL'}
          onClick={() => onBillingChange('ANNUAL')}
        >
          {t('auth.planBillingAnnual')}
          <span className="plan-billing__savings">{t('auth.planSaveBadge')}</span>
        </button>
      </div>

      <div className="plan-grid">
        {PLAN_CATALOG.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={billingCycle}
            selected={plan.id === selectedPlan}
            onSelect={() => onSelectPlan(plan.id)}
          />
        ))}
      </div>

      <button type="button" className="auth-btn auth-btn--primary" onClick={onContinue}>
        {t('auth.planContinue', { plan: t(planNameKey(selectedPlan)) })}
      </button>

      <p className="plan-footer-note">{t('auth.planFooterNote')}</p>
    </div>
  )
}

function planNameKey(id: PlanId): string {
  switch (id) {
    case 'STARTER':
      return 'auth.planStarterName'
    case 'PROFESSIONAL':
      return 'auth.planProName'
    case 'ENTERPRISE':
      return 'auth.planEnterpriseName'
  }
}

interface PlanCardProps {
  plan: PlanTier
  cycle: BillingCycle
  selected: boolean
  onSelect: () => void
}

function PlanCard({ plan, cycle, selected, onSelect }: PlanCardProps) {
  const { t } = useTranslation()
  const price = cycle === 'ANNUAL' ? plan.annualPriceFrw : plan.monthlyPriceFrw

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`plan-card${plan.highlight ? ' plan-card--highlight' : ''}`}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
    >
      {plan.highlight && <span className="plan-card__badge">{t('auth.planMostPopular')}</span>}

      <h3 className="plan-card__name">{t(plan.nameKey)}</h3>
      <p className="plan-card__tagline">{t(plan.taglineKey)}</p>

      <div className="plan-card__price">
        {plan.contactSales || price == null ? (
          <span className="plan-card__price-amount plan-card__price-amount--custom">
            {t('auth.planCustomPrice')}
          </span>
        ) : (
          <>
            <span className="plan-card__price-currency">FRW</span>
            <span className="plan-card__price-amount">{formatFrw(price)}</span>
          </>
        )}
      </div>
      <div className="plan-card__price-cycle">
        {plan.contactSales
          ? t('auth.planContactSales')
          : cycle === 'ANNUAL'
            ? t('auth.planPerMonthAnnual')
            : t('auth.planPerMonth')}
      </div>

      <ul className="plan-card__features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <span className="plan-card__feature-check" aria-hidden="true">
              <Check size={12} strokeWidth={3} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <span className="plan-card__cta">
        {selected ? t('auth.planSelected') : t('auth.planSelect', { plan: t(plan.nameKey) })}
      </span>
    </button>
  )
}
