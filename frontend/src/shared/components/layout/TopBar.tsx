import { Bell, LogOut, Menu } from 'lucide-react'
import { TillStatusChip } from '../../../components/till/TillStatusChip'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getDefaultRoute } from '../../routing/getDefaultRoute'
import { signOut } from '../../auth/signOut'
import { useAuthStore } from '../../stores/authStore'
import { useAlertStore } from '../../stores/alertStore'
import { useDateRangeStore } from '../../stores/dateRangeStore'
import { useIntlStore } from '../../stores/intlStore'
import type { Role } from '../../types/roles'
import { HistoryBackButton } from '../navigation/HistoryBackButton'
import { GlobalSearch } from './GlobalSearch'

interface TopBarProps {
  role: Role
  onOpenAlerts: () => void
  onOpenMenu: () => void
}

export function TopBar({ role, onOpenAlerts, onOpenMenu }: TopBarProps) {
  const { t } = useTranslation()
  const permissions = useAuthStore((state) => state.permissions)
  const effectiveRoleProfile = useAuthStore((state) => state.effectiveRoleProfile)
  const unreadCount = useAlertStore((state) => state.unreadCount)
  const markAllRead = useAlertStore((state) => state.markAllRead)
  const { dateRange, preset, setDateRange, setPreset } = useDateRangeStore()
  const locale = useIntlStore((state) => state.locale)
  const setLocale = useIntlStore((state) => state.setLocale)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const monthStart = useMemo(() => {
    const now = new Date()
    now.setDate(1)
    return now.toISOString().slice(0, 10)
  }, [])
  const defaultRoute = useMemo(
    () => getDefaultRoute(role, permissions, effectiveRoleProfile),
    [role, permissions, effectiveRoleProfile],
  )

  return (
    <header className="topbar">
      <div className="topbar__primary">
        <button
          type="button"
          className="topbar__hamburger"
          onClick={onOpenMenu}
          aria-label={t('topbar.openMenu')}
        >
          <Menu className="h-4 w-4" />
        </button>

        <HistoryBackButton
          iconOnly
          label="Go back"
          fallbackTo={defaultRoute}
          className="topbar__icon-btn"
          title="Go back"
        />

        <span className="topbar__brand-mark" aria-hidden>
          SC
        </span>

        <div className="topbar__actions">
          <TillStatusChip />
          <GlobalSearch role={role} />

          <button
            type="button"
            className="topbar__icon-btn"
            onClick={() => {
              markAllRead()
              onOpenAlerts()
            }}
            aria-label={t('topbar.openAlerts')}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? <span className="topbar__icon-btn__dot">{unreadCount}</span> : null}
          </button>

          <button type="button" className="btn btn--sm" onClick={() => void signOut().then(() => { window.location.assign('/login') })}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('topbar.logout')}</span>
          </button>
        </div>
      </div>

      <div className="topbar__secondary">
        <div className="topbar__date">
          <label htmlFor="date-from" className="sr-only">
            {t('topbar.from')}
          </label>
          <input
            id="date-from"
            type="date"
            value={dateRange.from}
            onChange={(event) => setDateRange({ ...dateRange, from: event.target.value })}
          />
          <span className="topbar__date-sep">{t('topbar.to')}</span>
          <label htmlFor="date-to" className="sr-only">
            {t('topbar.to')}
          </label>
          <input
            id="date-to"
            type="date"
            value={dateRange.to}
            onChange={(event) => setDateRange({ ...dateRange, to: event.target.value })}
          />
        </div>

        <select
          className="topbar__presets-select ui-input"
          aria-label={t('topbar.dateRange')}
          value={preset}
          onChange={(event) => {
            const value = event.target.value
            if (value === 'MTD') {
              setDateRange({ from: monthStart, to: today })
              setPreset('MTD')
            } else if (value === 'YTD') {
              setPreset('YTD')
            } else if (value === 'LAST_30') {
              setPreset('LAST_30')
            }
          }}
        >
          <option value="MTD">{t('topbar.todayMtd')}</option>
          <option value="YTD">{t('topbar.ytd')}</option>
          <option value="LAST_30">{t('topbar.last30')}</option>
        </select>

        <div className="topbar__presets topbar__presets--buttons" role="group" aria-label={t('topbar.dateRange')}>
          <button
            type="button"
            data-active={preset === 'MTD' ? 'true' : 'false'}
            onClick={() => {
              setDateRange({ from: monthStart, to: today })
              setPreset('MTD')
            }}
          >
            {t('topbar.todayMtd')}
          </button>
          <button
            type="button"
            data-active={preset === 'YTD' ? 'true' : 'false'}
            onClick={() => setPreset('YTD')}
          >
            {t('topbar.ytd')}
          </button>
          <button
            type="button"
            data-active={preset === 'LAST_30' ? 'true' : 'false'}
            onClick={() => setPreset('LAST_30')}
          >
            {t('topbar.last30')}
          </button>
        </div>

        <label className="topbar__locale inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {t('intl.localeLabel')}
          <select
            className="ui-input"
            style={{ width: 'auto', minHeight: '2rem' }}
            aria-label={t('intl.localeLabel')}
            value={locale}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'fr' || value === 'rw') {
                setLocale(value)
                return
              }
              setLocale('en')
            }}
          >
            <option value="en">English</option>
            <option value="fr">Francais</option>
            <option value="rw">Kinyarwanda (RW)</option>
          </select>
        </label>
      </div>
    </header>
  )
}
