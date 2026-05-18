/**
 * Subscription plan catalog presented during signup.
 *
 * Backend note: public self-service signup currently provisions every tenant
 * on the `TRIAL` plan (`PublicSignupService.signup`). The user's selected
 * plan tier here is captured as their *intended* paid plan and persisted in
 * `localStorage` so the in-app billing flow can pick it up at trial end.
 */

export type PlanId = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type BillingCycle = 'MONTHLY' | 'ANNUAL'

export interface PlanFeature {
  label: string
  included: boolean
}

export interface PlanTier {
  id: PlanId
  nameKey: string
  taglineKey: string
  monthlyPriceFrw: number | null
  annualPriceFrw: number | null
  highlight?: boolean
  contactSales?: boolean
  maxUsers: number | 'unlimited'
  features: string[]
}

export const PLAN_CATALOG: PlanTier[] = [
  {
    id: 'STARTER',
    nameKey: 'auth.planStarterName',
    taglineKey: 'auth.planStarterTagline',
    monthlyPriceFrw: 49_000,
    annualPriceFrw: 39_000,
    maxUsers: 5,
    features: [
      'Up to 5 users',
      'POS + retail catalog (1 location)',
      'AR / AP, invoices, supplier bills',
      'Mobile money reconciliation (MoMo, Airtel)',
      'Email + chat support',
    ],
  },
  {
    id: 'PROFESSIONAL',
    nameKey: 'auth.planProName',
    taglineKey: 'auth.planProTagline',
    monthlyPriceFrw: 149_000,
    annualPriceFrw: 119_000,
    highlight: true,
    maxUsers: 25,
    features: [
      'Up to 25 users, multi-branch',
      'AI Copilot with role personas',
      'Forecasting, anomalies, drilldowns',
      'RRA EIS + VAT filings',
      'Workflow rules + approvals',
      'Priority support',
    ],
  },
  {
    id: 'ENTERPRISE',
    nameKey: 'auth.planEnterpriseName',
    taglineKey: 'auth.planEnterpriseTagline',
    monthlyPriceFrw: null,
    annualPriceFrw: null,
    contactSales: true,
    maxUsers: 'unlimited',
    features: [
      'Unlimited users + tenants',
      'Custom integrations + SSO',
      'Dedicated success manager',
      'On-prem / private cloud',
      'Security & compliance reviews',
      '24x7 enterprise SLA',
    ],
  },
]

const SELECTED_PLAN_KEY = 'smartaccounting-intended-plan'

export function persistIntendedPlan(plan: PlanId, cycle: BillingCycle) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(
      SELECTED_PLAN_KEY,
      JSON.stringify({ plan, cycle, capturedAt: new Date().toISOString() }),
    )
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function readIntendedPlan(): { plan: PlanId; cycle: BillingCycle } | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(SELECTED_PLAN_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as { plan?: PlanId; cycle?: BillingCycle }
    if (parsed?.plan && parsed.cycle) {
      return { plan: parsed.plan, cycle: parsed.cycle }
    }
  } catch {
    /* corrupt value — ignore */
  }
  return null
}

export function planById(id: PlanId): PlanTier {
  const found = PLAN_CATALOG.find((p) => p.id === id)
  if (!found) {
    throw new Error(`Unknown plan id: ${id}`)
  }
  return found
}

export function formatFrw(value: number): string {
  return new Intl.NumberFormat('en-RW', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value)
}
