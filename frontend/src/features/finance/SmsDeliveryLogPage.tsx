import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { notificationsSmsDeliveries, notificationsSmsDeliveriesCsv, type NotificationSmsDeliveryRow } from '../../shared/api/finance'
import { normalizeApiError } from '../../shared/api/errors'

function statusClass(status: string) {
  const s = status.toUpperCase()
  if (s === 'SENT') return 'bg-emerald-100 text-emerald-700'
  if (s === 'FAILED') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-800'
}

export function SmsDeliveryLogPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<NotificationSmsDeliveryRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventId, setEventId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await notificationsSmsDeliveries({
        eventId: eventId.trim() || undefined,
        page: 0,
        size: 100,
      })
      setRows(data)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }, [eventId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = rows.filter((r) => {
    const statusOk = !statusFilter || r.status.toUpperCase() === statusFilter.toUpperCase()
    const phoneOk = !phoneFilter.trim() || r.recipientPhone.toLowerCase().includes(phoneFilter.trim().toLowerCase())
    return statusOk && phoneOk
  })

  const exportCsv = useCallback(() => {
    void (async () => {
      try {
        const response = await notificationsSmsDeliveriesCsv({
          eventId: eventId.trim() || undefined,
          status: statusFilter.trim() || undefined,
          phone: phoneFilter.trim() || undefined,
          limit: 5000,
        })
        const blob = response.data
        const a = document.createElement('a')
        const day = new Date().toISOString().slice(0, 10)
        a.href = URL.createObjectURL(blob)
        a.download = `sms-deliveries-${day}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)
      } catch (e) {
        setError(normalizeApiError(e).message)
      }
    })()
  }, [eventId, phoneFilter, statusFilter])

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-[var(--color-brand-700)]" aria-hidden />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-2xl font-bold text-neutral-900">{t('smsLogs.title')}</h1>
            <p className="m-0 text-sm text-neutral-600">{t('smsLogs.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            {t('smsLogs.exportCsv')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            onClick={() => void refresh()}
            disabled={busy}
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            {t('smsLogs.refresh')}
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-neutral-600">{t('smsLogs.eventId')}</span>
            <input
              className="mt-1 w-full rounded border px-2 py-2 font-mono text-xs"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder={t('smsLogs.eventIdPlaceholder')}
            />
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">{t('smsLogs.status')}</span>
            <select className="mt-1 w-full rounded border px-2 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t('smsLogs.all')}</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
              <option value="DRY_RUN">DRY_RUN</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-neutral-600">{t('smsLogs.phone')}</span>
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              placeholder={t('smsLogs.phonePlaceholder')}
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-surface)] p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-semibold">{t('smsLogs.deliveries')}</h2>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-2 pr-2">{t('smsLogs.time')}</th>
                <th className="py-2 pr-2">{t('smsLogs.eventType')}</th>
                <th className="py-2 pr-2">{t('smsLogs.phone')}</th>
                <th className="py-2 pr-2">{t('smsLogs.status')}</th>
                <th className="py-2 pr-2">{t('smsLogs.responseCode')}</th>
                <th className="py-2">{t('smsLogs.error')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-2">{r.eventType}</td>
                  <td className="py-2 pr-2 font-mono">{r.recipientPhone}</td>
                  <td className="py-2 pr-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${statusClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="py-2 pr-2">{r.responseCode ?? 'â€”'}</td>
                  <td className="py-2">{r.errorMessage ?? 'â€”'}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-neutral-500">
                    {t('smsLogs.none')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
