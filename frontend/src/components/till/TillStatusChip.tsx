import { Link } from 'react-router-dom'
import { useTillSession } from '../../hooks/useTillSession'

export function TillStatusChip() {
  const { isOpen, loading } = useTillSession()

  const label = loading ? 'Till…' : isOpen ? 'Till open' : 'No till'
  const dotClass = isOpen ? 'bg-emerald-500' : 'bg-neutral-400'

  return (
    <Link to="/till" className="till-status-chip" title="Till session">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className="till-status-chip__label">{label}</span>
    </Link>
  )
}
