import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTillSession } from '../../hooks/useTillSession'
import { useDateRangeStore } from '../../shared/stores/dateRangeStore'
import { useAuthStore } from '../../shared/stores/authStore'
import { resolveCopilotContext } from './copilotContext'

export function useCopilotContext() {
  const location = useLocation()
  const role = useAuthStore((state) => state.role)
  const dateRange = useDateRangeStore((state) => state.dateRange)
  const preset = useDateRangeStore((state) => state.preset)
  const tillSession = useTillSession()

  return useMemo(
    () =>
      resolveCopilotContext({
        pathname: location.pathname,
        role,
        dateRange: {
          ...dateRange,
          preset,
        },
        tillSession: {
          sessionId: tillSession.session?.id ?? null,
          registerCode: tillSession.session?.posRegisterCode ?? null,
          isOpen: tillSession.isOpen,
        },
      }),
    [dateRange, location.pathname, preset, role, tillSession.isOpen, tillSession.session?.id, tillSession.session?.posRegisterCode],
  )
}
