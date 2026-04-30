import { apiClient } from './client'
import { useAuthStore } from '../stores/authStore'
import type { AgentApproval, StartCopilotRunRequest } from '../types/copilot'

export interface StreamEvent {
  event: string
  runId?: string
  payload?: Record<string, unknown>
}

export interface CopilotRunDetails {
  runId: string
  status: string
  error?: string | null
}

function extractResponseError(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const record = payload as Record<string, unknown>
  if (typeof record.message === 'string') {
    return record.message
  }
  if (typeof record.error === 'string') {
    return record.error
  }
  return null
}

function parseSseChunk(chunk: string): StreamEvent[] {
  return chunk
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => {
      const eventMatch = frame.match(/^event:\s*(.+)$/m)
      const dataMatch = frame.match(/^data:\s*(.+)$/m)
      let payload: Record<string, unknown> | undefined
      if (dataMatch) {
        try {
          payload = JSON.parse(dataMatch[1]) as Record<string, unknown>
        } catch {
          payload = { text: dataMatch[1] }
        }
      }

      return {
        event: eventMatch?.[1] ?? (typeof payload?.event === 'string' ? payload.event : 'message'),
        runId: typeof payload?.runId === 'string' ? payload.runId : undefined,
        payload,
      }
    })
}

export async function streamCopilotRun(
  request: StartCopilotRunRequest,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
) {
  const { accessToken, tenantId, userId } = useAuthStore.getState()
  const response = await fetch('/api/v1/ai/copilot/agent/run/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'X-Tenant-Id': tenantId,
      'X-User-Id': userId,
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    let parsed: unknown = null
    try {
      parsed = await response.json()
    } catch {
      // Ignore non-JSON errors and fall back to status text.
    }
    const error = extractResponseError(parsed)
    throw new Error(error ?? response.statusText ?? 'Copilot stream request failed')
  }

  if (!response.body) {
    throw new Error('No stream body available')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      parseSseChunk(frame).forEach(onEvent)
    }
  }
}

export async function getCopilotRun(runId: string): Promise<CopilotRunDetails> {
  const response = await apiClient.get<Record<string, unknown>>(`/api/v1/ai/copilot/agent/runs/${runId}`)
  const payload = response.data
  return {
    runId: typeof payload.runId === 'string' ? payload.runId : runId,
    status: typeof payload.status === 'string' ? payload.status : 'FAILED',
    error: typeof payload.error === 'string' ? payload.error : null,
  }
}

export async function cancelCopilotRun(runId: string) {
  await apiClient.post(`/api/v1/ai/copilot/agent/runs/${runId}/cancel`)
}

export async function listApprovals() {
  try {
    const response = await apiClient.get<{ content?: AgentApproval[] } | AgentApproval[]>(
      '/api/v1/ai/copilot/agent/approvals',
      { params: { page: 0, size: 20 } },
    )

    if (Array.isArray(response.data)) {
      return response.data
    }
    return response.data.content ?? []
  } catch {
    return []
  }
}

export async function approveAction(id: string) {
  await apiClient.post(`/api/v1/ai/copilot/agent/approvals/${id}/approve`)
}

export async function rejectAction(id: string, reason?: string) {
  await apiClient.post(`/api/v1/ai/copilot/agent/approvals/${id}/reject`, reason ? { reason } : {})
}

export async function expireApprovals() {
  await apiClient.post('/api/v1/ai/copilot/agent/approvals/expire')
}
