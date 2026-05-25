import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { normalizeApiError } from '../shared/api/errors'
import {
  closeTillSession,
  fetchCurrentTillSession,
  fetchTillExpected,
  loadStoredCashCount,
  openTillSession,
  submitCashCount,
  type CashCountPayload,
  type CashCountResult,
  type OpenTillSessionRequest,
  type TillExpectedTotals,
  type TillSessionDto,
} from '../shared/api/tillSessions'
import { useAuthStore } from '../shared/stores/authStore'

const SESSION_ID_KEY = 'smartchain_till_session_id'

export interface TillRunningTotals {
  saleCount: number | null
  totalRwf: number
  expected: TillExpectedTotals | null
  lastCashCount: CashCountResult | null
}

export interface TillSessionContextValue {
  session: TillSessionDto | null
  isOpen: boolean
  loading: boolean
  error: string | null
  totals: TillRunningTotals | null
  refresh: () => Promise<void>
  openTill: (request: OpenTillSessionRequest) => Promise<TillSessionDto>
  closeTill: (closingCash: number, notes?: string) => Promise<TillSessionDto>
  submitCashCount: (payload: Omit<CashCountPayload, 'sessionId'>) => Promise<CashCountResult>
}

const TillSessionContext = createContext<TillSessionContextValue | null>(null)

function persistSessionId(id: string | null): void {
  if (id) {
    sessionStorage.setItem(SESSION_ID_KEY, id)
  } else {
    sessionStorage.removeItem(SESSION_ID_KEY)
  }
}

async function loadRunningTotals(session: TillSessionDto): Promise<TillRunningTotals> {
  const today = new Date().toISOString().slice(0, 10)
  let expected: TillExpectedTotals | null = null
  try {
    expected = await fetchTillExpected(today, session.posRegisterCode)
  } catch {
    expected = null
  }
  const tenderTotal =
    (expected?.cash ?? 0) +
    (expected?.momo ?? 0) +
    (expected?.airtelMoney ?? 0) +
    (expected?.card ?? 0)
  return {
    saleCount: null,
    totalRwf: tenderTotal,
    expected,
    lastCashCount: loadStoredCashCount(session.id),
  }
}

export function TillSessionProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [session, setSession] = useState<TillSessionDto | null>(null)
  const [totals, setTotals] = useState<TillRunningTotals | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setSession(null)
      setTotals(null)
      persistSessionId(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const current = await fetchCurrentTillSession()
      setSession(current)
      persistSessionId(current?.id ?? null)
      if (current) {
        setTotals(await loadRunningTotals(current))
      } else {
        setTotals(null)
      }
    } catch (err) {
      setError(normalizeApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!accessToken || !session) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    pollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const current = await fetchCurrentTillSession()
          if (current) {
            setSession(current)
            setTotals(await loadRunningTotals(current))
          }
        } catch {
          /* keep last known */
        }
      })()
    }, 30_000)
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
      }
    }
  }, [accessToken, session?.id])

  const openTill = useCallback(
    async (request: OpenTillSessionRequest) => {
      setLoading(true)
      setError(null)
      try {
        const opened = await openTillSession(request)
        setSession(opened)
        persistSessionId(opened.id)
        setTotals(await loadRunningTotals(opened))
        return opened
      } catch (err) {
        const message = normalizeApiError(err).message
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const closeTill = useCallback(async (closingCash: number, notes?: string) => {
    if (!session) {
      throw new Error('No open till session')
    }
    setLoading(true)
    setError(null)
    try {
      const closed = await closeTillSession(session.id, { closingCash, notes })
      setSession(null)
      setTotals(null)
      persistSessionId(null)
      sessionStorage.removeItem(`smartchain_till_cash_count_${session.id}`)
      return closed
    } catch (err) {
      const message = normalizeApiError(err).message
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  const submitCount = useCallback(
    async (payload: Omit<CashCountPayload, 'sessionId'>) => {
      if (!session) {
        throw new Error('No open till session')
      }
      setLoading(true)
      setError(null)
      try {
        const result = await submitCashCount({ ...payload, sessionId: session.id })
        setTotals(await loadRunningTotals(session))
        return result
      } catch (err) {
        const message = normalizeApiError(err).message
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [session],
  )

  const value = useMemo<TillSessionContextValue>(
    () => ({
      session,
      isOpen: session?.status === 'OPEN',
      loading,
      error,
      totals,
      refresh,
      openTill,
      closeTill,
      submitCashCount: submitCount,
    }),
    [session, loading, error, totals, refresh, openTill, closeTill, submitCount],
  )

  return <TillSessionContext.Provider value={value}>{children}</TillSessionContext.Provider>
}

export function useTillSession(): TillSessionContextValue {
  const ctx = useContext(TillSessionContext)
  if (!ctx) {
    throw new Error('useTillSession must be used within TillSessionProvider')
  }
  return ctx
}
