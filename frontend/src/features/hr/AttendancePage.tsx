import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAttendanceSummary } from '../../shared/api/hr'
import { normalizeApiError } from '../../shared/api/errors'
import { PageSkeleton } from '../../shared/components/ui/LoadingSkeleton'

export function AttendancePage() {
  const { t } = useTranslation()
  const period = new Date().toISOString().slice(0, 7)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAttendanceSummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getAttendanceSummary(period)
      .then(setSummary)
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{t('nav.attendance')}</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {summary ? (
        <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-white p-4 text-sm">
          <div>
            <dt className="text-slate-500">{t('pages.attendance.present')}</dt>
            <dd className="text-lg font-semibold">{summary.presentCount}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('pages.attendance.absent')}</dt>
            <dd className="text-lg font-semibold">{summary.absentCount}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('pages.attendance.active')}</dt>
            <dd className="text-lg font-semibold">{summary.activeEmployees}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
