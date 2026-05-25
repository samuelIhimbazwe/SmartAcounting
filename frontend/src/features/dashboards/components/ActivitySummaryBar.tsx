import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { KPIItem } from '../../../shared/types/dashboard'
import type { Role } from '../../../shared/types/roles'
import { useAuthStore } from '../../../shared/stores/authStore'

type Pill = { labelKey: string; to: string; count: number; urgent: boolean; requiredPermission?: string }

function matchesHints(k: KPIItem | undefined, hints: string[]): boolean {
  if (!k) {
    return false
  }
  const blob = `${k.key ?? ''} ${k.label}`.toLowerCase()
  return hints.some((h) => blob.includes(h))
}

/** Prefer KPI rows whose key/label matches hints; otherwise fall back to dashboard order (index). */
function pickKpi(kpis: KPIItem[], hints: string[], index: number): KPIItem | undefined {
  const direct = kpis.find((row) => matchesHints(row, hints))
  return direct ?? kpis[index]
}

function buildPills(role: Role, kpis: KPIItem[]): Pill[] {
  if (role === 'CFO') {
    return [
      {
        labelKey: 'dashboard.activityCfo.invoices',
        to: '/finance/credit-ledger?view=kanban',
        count: countFor(pickKpi(kpis, ['invoice', 'approve', 'receivable', 'ar'], 0)),
        urgent: urgentFor(pickKpi(kpis, ['invoice', 'approve', 'receivable', 'ar'], 0)),
        requiredPermission: 'FINANCE_READ',
      },
      {
        labelKey: 'dashboard.activityCfo.payments',
        to: '/finance/credit-ledger?view=table&status=OPEN',
        count: countFor(pickKpi(kpis, ['payment', 'match', 'reconcil', 'cash'], 1)),
        urgent: urgentFor(pickKpi(kpis, ['payment', 'match', 'reconcil', 'cash'], 1)),
        requiredPermission: 'FINANCE_READ',
      },
      {
        labelKey: 'dashboard.activityCfo.bills',
        to: '/finance/credit-ledger?status=OVERDUE&view=table',
        count: countFor(pickKpi(kpis, ['bill', 'payable', 'ap ', 'aging', 'overdue'], 2)),
        urgent: urgentFor(pickKpi(kpis, ['bill', 'payable', 'ap ', 'aging', 'overdue'], 2)),
        requiredPermission: 'FINANCE_READ',
      },
      {
        labelKey: 'dashboard.activityCfo.close',
        to: '/finance/fx-rates',
        count: countFor(pickKpi(kpis, ['close', 'period', 'month', 'task'], 3)),
        urgent: urgentFor(pickKpi(kpis, ['close', 'period', 'month', 'task'], 3)),
        requiredPermission: 'FINANCE_READ',
      },
    ]
  }
  if (role === 'ACCOUNTING') {
    return [
      {
        labelKey: 'dashboard.activityAc.recon',
        to: '/finance/credit-ledger?view=table',
        count: countFor(pickKpi(kpis, ['reconcil', 'unmatch', 'open item'], 0)),
        urgent: urgentFor(pickKpi(kpis, ['reconcil', 'unmatch', 'open item'], 0)),
        requiredPermission: 'FINANCE_READ',
      },
      {
        labelKey: 'dashboard.activityAc.journals',
        to: '/transactions/invoice',
        count: countFor(pickKpi(kpis, ['journal', 'entry', 'review'], 1)),
        urgent: urgentFor(pickKpi(kpis, ['journal', 'entry', 'review'], 1)),
        requiredPermission: 'FINANCE_WRITE',
      },
      {
        labelKey: 'dashboard.activityAc.sms',
        to: '/finance/sms-deliveries',
        count: countFor(pickKpi(kpis, ['sms', 'reminder', 'notif'], 2)),
        urgent: urgentFor(pickKpi(kpis, ['sms', 'reminder', 'notif'], 2)),
        requiredPermission: 'FINANCE_READ',
      },
      {
        labelKey: 'dashboard.activityAc.till',
        to: '/retail',
        count: countFor(pickKpi(kpis, ['till', 'variance', 'cash count', 'register'], 3)),
        urgent: urgentFor(pickKpi(kpis, ['till', 'variance', 'cash count', 'register'], 3)),
        requiredPermission: 'INVENTORY_READ',
      },
    ]
  }
  return []
}

function countFor(k?: KPIItem): number {
  if (!k) {
    return 0
  }
  const n = Number(k.value)
  if (!Number.isFinite(n)) {
    return 0
  }
  return Math.min(9999, Math.max(0, Math.round(Math.abs(n))))
}

function urgentFor(k?: KPIItem): boolean {
  const s = k?.status?.toUpperCase()
  return s === 'AMBER' || s === 'RED' || s === 'CRITICAL'
}

export function ActivitySummaryBar({ role, kpis }: { role: Role; kpis: KPIItem[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const pills = buildPills(role, kpis).filter(
    (pill) => !pill.requiredPermission || hasPermission(pill.requiredPermission),
  )
  if (!pills.length) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-3">
      <span className="w-full text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {t('dashboard.activitySummary')}
      </span>
      {pills.map((pill) => (
        <button
          key={pill.labelKey}
          type="button"
          onClick={() => navigate(pill.to)}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm shadow-sm transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
            pill.urgent
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-[var(--border-default)] bg-[var(--color-surface)] text-neutral-800'
          }`}
        >
          <span className="font-[var(--font-display)] text-lg font-bold tabular-nums">{pill.count}</span>
          <span className="max-w-[10rem] leading-tight">{t(pill.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
