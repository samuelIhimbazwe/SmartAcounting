import { useCallback, useMemo, useState } from 'react'

export type FieldValidators<T extends Record<string, unknown>> = Partial<
  Record<keyof T, (value: unknown, allValues: T) => string | undefined>
>

export function useFieldValidation<T extends Record<string, unknown>>(
  values: T,
  validators: FieldValidators<T>,
) {
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const validateField = useCallback(
    (key: keyof T) => {
      const validator = validators[key]
      if (!validator) {
        return undefined
      }
      const message = validator(values[key], values)
      setErrors(prev => {
        const next = { ...prev }
        if (message) {
          next[key] = message
        } else {
          delete next[key]
        }
        return next
      })
      return message
    },
    [validators, values],
  )

  const onBlur = useCallback(
    (key: keyof T) => {
      setTouched(prev => ({ ...prev, [key]: true }))
      validateField(key)
    },
    [validateField],
  )

  const validateAll = useCallback(() => {
    const nextErrors: Partial<Record<keyof T, string>> = {}
    let valid = true
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const message = validators[key]?.(values[key], values)
      if (message) {
        nextErrors[key] = message
        valid = false
      }
    }
    setErrors(nextErrors)
    setTouched(
      Object.keys(validators).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>,
      ),
    )
    return valid
  }, [validators, values])

  const valid = useMemo(() => {
    const result: Partial<Record<keyof T, boolean>> = {}
    for (const key of Object.keys(validators) as (keyof T)[]) {
      if (touched[key] && !errors[key]) {
        result[key] = true
      }
    }
    return result
  }, [errors, touched, validators])

  return { errors, valid, touched, onBlur, validateAll, validateField }
}
