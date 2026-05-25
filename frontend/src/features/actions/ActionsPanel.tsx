import { useState } from 'react'
import { useExecuteRecommendedAction, useRecommendedActions } from './useRecommendedActions'
import { ActionCard } from './ActionCard'
import type { RecommendedAction } from '../../shared/types/dashboard'
import type { Role } from '../../shared/types/roles'

export function ActionsPanel({ role }: { role: Role }) {
  const { data, isLoading } = useRecommendedActions(role)
  const execute = useExecuteRecommendedAction(role)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const onExecute = async (action: RecommendedAction) => {
    setLastMessage(null)
    try {
      await execute.mutateAsync({ id: action.id, type: action.type })
      setLastMessage(`Action ${action.title} executed and queued successfully.`)
    } catch {
      setLastMessage(`Action ${action.title} failed to execute. Retry from panel.`)
    }
  }

  return (
    <aside className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-card)]">
      <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-neutral-500">Recommended Actions</h3>
      {isLoading && <p className="mt-2 text-sm text-neutral-500">Loading actions...</p>}
      <div className="mt-3 flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 2 }, (_, idx) => (
            <article key={`skeleton-${idx}`} className="rounded-lg border border-[var(--border-subtle)] p-3">
              <span className="mb-2 block h-4 w-2/3 animate-pulse rounded bg-[var(--surface-overlay)]" />
              <span className="block h-3 w-full animate-pulse rounded bg-[var(--surface-overlay)]" />
              <span className="mt-2 block h-7 w-24 animate-pulse rounded bg-[var(--surface-overlay)]" />
            </article>
          ))}
        {(data ?? []).map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            executing={execute.isPending && execute.variables?.type === action.type && execute.variables?.id === action.id}
            onExecute={onExecute}
          />
        ))}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="m-0 text-sm text-neutral-500">No recommended actions right now.</p>
        )}
      </div>
      {lastMessage && (
        <p className="mt-2 text-xs text-neutral-600" role="status" aria-live="polite">
          {lastMessage}
        </p>
      )}
    </aside>
  )
}
