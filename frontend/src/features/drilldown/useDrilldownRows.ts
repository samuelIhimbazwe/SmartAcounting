import { useQuery } from '@tanstack/react-query'
import { getDrilldownRows } from '../../shared/api/drilldown'
import { useDateRangeStore } from '../../shared/stores/dateRangeStore'
import type { Role } from '../../shared/types/roles'

export function useDrilldownRows(role: Role, metric: string | null, page: number, size: number) {
  const dateRange = useDateRangeStore((state) => state.dateRange)

  return useQuery({
    queryKey: ['drilldown', role, metric, dateRange.from, dateRange.to, page, size],
    queryFn: () => getDrilldownRows(role, metric ?? 'kpi', dateRange, { page, size }),
    enabled: Boolean(metric),
    staleTime: 30_000,
  })
}
