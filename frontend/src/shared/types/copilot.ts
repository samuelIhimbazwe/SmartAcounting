import type { Role } from './roles'

export type RunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT'
export type StepStatus =
  | 'COMPLETED'
  | 'BLOCKED'
  | 'SKIPPED'
  | 'PREVIEW'
  | 'PENDING_APPROVAL'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'FAILED'

export interface CopilotStep {
  step: number
  type: string
  status: StepStatus
  message?: string
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface AgentApproval {
  id: string
  runId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_REQUIRED'
  requestedAction: string
}

export interface StartCopilotRunRequest {
  role: Role
  question: string
  dryRun?: boolean
  approveActions?: boolean
}
