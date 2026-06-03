import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from './utils'

export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  helper?: string
  valid?: boolean
  htmlFor?: string
  className?: string
  children: ReactNode
}

export function FormField({
  label,
  required,
  error,
  helper,
  valid,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  const showSuccess = valid && !error
  const hintId = helper && !error ? `${htmlFor ?? label}-helper` : undefined
  const errorId = error ? `${htmlFor ?? label}-error` : undefined

  type ControlProps = {
    id?: string
    className?: string
    'aria-invalid'?: boolean
    'aria-describedby'?: string
  }
  const child = isValidElement(children) ? (children as ReactElement<ControlProps>) : null
  const control = child
    ? cloneElement(child, {
        id: htmlFor ?? child.props.id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        className: cn(
          child.props.className,
          error && 'ui-form-field__input--error',
          showSuccess && 'ui-form-field__input--valid',
        ),
      })
    : children

  return (
    <div className={cn('ui-form-field', className)}>
      <label className="ui-form-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ui-form-field__required" aria-hidden> *</span> : null}
      </label>
      <div className="ui-form-field__control">
        {control}
        {showSuccess ? (
          <Check className="ui-form-field__success" size={14} aria-hidden />
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="ui-form-field__error" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={hintId} className="ui-form-field__helper">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
