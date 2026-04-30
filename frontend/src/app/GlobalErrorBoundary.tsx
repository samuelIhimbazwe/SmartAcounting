import { Component, type ErrorInfo, type ReactNode } from 'react'
import { i18n } from '../shared/i18n/i18n'
import { captureError } from '../shared/monitoring/sentry'

interface GlobalErrorBoundaryProps {
  children: ReactNode
}

interface GlobalErrorBoundaryState {
  hasError: boolean
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global frontend render failure', { error, errorInfo })
    captureError(error, {
      componentStack: errorInfo.componentStack,
      source: 'GlobalErrorBoundary',
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--surface-raised)] p-4">
          <section className="w-full max-w-lg space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h1 className="m-0 font-[var(--font-display)] text-xl font-semibold text-neutral-900">
              {i18n.t('errors.fallbackTitle')}
            </h1>
            <p className="m-0 text-sm text-neutral-600">{i18n.t('errors.fallbackBody')}</p>
            <button
              type="button"
              className="rounded-md bg-[var(--color-brand-700)] px-3 py-2 text-sm font-medium text-white"
              onClick={() => window.location.assign('/login')}
            >
              {i18n.t('errors.returnToLogin')}
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
