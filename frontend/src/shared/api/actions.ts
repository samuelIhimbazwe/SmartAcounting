import { apiClient } from './client'
import { normalizeAlertRoute } from '../alerts/alertUtils'
import { roleApiMap, type Role } from '../types/roles'
import type { RecommendedAction } from '../types/dashboard'

interface RawRecommendedActionDto {
  id?: string
  type?: string
  title?: string
  description?: string
  priority?: string
  label?: string
  impact?: string
}

function fallbackActions(role: Role): RecommendedAction[] {
  return [
    {
      id: `${role}-action-1`,
      type: 'REVIEW_AR',
      title: 'Review overdue receivables',
      description: 'Focus on high-value overdue items and trigger follow-up workflow.',
      priority: 'HIGH',
    },
    {
      id: `${role}-action-2`,
      type: 'VERIFY_FORECAST',
      title: 'Validate forecast variance',
      description: 'Variance exceeds tolerance in at least one major category.',
      priority: 'MEDIUM',
    },
  ]
}

function normalizePriority(priority: unknown): RecommendedAction['priority'] {
  const value = typeof priority === 'string' ? priority.toUpperCase() : 'MEDIUM'
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL') {
    return value
  }
  return 'MEDIUM'
}

function normalizeRecommendedAction(raw: RawRecommendedActionDto): RecommendedAction | null {
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null
  const type = typeof raw.type === 'string' && raw.type.trim() ? raw.type.trim() : null
  if (!id || !type) {
    return null
  }

  if (typeof raw.title === 'string' && typeof raw.description === 'string') {
    return {
      id,
      type,
      title: raw.title,
      description: raw.description,
      priority: normalizePriority(raw.priority),
      targetRoute: null,
      targetApi: null,
    }
  }

  const label = typeof raw.label === 'string' ? raw.label.trim() : type
  const separator = label.indexOf(' — ')
  const title = separator >= 0 ? label.slice(0, separator).trim() : label
  const description = separator >= 0 ? label.slice(separator + 3).trim() : ''
  const impact = typeof raw.impact === 'string' ? raw.impact.trim() : ''
  const parts = impact.split(' | ').map((part) => part.trim()).filter(Boolean)
  const priority = normalizePriority(parts[0] ?? raw.priority)
  const meta = parts.slice(1)
  let targetRoute: string | null = null
  let targetApi: string | null = null

  for (const part of meta) {
    if (part.startsWith('route:')) {
      targetRoute = normalizeAlertRoute(part.slice(6).trim())
    } else if (part.startsWith('api:')) {
      const api = part.slice(4).trim()
      targetApi = api || null
    }
  }

  return {
    id,
    type,
    title,
    description,
    priority,
    targetRoute,
    targetApi,
  }
}

export async function getRecommendedActions(role: Role) {
  try {
    const response = await apiClient.get<RawRecommendedActionDto[]>(`/api/v1/dashboards/${roleApiMap[role]}/actions`)
    if (!Array.isArray(response.data)) {
      return fallbackActions(role)
    }
    const normalized = response.data.map(normalizeRecommendedAction).filter((action): action is RecommendedAction => Boolean(action))
    return normalized.length > 0 ? normalized : fallbackActions(role)
  } catch {
    return fallbackActions(role)
  }
}

export async function executeRecommendedAction(action: Pick<RecommendedAction, 'type' | 'id'>) {
  const response = await apiClient.post(`/api/v1/dashboards/actions/${encodeURIComponent(action.type)}`, {
    type: action.type,
    actionId: action.id,
  })
  return response.data
}
