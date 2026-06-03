import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './utils'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  helper?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    placeholder,
    error,
    helper,
    prefix,
    suffix,
    disabled,
    required,
    className,
    id,
    ...rest
  },
  ref,
) {
  const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const hintId = helper ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <label className={cn('ui-field', className)} htmlFor={inputId}>
      {label ? (
        <span className={cn('ui-field__label', required && 'ui-field__label--required')}>{label}</span>
      ) : null}
      <div
        className={cn(
          'ui-field__control',
          error && 'ui-field__control--error',
          disabled && 'ui-field__control--disabled',
        )}
      >
        {prefix ? (
          <span className="ui-field__affix" aria-hidden>
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className="ui-field__input"
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          {...rest}
        />
        {suffix ? (
          <span className="ui-field__affix ui-field__affix--suffix" aria-hidden>
            {suffix}
          </span>
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
    </label>
  )
})
