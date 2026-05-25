import { useCallback } from 'react'
import { useSSEStream } from '../../shared/hooks/useSSEStream'
import { normalizeIncomingAlert } from '../../shared/alerts/alertUtils'
import { useAlertStore } from '../../shared/stores/alertStore'
import type { AlertEvent } from '../../shared/types/dashboard'
import { roleApiMap, type Role } from '../../shared/types/roles'

export function useAlertStream(role: Role | null, enabled = true) {
  const addAlert = useAlertStore((state) => state.addAlert)

  const onMessage = useCallback(
    (alert: AlertEvent) => {
      const normalized = normalizeIncomingAlert(alert, role)
      if (normalized) {
        addAlert(normalized)
      }
    },
    [addAlert, role],
  )

  useSSEStream<AlertEvent>({
    endpoint: role ? `/api/v1/dashboards/${roleApiMap[role]}/alerts/stream` : '/api/v1/dashboards/ceo/alerts/stream',
    onMessage,
    enabled: enabled && Boolean(role),
  })
}
