import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Languages, LogOut, Settings, ShieldCheck, Sparkles } from 'lucide-react'
import {
  readIntendedPlan,
  type BillingCycle,
  type PlanId,
} from '../../../features/auth/subscriptionPlans'
import { useAuthStore } from '../../stores/authStore'
import { useIntlStore } from '../../stores/intlStore'
import type { Role } from '../../types/roles'

interface UserMenuProps {
  role: Role
  open: boolean
  onClose: () => void
}

const PLAN_LABEL_KEYS: Record<PlanId | 'TRIAL', string> = {
  STARTER: 'userMenu.planStarter',
  PROFESSIONAL: 'userMenu.planProfessional',
  ENTERPRISE: 'userMenu.planEnterprise',
  TRIAL: 'userMenu.planTrial',
}

export function UserMenu({ role, open, onClose }: UserMenuProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const clearSession = useAuthStore((state) => state.clearSession)
  const tenantId = useAuthStore((state) => state.tenantId)
  const permissions = useAuthStore((state) => state.permissions)
  const effectiveRoleProfile = useAuthStore((state) => state.effectiveRoleProfile)
  const locale = useIntlStore((state) => state.locale)
  const setLocale = useIntlStore((state) => state.setLocale)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const intendedPlan = useMemo(() => readIntendedPlan(), [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function onDocumentClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const initials = role.slice(0, 2).toUpperCase()
  const planId: PlanId | 'TRIAL' = intendedPlan?.plan ?? 'TRIAL'
  const cycle: BillingCycle = intendedPlan?.cycle ?? 'MONTHLY'
  const canAccessAdmin =
    permissions.includes('TENANT_CONFIG') ||
    permissions.includes('USER_MANAGE') ||
    permissions.includes('ROLE_MANAGE') ||
    effectiveRoleProfile.navItemIds.includes('users-tenants')
  const tenantShort = tenantId ? tenantId.slice(0, 8).toUpperCase() : '—'

  function handleSignOut() {
    onClose()
    clearSession()
    navigate('/login')
  }

  return (
    <div ref={menuRef} className="user-menu" role="menu" aria-label={t('userMenu.openMenu') ?? 'User menu'}>
      <div className="user-menu__header">
        <div className="user-menu__avatar" aria-hidden="true">{initials}</div>
        <div className="user-menu__identity">
          <p className="user-menu__name">{role}</p>
          <span className="user-menu__role">{t('userMenu.signedInAs')}</span>
        </div>
      </div>

      <div className="user-menu__plan-card">
        <div className="user-menu__plan-label">{t('userMenu.currentPlan')}</div>
        <div className="user-menu__plan-name">{t(PLAN_LABEL_KEYS[planId])}</div>
        <div className="user-menu__plan-cycle">
          <Sparkles size={11} strokeWidth={2} />
          {planId === 'TRIAL'
            ? t('userMenu.trialActive')
            : cycle === 'ANNUAL'
              ? t('userMenu.billingCycleAnnual')
              : t('userMenu.billingCycleMonthly')}
        </div>
        {canAccessAdmin && (
          <Link to="/admin/users-tenants" className="user-menu__plan-cta" onClick={onClose}>
            {t('userMenu.upgradePlan')}
            <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      <div className="user-menu__section">
        <div className="user-menu__section-label">{t('userMenu.language')}</div>
        <div className="user-menu__segmented" role="group" aria-label={t('userMenu.language') ?? 'Language'}>
          <button
            type="button"
            data-active={locale === 'en'}
            onClick={() => {
              setLocale('en')
              void i18n.changeLanguage('en')
            }}
          >
            <Languages size={13} strokeWidth={2} /> EN
          </button>
          <button
            type="button"
            data-active={locale === 'fr'}
            onClick={() => {
              setLocale('fr')
              void i18n.changeLanguage('fr')
            }}
          >
            <Languages size={13} strokeWidth={2} /> FR
          </button>
          <button
            type="button"
            data-active={locale === 'rw'}
            onClick={() => {
              setLocale('rw')
              void i18n.changeLanguage('rw')
            }}
          >
            <Languages size={13} strokeWidth={2} /> RW
          </button>
        </div>
      </div>

      <div className="user-menu__section">
        <div className="user-menu__section-label">{t('userMenu.tenantLabel')}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {tenantShort}
        </div>
      </div>

      <div className="user-menu__section" style={{ paddingTop: 6 }}>
        <Link to="/settings" className="user-menu__row" onClick={onClose}>
          <Settings size={15} strokeWidth={2} />
          {t('userMenu.settings')}
        </Link>
        {canAccessAdmin && (
          <Link to="/admin/users-tenants" className="user-menu__row" onClick={onClose}>
            <ShieldCheck size={15} strokeWidth={2} />
            {t('userMenu.userTenantManagement')}
          </Link>
        )}
        <button type="button" className="user-menu__row user-menu__row--danger" onClick={handleSignOut}>
          <LogOut size={15} strokeWidth={2} />
          {t('userMenu.signOut')}
        </button>
      </div>
    </div>
  )
}
