import { Bot, Check, ChevronLeft, ChevronRight, Send, Square, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useCopilot } from './useCopilot'

export function CopilotSidebar() {
  const [question, setQuestion] = useState('')
  const {
    open,
    toggleOpen,
    messages,
    steps,
    approvals,
    streaming,
    runStatus,
    sendMessage,
    cancel,
    refreshApprovals,
    approve,
    reject,
    expirePendingApprovals,
  } = useCopilot()

  useEffect(() => {
    void refreshApprovals()
  }, [refreshApprovals])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!question.trim()) {
      return
    }
    const input = question
    setQuestion('')
    await sendMessage(input)
  }

  const statusChipClass =
    runStatus === 'COMPLETED'
      ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
      : runStatus === 'FAILED' || runStatus === 'TIMED_OUT'
        ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
        : runStatus === 'CANCELLED'
          ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
          : 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]'

  return (
    <aside
      className={`border-l border-[var(--border-subtle)] bg-white transition-all duration-200 ${open ? 'w-[380px]' : 'w-14'} shrink-0`}
    >
      <div className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] px-3">
        <div className={`flex items-center gap-2 ${open ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          <Bot className="h-4 w-4 text-[var(--color-brand-700)]" />
          <p className="m-0 font-[var(--font-display)] text-sm font-semibold text-neutral-900">AI Copilot</p>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          className="rounded-md border border-[var(--border-default)] p-1.5 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label={open ? 'Collapse AI Copilot panel' : 'Expand AI Copilot panel'}
          aria-expanded={open}
          aria-controls="copilot-panel"
        >
          {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div id="copilot-panel" className="flex h-[calc(100vh-56px)] flex-col">
          <div className="space-y-2 border-b border-[var(--border-subtle)] p-3">
            <p className="m-0 text-xs uppercase tracking-wider text-neutral-500">Run status</p>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusChipClass}`} role="status" aria-live="polite">
                {runStatus ?? 'IDLE'}
              </span>
              {streaming && (
                <button
                  type="button"
                  onClick={() => void cancel()}
                  className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-[var(--status-danger-text)] transition-colors hover:bg-[var(--status-danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-auto p-3">
            <section>
              <p className="m-0 mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Conversation</p>
              <div className="space-y-2">
                {messages.length === 0 && <p className="m-0 text-xs text-neutral-500">Start by asking a finance question.</p>}
                {messages.slice(-8).map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'ml-6 bg-[var(--color-brand-10)] text-[var(--color-brand-900)]'
                        : 'mr-6 bg-[var(--surface-overlay)] text-neutral-800'
                    }`}
                  >
                    {message.content || (streaming ? '...' : '')}
                  </article>
                ))}
              </div>
            </section>

            <section>
              <p className="m-0 mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Run timeline</p>
              <div className="space-y-1">
                {steps.slice(-8).map((step) => (
                  <div key={`${step.step}-${step.type}`} className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-1.5">
                    <p className="m-0 text-xs font-semibold text-neutral-800">
                      #{step.step} {step.type}
                    </p>
                    <p className="m-0 text-xs text-neutral-500">{step.status}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="m-0 text-[11px] uppercase tracking-wider text-neutral-500">Pending approvals</p>
                <button
                  type="button"
                  className="rounded px-1 py-0.5 text-[11px] text-neutral-600 underline-offset-2 transition-colors hover:bg-[var(--surface-overlay)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  onClick={() => void expirePendingApprovals()}
                >
                  Expire stale
                </button>
              </div>
              <div className="space-y-2">
                {approvals.length === 0 && <p className="m-0 text-xs text-neutral-500">No pending requests.</p>}
                {approvals.map((approval) => (
                  <div key={approval.id} className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2">
                    <p className="m-0 text-xs font-semibold text-neutral-800">{approval.requestedAction}</p>
                    <p className="m-0 text-xs text-neutral-500">{approval.status}</p>
                    {approval.status === 'PENDING' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded bg-[var(--color-brand-700)] px-2 py-1 text-xs text-white transition-colors hover:bg-[var(--color-brand-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                          onClick={() => void approve(approval.id)}
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded bg-[var(--color-danger)] px-2 py-1 text-xs text-white transition-colors hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                          onClick={() => void reject(approval.id)}
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <form onSubmit={submit} className="border-t border-[var(--border-subtle)] p-3">
            <textarea
              className="h-20 w-full resize-none rounded-md border border-[var(--border-default)] px-2 py-1.5 text-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask finance Copilot..."
              aria-label="Copilot question"
            />
            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-[var(--color-brand-700)] px-3 py-2 text-sm text-white transition-colors hover:bg-[var(--color-brand-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </form>
        </div>
      )}
    </aside>
  )
}
