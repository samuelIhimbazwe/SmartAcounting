import { useCallback } from 'react'
import { useSSEStream } from '../../shared/hooks/useSSEStream'
import { useAlertStore } from '../../shared/stores/alertStore'
import type { AlertEvent } from '../../shared/types/dashboard'
import { roleApiMap, type Role } from '../../shared/types/roles'

export function useAlertStream(role: Role | null, enabled = true) {
  const addAlert = useAlertStore((state) => state.addAlert)

  const onMessage = useCallback(
    (alert: AlertEvent) => {
      addAlert(alert)
    },
    [addAlert],
  )

  useSSEStream<AlertEvent>({
    endpoint: role ? `/api/v1/dashboards/${roleApiMap[role]}/alerts/stream` : '/api/v1/dashboards/ceo/alerts/stream',
    onMessage,
    enabled: enabled && Boolean(role),
  })
}
