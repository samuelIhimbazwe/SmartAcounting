import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface HistoryBackButtonProps {
  label?: string
  fallbackTo?: string
  className?: string
  iconOnly?: boolean
  title?: string
}

export function HistoryBackButton({
  label = 'Back',
  fallbackTo,
  className,
  iconOnly = false,
  title,
}: HistoryBackButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={title ?? label}
      onClick={() => {
        if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) {
          navigate(-1)
          return
        }
        if (fallbackTo) {
          navigate(fallbackTo)
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {iconOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  )
}
