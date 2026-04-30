import { useCallback, useRef } from 'react'
import {
  approveAction,
  cancelCopilotRun,
  expireApprovals,
  getCopilotRun,
  listApprovals,
  rejectAction,
  streamCopilotRun,
} from '../../shared/api/copilot'
import { useCopilotStore } from '../../shared/stores/copilotStore'
import { useAuthStore } from '../../shared/stores/authStore'
import type { RunStatus } from '../../shared/types/copilot'

export function useCopilot() {
  const role = useAuthStore((state) => state.role)
  const open = useCopilotStore((state) => state.open)
  const runId = useCopilotStore((state) => state.runId)
  const runStatus = useCopilotStore((state) => state.runStatus)
  const streaming = useCopilotStore((state) => state.streaming)
  const messages = useCopilotStore((state) => state.messages)
  const steps = useCopilotStore((state) => state.steps)
  const approvals = useCopilotStore((state) => state.approvals)

  const toggleOpen = useCopilotStore((state) => state.toggleOpen)
  const setRunState = useCopilotStore((state) => state.setRunState)
  const setStreaming = useCopilotStore((state) => state.setStreaming)
  const addMessage = useCopilotStore((state) => state.addMessage)
  const appendAssistantText = useCopilotStore((state) => state.appendAssistantText)
  const upsertStep = useCopilotStore((state) => state.upsertStep)
  const setApprovals = useCopilotStore((state) => state.setApprovals)
  const abortRef = useRef<AbortController | null>(null)

  const refreshApprovals = useCallback(async () => {
    const approvals = await listApprovals()
    setApprovals(approvals)
  }, [setApprovals])

  const sendMessage = useCallback(
    async (question: string) => {
      if (!role || !question.trim()) {
        return
      }

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      })
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      })
      setStreaming(true)
      setRunState(null, 'RUNNING')
      let activeRunId: string | null = null
      let finalStatus: RunStatus | null = null

      try {
        await streamCopilotRun(
          { role, question, dryRun: true, approveActions: false },
          (event) => {
            if (event.runId) {
              activeRunId = event.runId
              setRunState(event.runId, 'RUNNING')
            }

            if (event.event === 'step') {
              const payload = event.payload ?? {}
              const step = Number(payload.step ?? 0)
              const type = String(payload.type ?? 'STEP')
              const status = String(payload.status ?? 'COMPLETED')
              upsertStep({
                step,
                type,
                status:
                  status === 'COMPLETED' ||
                  status === 'BLOCKED' ||
                  status === 'SKIPPED' ||
                  status === 'PREVIEW' ||
                  status === 'PENDING_APPROVAL' ||
                  status === 'CANCELLED' ||
                  status === 'TIMED_OUT' ||
                  status === 'FAILED'
                    ? status
                    : 'COMPLETED',
                message: typeof payload.message === 'string' ? payload.message : undefined,
              })
            }

            if (event.event === 'completed') {
              finalStatus = 'COMPLETED'
              setRunState(event.runId ?? activeRunId ?? runId, 'COMPLETED')
            }
            if (event.event === 'failed') {
              finalStatus = 'FAILED'
              setRunState(event.runId ?? activeRunId ?? runId, 'FAILED')
            }
            if (event.event === 'cancelled') {
              finalStatus = 'CANCELLED'
              setRunState(event.runId ?? activeRunId ?? runId, 'CANCELLED')
            }
            if (event.event === 'timed_out') {
              finalStatus = 'TIMED_OUT'
              setRunState(event.runId ?? activeRunId ?? runId, 'TIMED_OUT')
            }
            if (event.event === 'done' && !finalStatus) {
              finalStatus = 'COMPLETED'
              setRunState(event.runId ?? activeRunId ?? runId, 'COMPLETED')
            }

            const payload = event.payload ?? {}
            if (typeof payload.answer === 'string') {
              appendAssistantText(payload.answer)
            } else if (typeof payload.token === 'string') {
              appendAssistantText(payload.token)
            } else if (typeof payload.text === 'string' && event.event === 'message') {
              appendAssistantText(payload.text)
            }
          },
          abortRef.current.signal,
        )
        if (!finalStatus) {
          finalStatus = 'COMPLETED'
          setRunState(activeRunId ?? runId, 'COMPLETED')
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Copilot stream unavailable.'
        appendAssistantText(`\n${message}\n`)
        finalStatus = 'FAILED'
        setRunState(activeRunId ?? runId, 'FAILED')
      } finally {
        if (activeRunId && finalStatus === 'FAILED') {
          try {
            const runDetails = await getCopilotRun(activeRunId)
            if (runDetails.error) {
              appendAssistantText(`\nRun error: ${runDetails.error}\n`)
            }
          } catch {
            // If run status retrieval fails, keep the original stream error.
          }
        }
        setStreaming(false)
        void refreshApprovals()
      }
    },
    [addMessage, appendAssistantText, refreshApprovals, role, runId, setRunState, setStreaming, upsertStep],
  )

  const cancel = useCallback(async () => {
    abortRef.current?.abort()
    const activeRunId = useCopilotStore.getState().runId
    if (activeRunId) {
      try {
        await cancelCopilotRun(activeRunId)
      } catch {
        // Run may already be complete or unavailable.
      }
    }
    setStreaming(false)
    setRunState(activeRunId ?? runId, 'CANCELLED')
  }, [runId, setRunState, setStreaming])

  const approve = useCallback(
    async (id: string) => {
      await approveAction(id)
      await refreshApprovals()
    },
    [refreshApprovals],
  )

  const reject = useCallback(
    async (id: string) => {
      await rejectAction(id, 'Rejected in frontend review')
      await refreshApprovals()
    },
    [refreshApprovals],
  )

  const expirePendingApprovals = useCallback(async () => {
    await expireApprovals()
    await refreshApprovals()
  }, [refreshApprovals])

  return {
    open,
    runId,
    runStatus,
    streaming,
    messages,
    steps,
    approvals,
    toggleOpen,
    sendMessage,
    cancel,
    refreshApprovals,
    approve,
    reject,
    expirePendingApprovals,
  }
}
