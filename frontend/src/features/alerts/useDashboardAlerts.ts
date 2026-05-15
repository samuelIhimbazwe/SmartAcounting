import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardAlerts } from '../../shared/api/dashboards'
import { useAlertStore } from '../../shared/stores/alertStore'
import type { Role } from '../../shared/types/roles'

export function useDashboardAlerts(role: Role | null, enabled = true) {
  const setAlerts = useAlertStore((state) => state.setAlerts)

  const query = useQuery({
    queryKey: ['dashboard-alerts', role],
    queryFn: () => getDashboardAlerts(role!),
    enabled: enabled && Boolean(role),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) {
      setAlerts(query.data)
    }
  }, [query.data, setAlerts])

  return query
}
