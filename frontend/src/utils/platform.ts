/**
 * Cross-platform runtime detection.
 *
 * When the app is bundled inside the Electron desktop shell, the preload
 * script exposes `smartAccountingDesktop` on `window` (and legacy
 * `smartchainDesktop` for older shells). Web code can use `isDesktop()` to opt
 * into native printer/scanner/SQLite/file-system flows while keeping a clean
 * web-only fallback.
 */

export interface SmartAccountingDesktopApi {
  isDesktop: boolean
  printer: {
    list: () => Promise<string[]>
    printUsb: (data: string) => Promise<boolean>
    printSerial: (port: string, data: string) => Promise<boolean>
  }
  scanner: {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    onScan: (cb: (barcode: string) => void) => () => void
  }
  offline: {
    queue: (payload: object) => Promise<string>
    pendingCount: () => Promise<number>
    sync: (
      apiUrl: string,
      token: string,
      tenantId: string,
    ) => Promise<{ synced: number; failed: number }>
  }
  fs: {
    saveExport: (
      filename: string,
      data: string,
      encoding?: 'utf8' | 'base64',
    ) => Promise<{ saved: boolean; filePath?: string }>
  }
  app: {
    version: () => Promise<string>
    platform: () => Promise<string>
  }
  auth?: {
    /** Opens the system browser at the API OAuth2 authorize URL (desktop code flow). */
    startOAuth: (apiBaseUrl: string, loginPath: string) => Promise<void>
    /** Fired when the OS delivers smartchain://auth/oauth2/callback?... */
    onOAuth2Callback: (cb: (params: Record<string, string>) => void) => () => void
  }
  navigation?: {
    onNavigate: (cb: (route: string) => void) => () => void
  }
}

declare global {
  interface Window {
    smartAccountingDesktop?: SmartAccountingDesktopApi
    /** @deprecated Prefer {@link Window.smartAccountingDesktop} */
    smartchainDesktop?: SmartAccountingDesktopApi
  }
}

export const isDesktop = (): boolean =>
  typeof window !== 'undefined' &&
  !!(window.smartAccountingDesktop ?? window.smartchainDesktop)

/** Bridge to the Electron preload API (or undefined when running in a browser). */
export const desktop: SmartAccountingDesktopApi | undefined =
  typeof window !== 'undefined'
    ? (window.smartAccountingDesktop ?? window.smartchainDesktop)
    : undefined

export const isMobile = (): boolean =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)

export const isWeb = (): boolean => !isDesktop() && !isMobile()
