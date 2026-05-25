/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_MICROSOFT_CLIENT_ID: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_EFD_DEVICE_SECRET?: string
  readonly VITE_RRA_TIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ElectronFiscalApi {
  getEfdSecret: () => Promise<string | undefined>
}

interface Window {
  electronAPI?: ElectronFiscalApi
}
