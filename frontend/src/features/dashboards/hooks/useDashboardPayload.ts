import { useQuery } from '@tanstack/react-query'
import { getDashboardPayload } from '../../../shared/api/dashboards'
import { useDateRangeStore } from '../../../shared/stores/dateRangeStore'
import type { Role } from '../../../shared/types/roles'

export function useDashboardPayload(role: Role) {
  const dateRange = useDateRangeStore((state) => state.dateRange)

  return useQuery({
    queryKey: ['dashboard', role, dateRange.from, dateRange.to],
    queryFn: () => getDashboardPayload(role, dateRange),
    staleTime: 60_000,
  })
}
