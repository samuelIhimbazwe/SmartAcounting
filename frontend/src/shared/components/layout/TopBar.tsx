import { Bell, LogOut, Menu, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useAlertStore } from '../../stores/alertStore'
import { useDateRangeStore } from '../../stores/dateRangeStore'
import { useIntlStore } from '../../stores/intlStore'
import { useThemeStore, type ThemePreference } from '../../stores/themeStore'

interface TopBarProps {
  onOpenAlerts: () => void
  onOpenMenu: () => void
}

export function TopBar({ onOpenAlerts, onOpenMenu }: TopBarProps) {
  const { t } = useTranslation()
  const clearSession = useAuthStore((state) => state.clearSession)
  const unreadCount = useAlertStore((state) => state.unreadCount)
  const markAllRead = useAlertStore((state) => state.markAllRead)
  const { dateRange, preset, setDateRange, setPreset } = useDateRangeStore()
  const locale = useIntlStore((state) => state.locale)
  const setLocale = useIntlStore((state) => state.setLocale)
  const themePreference = useThemeStore((state) => state.preference)
  const resolvedTheme = useThemeStore((state) => state.resolved)
  const hasSeenThemeHint = useThemeStore((state) => state.hasSeenThemeHint)
  const setThemePreference = useThemeStore((state) => state.setPreference)
  const dismissThemeHint = useThemeStore((state) => state.dismissThemeHint)
  const [isThemeHintClosing, setThemeHintClosing] = useState(false)
  const dismissTimerRef = useRef<number | null>(null)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const resolvedThemeLabel = resolvedTheme === 'dark' ? t('topbar.themeDark') : t('topbar.themeLight')
  const monthStart = useMemo(() => {
    const now = new Date()
    now.setDate(1)
    return now.toISOString().slice(0, 10)
  }, [])
  const showThemeHint = !hasSeenThemeHint || isThemeHintClosing

  useEffect(
    () => () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current)
      }
    },
    [],
  )

  function onDismissThemeHint() {
    if (isThemeHintClosing) {
      return
    }
    setThemeHintClosing(true)
    dismissTimerRef.current = window.setTimeout(() => {
      dismissThemeHint()
      setThemeHintClosing(false)
      dismissTimerRef.current = null
    }, 180)
  }

  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex flex-wrap items-start gap-3">
        <button
          type="button"
          className="rounded-md border border-[var(--border-default)] p-2 text-neutral-700 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] lg:hidden"
          onClick={onOpenMenu}
          aria-label={t('topbar.openMenu')}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <p className="m-0 text-xs uppercase tracking-wider text-neutral-500">{t('topbar.dateRange')}</p>
          <div className="mt-1 flex items-center gap-2">
            <label htmlFor="date-from" className="sr-only">
              {t('topbar.from')}
            </label>
            <input
              id="date-from"
              className="rounded-md border border-[var(--border-default)] px-2 py-1 text-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange({ ...dateRange, from: event.target.value })}
            />
            <span className="text-sm text-neutral-500">{t('topbar.to')}</span>
            <label htmlFor="date-to" className="sr-only">
              {t('topbar.to')}
            </label>
            <input
              id="date-to"
              className="rounded-md border border-[var(--border-default)] px-2 py-1 text-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange({ ...dateRange, to: event.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-xs ${
              preset === 'MTD'
                ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                : 'border-[var(--border-default)] text-neutral-700'
            } transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
            onClick={() => {
              setDateRange({ from: monthStart, to: today })
              setPreset('MTD')
            }}
          >
            {t('topbar.todayMtd')}
          </button>
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-xs ${
              preset === 'YTD'
                ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                : 'border-[var(--border-default)] text-neutral-700'
            } transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
            onClick={() => setPreset('YTD')}
          >
            {t('topbar.ytd')}
          </button>
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-xs ${
              preset === 'LAST_30'
                ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                : 'border-[var(--border-default)] text-neutral-700'
            } transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
            onClick={() => setPreset('LAST_30')}
          >
            {t('topbar.last30')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 self-end lg:self-auto">
        <div className="flex flex-col gap-1 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span>{t('topbar.themeLabel')}</span>
            <div
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] p-1"
              role="group"
              aria-label={t('topbar.themeLabel')}
            >
              {([
                {
                  value: 'system',
                  label: t('topbar.themeSystem', { resolved: resolvedThemeLabel }),
                  shortLabel: t('topbar.themeLabelSystemShort'),
                  icon: Monitor,
                },
                {
                  value: 'light',
                  label: t('topbar.themeLight'),
                  shortLabel: t('topbar.themeLabelLightShort'),
                  icon: Sun,
                },
                {
                  value: 'dark',
                  label: t('topbar.themeDark'),
                  shortLabel: t('topbar.themeLabelDarkShort'),
                  icon: Moon,
                },
              ] as const).map((option) => {
                const Icon = option.icon
                const active = themePreference === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`inline-flex h-8 items-center gap-1 rounded px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                      active
                        ? 'bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                        : 'text-neutral-600 hover:bg-[var(--surface-overlay)]'
                    }`}
                    onClick={() => setThemePreference(option.value as ThemePreference)}
                    aria-pressed={active}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{option.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {showThemeHint && (
            <div
              className={`inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-2 py-1 text-[11px] text-[var(--text-secondary)] transition-all duration-200 ${
                isThemeHintClosing ? '-translate-y-1 opacity-0' : 'translate-y-0 opacity-100 animate-[themeHintIn_180ms_ease-out]'
              }`}
              role="status"
              aria-live="polite"
            >
              <span>{t('topbar.themeHint')}</span>
              <button
                type="button"
                className="rounded px-1 py-0.5 text-[11px] font-medium text-[var(--color-brand-900)] transition-colors hover:bg-[var(--surface-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={onDismissThemeHint}
              >
                {t('topbar.gotIt')}
              </button>
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          {t('intl.localeLabel')}
          <select
            aria-label={t('intl.localeLabel')}
            className="rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-neutral-700 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            value={locale}
            onChange={(event) => setLocale(event.target.value === 'fr' ? 'fr' : 'en')}
          >
            <option value="en">English</option>
            <option value="fr">Francais</option>
          </select>
        </label>
        <button
          type="button"
          className="relative rounded-md border border-[var(--border-default)] p-2 text-neutral-600 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          onClick={() => {
            markAllRead()
            onOpenAlerts()
          }}
          aria-label={t('topbar.openAlerts')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[var(--color-danger)] px-1 text-center text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          onClick={clearSession}
        >
          <LogOut className="h-4 w-4" />
          {t('topbar.logout')}
        </button>
      </div>
    </header>
  )
}
