import { apiClient } from './client'

export interface TillSessionDto {
  id: string
  tillId: string
  locationId?: string
  registerId?: string
  posRegisterCode: string
  cashierId: string
  shiftId?: string
  openedAt: string
  closedAt?: string
  openingFloat: number
  closingCash?: number
  variance?: number
  status: string
  notes?: string
}

export interface OpenTillSessionRequest {
  posRegisterCode: string
  openingFloat: number
  shiftId?: string
  registerId?: string
  locationId?: string
}

export interface CloseTillSessionRequest {
  closingCash: number
  notes?: string
}

export interface TillExpectedTotals {
  businessDate: string
  posRegisterCode: string
  cash: number
  momo: number
  airtelMoney: number
  card: number
  onAccount: number
}

export interface CashCountPayload {
  sessionId: string
  denominations: Record<string, number>
  total: number
  notes?: string
}

export interface CashCountResult {
  total: number
  expectedCash: number
  variance: number
  notes?: string
  savedAt: string
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function mapSession(data: TillSessionDto): TillSessionDto {
  return {
    ...data,
    openingFloat: toNumber(data.openingFloat),
    closingCash: data.closingCash !== undefined ? toNumber(data.closingCash) : undefined,
    variance: data.variance !== undefined ? toNumber(data.variance) : undefined,
  }
}

export async function fetchCurrentTillSession(): Promise<TillSessionDto | null> {
  try {
    const { data } = await apiClient.get<TillSessionDto>('/api/v1/pos/till-sessions/current')
    return mapSession(data)
  } catch (error: unknown) {
    const status = (error as { status?: number }).status
    const message = String((error as { message?: string }).message ?? '')
    if (status === 404 || status === 400 || message.toLowerCase().includes('no open till')) {
      return null
    }
    throw error
  }
}

export async function openTillSession(body: OpenTillSessionRequest): Promise<TillSessionDto> {
  const { data } = await apiClient.post<TillSessionDto>('/api/v1/pos/till-sessions', {
    ...body,
    openingFloat: body.openingFloat,
  })
  return mapSession(data)
}

export async function closeTillSession(
  sessionId: string,
  body: CloseTillSessionRequest,
): Promise<TillSessionDto> {
  const { data } = await apiClient.patch<TillSessionDto>(
    `/api/v1/pos/till-sessions/${sessionId}/close`,
    body,
  )
  return mapSession(data)
}

export async function fetchTillExpected(
  businessDate: string,
  posRegisterCode: string,
): Promise<TillExpectedTotals> {
  const { data } = await apiClient.get<Record<string, unknown>>('/api/v1/retail/till/expected', {
    params: { businessDate, posRegisterCode },
  })
  return {
    businessDate: String(data.businessDate ?? businessDate),
    posRegisterCode: String(data.posRegisterCode ?? posRegisterCode),
    cash: toNumber(data.cash),
    momo: toNumber(data.momo),
    airtelMoney: toNumber(data.airtelMoney),
    card: toNumber(data.card),
    onAccount: toNumber(data.onAccount),
  }
}

export async function fetchZReportPreview(
  tillSessionId: string,
  reportType: 'X' | 'Z',
  closingCash?: number,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>('/api/v1/reports/z-report', {
    params: {
      tillSessionId,
      reportType,
      ...(closingCash !== undefined ? { closingCash } : {}),
    },
  })
  return data
}

const CASH_COUNT_STORAGE_PREFIX = 'smartchain_till_cash_count_'

export function loadStoredCashCount(sessionId: string): CashCountResult | null {
  try {
    const raw = sessionStorage.getItem(`${CASH_COUNT_STORAGE_PREFIX}${sessionId}`)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as CashCountResult
  } catch {
    return null
  }
}

/**
 * Mid-shift cash count: persisted client-side and reconciled against
 * GET /retail/till/expected (no dedicated cash-count endpoint on API yet).
 */
export async function submitCashCount(payload: CashCountPayload): Promise<CashCountResult> {
  const today = new Date().toISOString().slice(0, 10)
  const session = await fetchCurrentTillSession()
  const register = session?.posRegisterCode ?? ''
  const expected = await fetchTillExpected(today, register)
  const expectedCash = expected.cash + (session?.openingFloat ?? 0)
  const variance = payload.total - expectedCash
  const result: CashCountResult = {
    total: payload.total,
    expectedCash,
    variance,
    notes: payload.notes,
    savedAt: new Date().toISOString(),
  }
  sessionStorage.setItem(
    `${CASH_COUNT_STORAGE_PREFIX}${payload.sessionId}`,
    JSON.stringify({ ...result, denominations: payload.denominations }),
  )
  return result
}

export function openTillReportWindow(tillSessionId: string, reportType: 'X' | 'Z' = 'X'): void {
  void fetchZReportPreview(tillSessionId, reportType)
    .then((report) => {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    })
    .catch(() => {
      window.alert('Could not load X/Z report. Check you are signed in and try again.')
    })
}
