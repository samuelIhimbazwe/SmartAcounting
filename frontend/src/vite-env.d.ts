/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_DEFAULT_TENANT_ID: string
  readonly VITE_DEFAULT_USER_ID: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_SENTRY_ENVIRONMENT: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_MICROSOFT_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
