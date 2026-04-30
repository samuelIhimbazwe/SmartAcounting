const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const sentryEnvironment = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE
const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0)

const sentryEnabled = typeof sentryDsn === 'string' && sentryDsn.trim().length > 0
let initialized = false
let sentryModulePromise: Promise<typeof import('@sentry/react')> | null = null

function getSentryModule() {
  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/react')
  }
  return sentryModulePromise
}

export function initSentry() {
  if (!sentryEnabled || initialized) {
    return
  }

  void getSentryModule().then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: sentryEnvironment,
      tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    })
    initialized = true
  })
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!sentryEnabled) {
    return
  }
  void getSentryModule().then((Sentry) => {
    Sentry.captureException(error, {
      extra: context,
    })
  })
}
