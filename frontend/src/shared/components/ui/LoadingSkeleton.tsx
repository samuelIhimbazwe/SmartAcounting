export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-10 w-2/3 rounded-lg bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-100" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-neutral-100" />
      ))}
    </div>
  )
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="flex animate-pulse gap-3 overflow-hidden" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="h-48 min-w-[180px] flex-1 rounded-xl bg-neutral-100" />
      ))}
    </div>
  )
}
