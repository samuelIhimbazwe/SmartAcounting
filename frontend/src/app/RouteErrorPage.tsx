import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'

export function RouteErrorPage() {
  const navigate = useNavigate()
  const error = useRouteError()

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong while loading this page.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-raised)] p-4">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="m-0 text-xl font-semibold text-neutral-900">Page unavailable</h1>
        <p className="mt-3 text-sm text-neutral-600">
          We hit an unexpected error while loading this screen. You can retry or go back to a safe page.
        </p>
        <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-3 py-2 text-sm text-neutral-700">
          {message}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--color-brand-700)] px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium"
            onClick={() => navigate('/dashboard')}
          >
            Go to dashboard
          </button>
        </div>
      </section>
    </main>
  )
}
