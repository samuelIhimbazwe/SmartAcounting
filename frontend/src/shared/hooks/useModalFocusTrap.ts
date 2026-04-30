import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface UseModalFocusTrapOptions {
  active: boolean
  onEscape?: () => void
}

export function useModalFocusTrap({ active, onEscape }: UseModalFocusTrapOptions) {
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const initialFocus = focusable[0] ?? container
    initialFocus.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (nodes.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const current = document.activeElement

      if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousActive?.focus()
    }
  }, [active, onEscape])

  return containerRef
}
