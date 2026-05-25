import type { AlertEvent } from '../types/dashboard'

const LEGACY_ROUTE_ALIASES: Record<string, string> = {
  '/accounting/close': '/finance/close',
  '/inventory/low-stock': '/retail',
  '/inventory/shrinkage': '/retail',
  '/retail/till': '/till',
  '/finance/reconciliation': '/finance/bank-accounts',
  '/finance/journal-entries': '/finance/close',
  '/hr/leave': '/hr/attendance',
}

function simpleHash(input: string): string {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}

export function inferAlertSeverity(message: string): AlertEvent['severity'] {
  const lower = message.toLowerCase()
  if (lower.includes('critical') || lower.includes('90+')) {
    return 'CRITICAL'
  }
  if (lower.includes('expir') || lower.includes('unmatched') || lower.includes('overdue') || lower.includes('below')) {
    return 'HIGH'
  }
  if (lower.includes('review') || lower.includes('pending')) {
    return 'MEDIUM'
  }
  return 'LOW'
}

export function normalizeAlertRoute(route: string | null | undefined, role?: string | null): string | null {
  if (!route || !route.trim() || route.startsWith('/api/')) {
    return null
  }

  const trimmed = route.trim()
  if (trimmed === '/anomaly/cases') {
    const dashboardRole = typeof role === 'string' && role.trim().length > 0 ? role.toLowerCase() : 'ceo'
    return `/dashboard/${dashboardRole}`
  }

  if (LEGACY_ROUTE_ALIASES[trimmed]) {
    return LEGACY_ROUTE_ALIASES[trimmed]
  }

  if (trimmed.startsWith('/dashboards/')) {
    return trimmed.replace('/dashboards/', '/dashboard/')
  }

  return trimmed
}

export function splitAlertMetadata(
  raw: string,
  role?: string | null,
): { text: string; targetRoute: string | null; targetApi: string | null } {
  const pipe = raw.indexOf(' | ')
  let text = raw.trim()
  let targetRoute: string | null = null
  let targetApi: string | null = null

  if (pipe >= 0) {
    text = raw.slice(0, pipe).trim()
    const meta = raw.slice(pipe + 3).trim()
    if (meta.startsWith('route:')) {
      targetRoute = normalizeAlertRoute(meta.slice(6).trim(), role)
    } else if (meta.startsWith('api:')) {
      const api = meta.slice(4).trim()
      targetApi = api || null
    }
  }

  return { text, targetRoute, targetApi }
}

export function buildAlertId(message: string, role: string, targetRoute?: string | null, targetApi?: string | null): string {
  return `alert-${simpleHash(`${role}|${message}|${targetRoute ?? ''}|${targetApi ?? ''}`)}`
}

export function parseDashboardAlertLine(raw: string, role: string): AlertEvent {
  const parsed = splitAlertMetadata(raw, role)
  return {
    id: buildAlertId(parsed.text, role, parsed.targetRoute, parsed.targetApi),
    title: parsed.text,
    message: parsed.text,
    severity: inferAlertSeverity(parsed.text),
    role,
    timestamp: new Date().toISOString(),
    targetRoute: parsed.targetRoute,
    targetApi: parsed.targetApi,
    source: 'dashboard',
  }
}

export function normalizeIncomingAlert(input: unknown, fallbackRole?: string | null): AlertEvent | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const record = input as Record<string, unknown>
  const role = typeof record.role === 'string' && record.role.trim() ? record.role.trim() : fallbackRole ?? 'UNKNOWN'
  const rawText =
    typeof record.message === 'string' && record.message.trim()
      ? record.message
      : typeof record.title === 'string' && record.title.trim()
        ? record.title
        : 'New alert'
  const parsed = splitAlertMetadata(rawText, role)
  const title =
    typeof record.title === 'string' && record.title.trim()
      ? record.title.trim()
      : parsed.text
  const severityValue = typeof record.severity === 'string' ? record.severity.toUpperCase() : inferAlertSeverity(parsed.text)
  const severity =
    severityValue === 'LOW' || severityValue === 'MEDIUM' || severityValue === 'HIGH' || severityValue === 'CRITICAL'
      ? severityValue
      : inferAlertSeverity(parsed.text)
  const timestamp =
    typeof record.timestamp === 'string' && record.timestamp.trim()
      ? record.timestamp
      : typeof record.ts === 'string' && record.ts.trim()
        ? record.ts
        : new Date().toISOString()
  const targetRoute =
    typeof record.targetRoute === 'string' && record.targetRoute.trim()
      ? normalizeAlertRoute(record.targetRoute, role)
      : typeof record.route === 'string' && record.route.trim()
        ? normalizeAlertRoute(record.route, role)
        : parsed.targetRoute
  const targetApi =
    typeof record.targetApi === 'string' && record.targetApi.trim()
      ? record.targetApi.trim()
      : typeof record.api === 'string' && record.api.trim()
        ? record.api.trim()
        : parsed.targetApi

  return {
    id:
      typeof record.id === 'string' && record.id.trim()
        ? record.id.trim()
        : buildAlertId(parsed.text, role, targetRoute, targetApi),
    title,
    message: parsed.text,
    severity,
    role,
    timestamp,
    targetRoute,
    targetApi,
    source: 'stream',
  }
}
