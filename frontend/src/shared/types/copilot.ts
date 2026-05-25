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

export interface CopilotDateRangeContext {
  from: string
  to: string
  preset?: string
}

export interface CopilotTillSessionContext {
  sessionId?: string | null
  registerCode?: string | null
  isOpen: boolean
}

export interface CopilotUiContext {
  path: string
  sectionKey: string
  sectionLabel: string
  sectionSummary: string
  entityType?: string
  entityId?: string
  role?: Role | null
  dateRange?: CopilotDateRangeContext
  tillSession?: CopilotTillSessionContext
  suggestedPrompts?: string[]
  suggestedActionLabels?: string[]
  allowedActionTypes?: string[]
}

export interface AgentApproval {
  id: string
  runId?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_REQUIRED'
  requestedAction: string
  summary?: string
  permissionCode?: string | null
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_REQUIRED'
  approvalExpiresAt?: string | null
  createdAt?: string | null
  reversible?: boolean
  undoAvailable?: boolean
  warningMessage?: string | null
  preview?: Record<string, unknown> | null
}

export interface CopilotRecentAction {
  id: string
  type: string
  status: string
  title: string
  summary?: string
  permissionCode?: string | null
  reversible: boolean
  undoAvailable: boolean
  warningMessage?: string | null
  entityType?: string | null
  entityId?: string | null
  createdAt?: string | null
  processedAt?: string | null
}

export interface StartCopilotRunRequest {
  role: Role
  question: string
  dryRun?: boolean
  approveActions?: boolean
  uiContext?: CopilotUiContext
}
