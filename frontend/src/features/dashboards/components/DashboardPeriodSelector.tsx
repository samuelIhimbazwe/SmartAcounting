import { useTranslation } from 'react-i18next'
import { cn } from '../../../components/ui/utils'
import { useDateRangeStore } from '../../../shared/stores/dateRangeStore'

const PERIODS = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH'] as const

const PERIOD_LABEL_KEYS: Record<(typeof PERIODS)[number], string> = {
  TODAY: 'dashboard.period.today',
  THIS_WEEK: 'dashboard.period.thisWeek',
  THIS_MONTH: 'dashboard.period.thisMonth',
  LAST_MONTH: 'dashboard.period.lastMonth',
}

export function DashboardPeriodSelector({ className }: { className?: string }) {
  const { t } = useTranslation()
  const preset = useDateRangeStore((s) => s.preset)
  const setPreset = useDateRangeStore((s) => s.setPreset)

  return (
    <div className={cn('dash-period', className)} role="group" aria-label={t('dashboard.period.label')}>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          className={cn('dash-period__btn', preset === p && 'dash-period__btn--active')}
          aria-pressed={preset === p}
          onClick={() => setPreset(p)}
        >
          {t(PERIOD_LABEL_KEYS[p])}
        </button>
      ))}
    </div>
  )
}
