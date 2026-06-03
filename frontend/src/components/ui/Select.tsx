import { useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from './utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  label?: string
  placeholder?: string
  error?: string
  helper?: string
  options: SelectOption[]
  value?: string | null
  onChange?: (value: string | null) => void
  searchable?: boolean
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  className?: string
}

export function Select({
  label,
  placeholder = 'Select…',
  error,
  helper,
  options,
  value = null,
  onChange,
  searchable = false,
  disabled = false,
  required = false,
  clearable = true,
  className,
}: SelectProps) {
  const uid = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return options
    }
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) {
      return
    }
    const onDoc = (e: globalThis.MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function pick(next: string) {
    onChange?.(next)
    setOpen(false)
    setQuery('')
  }

  function clear(e: ReactMouseEvent) {
    e.stopPropagation()
    onChange?.(null)
  }

  const hintId = helper ? `${uid}-helper` : undefined
  const errorId = error ? `${uid}-error` : undefined

  return (
    <div className={cn('ui-field', className)} ref={wrapRef}>
      {label ? (
        <span className={cn('ui-field__label', required && 'ui-field__label--required')}>{label}</span>
      ) : null}
      <div className="ui-field-wrap">
        <div
          className={cn(
            'ui-field__control',
            error && 'ui-field__control--error',
            disabled && 'ui-field__control--disabled',
          )}
        >
          {clearable && value && !disabled ? (
            <button
              type="button"
              className="ui-field__clear"
              aria-label="Clear selection"
              onClick={clear}
            >
              <X size={14} />
            </button>
          ) : null}
          <button
            type="button"
            id={uid}
            className="ui-field__trigger"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            onClick={() => !disabled && setOpen((v) => !v)}
          >
            <span className={selected ? undefined : 'ui-field__placeholder'}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown size={16} aria-hidden />
          </button>
        </div>
        {open ? (
          <div className="ui-select-dropdown" role="listbox">
            {searchable ? (
              <div className="ui-select-search">
                <input
                  type="search"
                  placeholder="Search…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <div className="ui-select-option" style={{ cursor: 'default', color: 'var(--color-text-tertiary)' }}>
                No matches
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  disabled={opt.disabled}
                  className={cn(
                    'ui-select-option',
                    opt.value === value && 'ui-select-option--selected',
                  )}
                  onClick={() => !opt.disabled && pick(opt.value)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="ui-field__error" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={hintId} className="ui-field__hint">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
