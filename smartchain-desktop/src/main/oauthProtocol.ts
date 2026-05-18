/**
 * Custom protocol handler for OAuth2 return URLs.
 *
 * Backend must set OAUTH2_REDIRECT_URI=smartchain://auth/oauth2/callback so the
 * success handler redirects here instead of an https:// web URL.
 */

import { app, type BrowserWindow } from 'electron'
import path from 'node:path'
import { getMainWindow } from './windowManager'

export const OAUTH_PROTOCOL = 'smartchain'
export const OAUTH_CALLBACK_HOST = 'auth'
export const OAUTH_CALLBACK_PATH = '/oauth2/callback'

let pendingOAuthUrl: string | null = null

export function registerOAuthProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(OAUTH_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(OAUTH_PROTOCOL)
  }
}

/** macOS: register before app.ready */
export function installOpenUrlHandler(): void {
  app.on('open-url', (event, url) => {
    event.preventDefault()
    enqueueOrHandleOAuthUrl(url)
  })
}

export function handleStartupOAuthArgv(argv: string[]): void {
  const url = argv.find((arg) => arg.startsWith(`${OAUTH_PROTOCOL}://`))
  if (url) {
    enqueueOrHandleOAuthUrl(url)
  }
}

export function flushPendingOAuthUrl(): void {
  if (pendingOAuthUrl) {
    const url = pendingOAuthUrl
    pendingOAuthUrl = null
    deliverOAuthUrl(url)
  }
}

function enqueueOrHandleOAuthUrl(url: string): void {
  if (!app.isReady()) {
    pendingOAuthUrl = url
    return
  }
  deliverOAuthUrl(url)
}

function deliverOAuthUrl(rawUrl: string): void {
  const params = parseOAuthCallbackUrl(rawUrl)
  if (!params) {
    return
  }
  const win = getMainWindow()
  if (!win || win.isDestroyed()) {
    pendingOAuthUrl = rawUrl
    return
  }
  sendOAuthCallbackToRenderer(win, params)
}

export function parseOAuthCallbackUrl(
  rawUrl: string,
): Record<string, string> | null {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== `${OAUTH_PROTOCOL}:`) {
    return null
  }
  const host = parsed.hostname
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  const isCallback =
    (host === OAUTH_CALLBACK_HOST && pathname === OAUTH_CALLBACK_PATH) ||
    pathname === `/auth${OAUTH_CALLBACK_PATH}`
  if (!isCallback) {
    return null
  }
  const params: Record<string, string> = {}
  parsed.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

export function sendOAuthCallbackToRenderer(
  win: BrowserWindow,
  params: Record<string, string>,
): void {
  if (win.isMinimized()) {
    win.restore()
  }
  if (!win.isVisible()) {
    win.show()
  }
  win.focus()
  win.webContents.send('auth:oauth2-callback', params)
}
