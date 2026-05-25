import { AlertTriangle, Bot, Check, RotateCcw, Send, ShieldCheck, Sparkles, Square, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useCopilot } from './useCopilot'
import { useCopilotContext } from './useCopilotContext'
import { CopilotEmptyState } from './CopilotEmptyState'
import { useModalFocusTrap } from '../../shared/hooks/useModalFocusTrap'

export function CopilotSidebar() {
  const [question, setQuestion] = useState('')
  const [previewOnly, setPreviewOnly] = useState(false)
  const context = useCopilotContext()
  const {
    open,
    setOpen,
    messages,
    steps,
    approvals,
    recentActions,
    streaming,
    runStatus,
    sendMessage,
    cancel,
    refreshApprovals,
    refreshRecentActions,
    approve,
    reject,
    undo,
    clearConversation,
    expirePendingApprovals,
  } = useCopilot()
  const panelRef = useModalFocusTrap({ active: open, onEscape: () => setOpen(false) })

  useEffect(() => {
    void refreshApprovals()
    void refreshRecentActions()
  }, [refreshApprovals, refreshRecentActions])

  useEffect(() => {
    if (open) {
      void refreshApprovals()
      void refreshRecentActions()
    }
  }, [open, refreshApprovals, refreshRecentActions])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!question.trim()) {
      return
    }
    const input = question
    setQuestion('')
    await sendMessage(input, {
      dryRun: previewOnly,
      approveActions: true,
      uiContext: context,
    })
  }

  const statusChipClass =
    runStatus === 'COMPLETED'
      ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
      : runStatus === 'FAILED' || runStatus === 'TIMED_OUT'
        ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
        : runStatus === 'CANCELLED'
          ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
          : 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]'

  const placeholder = useMemo(() => `Ask AI Copilot about ${context.sectionLabel.toLowerCase()}...`, [context.sectionLabel])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <>
      <button
        type="button"
        className="copilot-fab"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close AI Copilot' : 'Open AI Copilot'}
        aria-expanded={open}
        aria-controls="copilot-panel"
      >
        <span className="copilot-fab__icon" aria-hidden>
          <Bot className="h-5 w-5" />
        </span>
        <span className="copilot-fab__label">AI Copilot</span>
        {approvals.filter((item) => item.status === 'PENDING').length > 0 ? (
          <span className="copilot-fab__badge">{approvals.filter((item) => item.status === 'PENDING').length}</span>
        ) : null}
      </button>

      {open ? (
        <div
          className="copilot-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
        >
          <aside ref={panelRef} id="copilot-panel" className="copilot-panel" role="dialog" aria-modal="true" aria-label="AI Copilot">
            <div className="copilot-panel__header">
              <div>
                <div className="copilot-panel__eyebrow">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {context.sectionLabel}
                </div>
                <h2 className="copilot-panel__title">AI Copilot</h2>
                <p className="copilot-panel__subtitle">{context.sectionSummary}</p>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)} aria-label="Close AI Copilot">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="copilot-panel__status">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusChipClass}`} role="status" aria-live="polite">
                {runStatus ?? 'IDLE'}
              </span>
              <div className="copilot-panel__status-note">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                All writes require approval. Undo is available where supported; otherwise you will see a warning first.
              </div>
            </div>

            <div className="copilot-panel__body">
              <section className="copilot-panel__section">
                <div className="copilot-panel__section-title">Conversation</div>
                <div className="copilot-thread">
                  {messages.length === 0 ? (
                    <CopilotEmptyState role={context.role ?? null} context={context} onPickSuggestion={setQuestion} />
                  ) : (
                    messages.slice(-10).map((message) => (
                      <article
                        key={message.id}
                        className={`copilot-message ${message.role === 'user' ? 'copilot-message--user' : 'copilot-message--assistant'}`}
                      >
                        {message.content || (streaming ? '...' : '')}
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="copilot-panel__section">
                <div className="copilot-panel__section-title">Suggested prompts</div>
                <div className="copilot-chip-list">
                  {(context.suggestedPrompts ?? []).slice(0, 4).map((prompt) => (
                    <button key={prompt} type="button" className="copilot-chip" onClick={() => setQuestion(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>

              <section className="copilot-panel__section">
                <div className="copilot-panel__section-row">
                  <div className="copilot-panel__section-title">Pending approvals</div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void expirePendingApprovals()}>
                    Expire stale
                  </button>
                </div>
                <div className="copilot-card-list">
                  {approvals.length === 0 ? <p className="copilot-muted">No pending approval requests.</p> : null}
                  {approvals.map((approval) => (
                    <div key={approval.id} className="copilot-card">
                      <div className="copilot-card__title">{approval.requestedAction}</div>
                      {approval.summary ? <p className="copilot-card__summary">{approval.summary}</p> : null}
                      <p className="copilot-card__meta">
                        {approval.status}
                        {approval.permissionCode ? ` · ${approval.permissionCode}` : ''}
                      </p>
                      {approval.warningMessage ? (
                        <p className="copilot-card__warning">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          {approval.warningMessage}
                        </p>
                      ) : null}
                      {approval.status === 'PENDING' ? (
                        <div className="copilot-card__actions">
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => void approve(approval.id)}>
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button type="button" className="btn btn--danger btn--sm" onClick={() => void reject(approval.id)}>
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="copilot-panel__section">
                <div className="copilot-panel__section-title">Recent AI actions</div>
                <div className="copilot-card-list">
                  {recentActions.length === 0 ? <p className="copilot-muted">No recent AI actions yet.</p> : null}
                  {recentActions.map((action) => (
                    <div key={action.id} className="copilot-card">
                      <div className="copilot-card__title">{action.title}</div>
                      {action.summary ? <p className="copilot-card__summary">{action.summary}</p> : null}
                      <p className="copilot-card__meta">
                        {action.status}
                        {action.permissionCode ? ` · ${action.permissionCode}` : ''}
                        {action.entityId ? ` · ${action.entityId}` : ''}
                      </p>
                      {action.warningMessage ? (
                        <p className="copilot-card__warning">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          {action.warningMessage}
                        </p>
                      ) : null}
                      {action.undoAvailable ? (
                        <div className="copilot-card__actions">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void undo(action.id)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Undo
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="copilot-panel__section">
                <div className="copilot-panel__section-title">Run timeline</div>
                <div className="copilot-card-list">
                  {steps.length === 0 ? <p className="copilot-muted">No run steps yet.</p> : null}
                  {steps.slice(-8).map((step) => (
                    <div key={`${step.step}-${step.type}`} className="copilot-card">
                      <div className="copilot-card__title">
                        #{step.step} {step.type}
                      </div>
                      <p className="copilot-card__meta">{step.status}</p>
                      {step.message ? <p className="copilot-card__summary">{step.message}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <form onSubmit={submit} className="copilot-panel__composer">
              <label className="copilot-toggle">
                <input type="checkbox" checked={previewOnly} onChange={(event) => setPreviewOnly(event.target.checked)} />
                <span>Preview only</span>
              </label>
              <textarea
                className="ui-input copilot-panel__textarea"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={placeholder}
                aria-label="Copilot question"
              />
              <div className="copilot-panel__composer-actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={clearConversation}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
                {streaming ? (
                  <button type="button" className="btn btn--danger" onClick={() => void cancel()}>
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                ) : (
                  <button type="submit" className="btn btn--primary" disabled={!question.trim()}>
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                )}
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>,
    document.body,
  )
}
