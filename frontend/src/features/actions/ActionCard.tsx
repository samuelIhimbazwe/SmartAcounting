import { Play } from 'lucide-react'
import type { RecommendedAction } from '../../shared/types/dashboard'

interface ActionCardProps {
  action: RecommendedAction
  executing: boolean
  onExecute: (type: string) => void
}

const priorityClass: Record<RecommendedAction['priority'], string> = {
  LOW: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]',
  MEDIUM: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
  HIGH: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
  CRITICAL: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
}

export function ActionCard({ action, executing, onExecute }: ActionCardProps) {
  return (
    <article className="rounded-lg border border-[var(--border-subtle)] p-3 transition-shadow hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="m-0 text-sm font-semibold text-neutral-800">{action.title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass[action.priority]}`}>
          {action.priority}
        </span>
      </div>
      <p className="m-0 text-xs text-neutral-600">{action.description}</p>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-[var(--surface-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-200)] disabled:opacity-60"
        onClick={() => onExecute(action.type)}
        disabled={executing}
        aria-label={`Execute action ${action.title}`}
        aria-busy={executing}
      >
        <Play className="h-3 w-3" />
        {executing ? 'Executing...' : 'Execute'}
      </button>
    </article>
  )
}
