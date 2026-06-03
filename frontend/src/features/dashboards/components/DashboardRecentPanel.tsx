import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, EmptyState, Skeleton, Table, type TableColumn } from '../../../components/ui'
import { getDrilldownRows } from '../../../shared/api/drilldown'
import { useDateRangeStore } from '../../../shared/stores/dateRangeStore'
import type { DrilldownRow } from '../../../shared/types/dashboard'
import type { Role } from '../../../shared/types/roles'
import { formatRwf } from '../utils/dashboardFormat'
import type { ThirdRowPanelConfig } from '../config/roleKpiSlots'

interface DashboardRecentPanelProps {
  role: Role
  config: ThirdRowPanelConfig
  onRowClick?: (row: DrilldownRow) => void
}

export function DashboardRecentPanel({ role, config, onRowClick }: DashboardRecentPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dateRange = useDateRangeStore((s) => s.dateRange)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-recent', role, config.drillWidget, dateRange.from, dateRange.to],
    queryFn: () => getDrilldownRows(role, config.drillWidget, dateRange, { page: 0, size: 8 }),
    staleTime: 60_000,
  })

  const rows = data?.rows ?? []
  const title = t(`dashboard.thirdRow.${config.titleKey}`)

  const columns: TableColumn<DrilldownRow>[] = [
    { key: 'entity', header: 'Entity', accessor: (r) => r.entity },
    {
      key: 'amount',
      header: t('common.amount'),
      accessor: (r) => r.amount,
      align: 'right',
      render: (v) => <span className="num">{formatRwf(Number(v))}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (r) => r.status,
      render: (v) => {
        const s = String(v ?? '')
        const variant =
          s.toLowerCase().includes('risk') || s.toLowerCase().includes('overdue')
            ? 'error'
            : s.toLowerCase().includes('pending')
              ? 'warning'
              : 'success'
        return <Badge variant={variant} size="sm">{s}</Badge>
      },
    },
    { key: 'date', header: 'Date', accessor: (r) => r.date },
  ]

  const emptyAction =
    config.emptyActionTo && config.emptyActionKey ? (
      <Button variant="secondary" size="sm" onClick={() => navigate(config.emptyActionTo!)}>
        {t(`dashboard.thirdRow.${config.emptyActionKey}`)}
      </Button>
    ) : config.emptyActionTo ? (
      <Button variant="secondary" size="sm" onClick={() => navigate(config.emptyActionTo!)}>
        {t('dashboard.viewModule')}
      </Button>
    ) : undefined

  return (
    <article className="dash-panel">
      <header className="dash-panel__head">
        <h3 className="dash-panel__title">{title}</h3>
      </header>
      {isLoading ? (
        <div className="dash-panel__loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={14} />
          ))}
        </div>
      ) : (
        <Table
          columns={columns}
          data={rows}
          compact
          getRowKey={(r) => r.id}
          onRowClick={onRowClick}
          emptyState={
            <EmptyState
              title={t('dashboard.panelEmptyTitle')}
              description={t('dashboard.panelEmptyBody')}
              action={emptyAction}
            />
          }
        />
      )}
    </article>
  )
}
