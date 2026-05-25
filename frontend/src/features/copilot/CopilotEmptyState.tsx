import { Sparkles } from 'lucide-react'
import type { CopilotUiContext } from '../../shared/types/copilot'
import type { Role } from '../../shared/types/roles'

const DEFAULT_CHIPS = [
  'Give me a snapshot of our biggest risks this week',
  'What should I prioritize before month-end close?',
  'Explain recent anomalies in our operating metrics',
]

const SUGGESTIONS: Partial<Record<Role, string[]>> = {
  CEO: [
    "What's driving the margin drop this month?",
    'Give me a 30-second snapshot of the business',
    'What happens if sales drop 15% next quarter?',
  ],
  CFO: [
    'Which invoices are most at risk of becoming bad debt?',
    'Delay which payments to improve our cash runway?',
    'Explain the variance in operating expenses',
  ],
  ACCOUNTING: [
    'What are the next 5 items to clear for a clean close?',
    'Which reconciliation items have been open longest?',
    'Flag any unusual journal entries this week',
  ],
  SALES: [
    'Which customers are most likely to churn?',
    'What discount can I offer Client X and still hit 35% margin?',
    'How does this pipeline convert to cash in 90 days?',
  ],
  OPERATIONS: [
    'Which supplier costs have spiked this month?',
    'What products are at risk of going out of stock this week?',
    'Show me the cost saving impact of switching Supplier Y',
  ],
  HR: [
    'Which teams are closest to overtime risk this month?',
    'Summarize attrition signals for leadership',
    'What roles have the longest open headcount?',
  ],
  MARKETING: [
    'Which campaigns had the weakest ROI last quarter?',
    'Where should we shift spend before month-end?',
    'How does CAC compare across channels?',
  ],
}

interface CopilotEmptyStateProps {
  role: Role | null
  context: CopilotUiContext
  onPickSuggestion: (text: string) => void
}

export function CopilotEmptyState({ role, context, onPickSuggestion }: CopilotEmptyStateProps) {
  const chips = (context.suggestedPrompts?.length ? context.suggestedPrompts : role && SUGGESTIONS[role]) ?? SUGGESTIONS.CEO ?? DEFAULT_CHIPS

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--color-primary-light)] to-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex justify-center" aria-hidden>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]">
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <h3 className="m-0 text-center font-[var(--font-display)] text-base font-semibold text-neutral-900">AI Copilot</h3>
      <p className="mt-2 text-center text-xs leading-relaxed text-neutral-600">
        You are in <strong className="font-medium text-neutral-800">{context.sectionLabel}</strong>. Ask questions,
        request drafts, or stage approval-safe actions for this workflow.
      </p>
      <p className="mt-2 text-center text-xs leading-relaxed text-neutral-600">
        {context.sectionSummary}
      </p>
      <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--color-surface)] px-3 py-2 text-xs text-neutral-700 shadow-[var(--shadow-sm)]">
        <p className="m-0 font-medium text-neutral-900">How it works</p>
        <p className="mt-1 mb-0 leading-relaxed">
          AI Copilot stays inside your role permissions, previews write actions before execution, and shows undo when a
          safe reversal path exists.
        </p>
      </div>
      <div className="mt-4">
        <p className="m-0 mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">Try asking</p>
        <div className="flex flex-col gap-2">
          {chips.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-xs leading-snug text-neutral-800 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--color-primary)] motion-safe:hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              onClick={() => onPickSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


