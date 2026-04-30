import { apiClient } from './client'
import { roleApiMap, type Role } from '../types/roles'
import type { RecommendedAction } from '../types/dashboard'

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

export async function getRecommendedActions(role: Role) {
  try {
    const response = await apiClient.get<RecommendedAction[]>(`/api/v1/dashboards/${roleApiMap[role]}/actions`)
    return Array.isArray(response.data) ? response.data : fallbackActions(role)
  } catch {
    return fallbackActions(role)
  }
}

export async function executeRecommendedAction(type: string) {
  const response = await apiClient.post(`/api/v1/dashboards/actions/${encodeURIComponent(type)}`)
  return response.data
}
