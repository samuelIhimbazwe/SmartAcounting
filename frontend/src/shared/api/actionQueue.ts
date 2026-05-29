import { apiClient } from './client'
import type { Role } from '../types/roles'
import { roleApiMap } from '../types/roles'

export type ActionHubCategory = 'PURCHASE_ORDER' | 'REORDER' | 'ANOMALY' | 'OTHER'
export type ActionHubSource = 'QUEUE' | 'RECOMMENDATION' | 'ANOMALY'

export interface ActionHubItem {
  id: string
  source: ActionHubSource
  category: ActionHubCategory
  categoryLabel?: string
  title?: string
  requestedAction?: string
  summary?: string
  lines?: string[]
  meta?: string
  priority?: string
  overdue?: boolean
  status?: string
  actionType?: string
  requestedBy?: string
  createdAt?: string
  viewRoute?: string | null
  processedAt?: string
}

export interface ActionHubResponse {
  pendingCount: number
  overdueCount: number
  urgent: ActionHubItem[]
  pending: ActionHubItem[]
  completedToday: ActionHubItem[]
}

export async function fetchActionHub(role: Role) {
  const { data } = await apiClient.get<ActionHubResponse>('/api/v1/actions', {
    params: { role: roleApiMap[role] },
  })
  return data
}

export async function processAction(
  item: Pick<ActionHubItem, 'id' | 'source' | 'actionType'>,
  decision: string,
  role: Role,
  reason?: string,
) {
  const normalizedDecision =
    item.source === 'ANOMALY' && decision === 'APPROVE' ? 'MARK_RESOLVED' : decision

  const { data } = await apiClient.post<Record<string, unknown>>(
    `/api/v1/actions/${encodeURIComponent(item.id)}/process`,
    {
      decision: normalizedDecision,
      reason: reason ?? null,
      source: item.source,
      actionType: item.actionType ?? null,
    },
    { params: { role: roleApiMap[role] } },
  )
  return data
}
