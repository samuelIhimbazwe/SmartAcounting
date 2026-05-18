import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  financeSupplierStatementReconcile,
  type StatementReconcileResult,
} from '../../../shared/api/financeExtended'
import { normalizeApiError } from '../../../shared/api/errors'

type Line = { reference: string; amount: string }

export function StatementReconciliationModal({
  supplierId,
  onClose,
}: {
  supplierId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [lines, setLines] = useState<Line[]>([{ reference: '', amount: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<StatementReconcileResult | null>(null)

  const updateRow = (i: number, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  const addRow = () => setLines((prev) => [...prev, { reference: '', amount: '' }])
  const removeRow = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    const invoices = lines
      .map((l) => ({
        reference: l.reference.trim(),
        amount: l.amount.trim(),
      }))
      .filter((l) => l.reference && l.amount)
    if (!invoices.length) {
      setError(t('supplierRecord.statementNeedRows'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await financeSupplierStatementReconcile(supplierId, invoices)
      setResult(data)
    } catch (e) {
      setError(normalizeApiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 className="mt-0 text-lg font-semibold">{t('supplierRecord.statementTitle')}</h2>
          <button type="button" className="rounded border px-2 py-1 text-sm" onClick={onClose}>
            {t('creditLedger.cancel')}
          </button>
        </div>
        <p className="text-sm text-neutral-600">{t('supplierRecord.statementIntro')}</p>

        {error && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-sm text-red-800">{error}</div>
        )}

        {!result ? (
          <div className="mt-4 space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="statement-row flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[8rem] flex-1 rounded border px-2 py-2 text-sm"
                  placeholder={t('supplierRecord.refPlaceholder')}
                  value={line.reference}
                  onChange={(e) => updateRow(i, 'reference', e.target.value)}
                />
                <input
                  className="w-28 rounded border px-2 py-2 text-sm"
                  placeholder={t('supplierRecord.amountPlaceholder')}
                  inputMode="decimal"
                  value={line.amount}
                  onChange={(e) => updateRow(i, 'amount', e.target.value)}
                />
                <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => removeRow(i)}>
                  {t('supplierRecord.removeRow')}
                </button>
              </div>
            ))}
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={addRow}>
              {t('supplierRecord.addRow')}
            </button>
            <button
              type="button"
              disabled={busy}
              className="block w-full rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void handleSubmit()}
            >
              {busy ? t('supplierRecord.comparing') : t('supplierRecord.compare')}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            <section>
              <p className="m-0 font-semibold text-emerald-800">
                âœ… {t('supplierRecord.matched')} ({result.matched.length})
              </p>
              <ul className="m-0 list-disc pl-5">
                {result.matched.map((m, i) => (
                  <li key={i}>
                    {m.reference} Â· {String(m.amount)}
                  </li>
                ))}
                {!result.matched.length && <li className="text-neutral-500">{t('supplierRecord.none')}</li>}
              </ul>
            </section>
            <section>
              <p className="m-0 font-semibold text-amber-800">
                âš ï¸ {t('supplierRecord.systemOnly')} ({result.systemOnly.length})
              </p>
              <ul className="m-0 list-disc pl-5">
                {result.systemOnly.map((m, i) => (
                  <li key={i}>
                    {m.reference} Â· {String(m.amount)}
                  </li>
                ))}
                {!result.systemOnly.length && <li className="text-neutral-500">{t('supplierRecord.none')}</li>}
              </ul>
            </section>
            <section>
              <p className="m-0 font-semibold text-red-800">
                âŒ {t('supplierRecord.statementOnly')} ({result.statementOnly.length})
              </p>
              <ul className="m-0 list-disc pl-5">
                {result.statementOnly.map((m, i) => (
                  <li key={i}>
                    {m.reference} Â· {String(m.amount)}
                  </li>
                ))}
                {!result.statementOnly.length && <li className="text-neutral-500">{t('supplierRecord.none')}</li>}
              </ul>
            </section>
            <p className="m-0 font-medium">
              {t('supplierRecord.balanceDifference')}: {String(result.balanceDifference)}
            </p>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setResult(null)}>
              {t('supplierRecord.statementAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
