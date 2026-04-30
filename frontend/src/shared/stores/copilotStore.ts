import { create } from 'zustand'
import type { AgentApproval, CopilotMessage, CopilotStep, RunStatus } from '../types/copilot'

interface CopilotState {
  open: boolean
  runId: string | null
  runStatus: RunStatus | null
  streaming: boolean
  messages: CopilotMessage[]
  steps: CopilotStep[]
  approvals: AgentApproval[]
  toggleOpen: () => void
  setRunState: (runId: string | null, status: RunStatus | null) => void
  setStreaming: (streaming: boolean) => void
  addMessage: (message: CopilotMessage) => void
  appendAssistantText: (text: string) => void
  upsertStep: (step: CopilotStep) => void
  setApprovals: (approvals: AgentApproval[]) => void
}

export const useCopilotStore = create<CopilotState>((set) => ({
  open: true,
  runId: null,
  runStatus: null,
  streaming: false,
  messages: [],
  steps: [],
  approvals: [],
  toggleOpen: () => set((state) => ({ open: !state.open })),
  setRunState: (runId, runStatus) => set({ runId, runStatus }),
  setStreaming: (streaming) => set({ streaming }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  appendAssistantText: (text) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (!last || last.role !== 'assistant') {
        messages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
        })
      } else {
        messages[messages.length - 1] = { ...last, content: `${last.content}${text}` }
      }
      return { messages }
    }),
  upsertStep: (step) =>
    set((state) => {
      const existing = state.steps.findIndex((item) => item.step === step.step && item.type === step.type)
      if (existing === -1) {
        return { steps: [...state.steps, step].sort((a, b) => a.step - b.step) }
      }
      const updated = [...state.steps]
      updated[existing] = step
      return { steps: updated.sort((a, b) => a.step - b.step) }
    }),
  setApprovals: (approvals) => set({ approvals }),
}))
