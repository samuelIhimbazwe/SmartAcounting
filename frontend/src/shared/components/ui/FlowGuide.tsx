import { useState } from 'react'
import { ChevronDown, ChevronUp, ListOrdered } from 'lucide-react'

export type FlowGuideStep = {
  title: string
  body: string
}

type FlowGuideProps = {
  title: string
  steps: FlowGuideStep[]
  defaultOpen?: boolean
}

export function FlowGuide({ title, steps, defaultOpen = false }: FlowGuideProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)]/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <ListOrdered className="h-4 w-4 opacity-70" aria-hidden />
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <ol className="m-0 list-decimal space-y-3 border-t border-[var(--border-default)] px-4 py-3 pl-8 text-sm">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="font-medium">{step.title}</span>
              <p className="m-0 mt-0.5 text-[var(--text-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
