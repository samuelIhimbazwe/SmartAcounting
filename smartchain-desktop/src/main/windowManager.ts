/**
 * Window lifecycle helper.
 *
 * Responsibilities:
 *   - Persist the main window's bounds across launches (via electron-store)
 *   - Resolve the right URL to load in dev vs production
 *   - Wire `ready-to-show`, `closed`, and `will-navigate` listeners
 *   - Force every `target="_blank"` / `window.open` to the system browser
 */

import { app, BrowserWindow, shell } from 'electron'
import { flushPendingOAuthUrl } from './oauthProtocol'
import Store from 'electron-store'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

interface SavedBounds {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

interface StoreSchema {
  windowBounds: SavedBounds
}

const DEFAULT_BOUNDS: SavedBounds = { width: 1366, height: 820 }

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: DEFAULT_BOUNDS,
  },
})

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/** Locate the built `index.html` for production loads. */
function resolveFrontendIndex(): string | null {
  // When packaged, electron-builder copies `../frontend/dist` to
  // resources/frontend-dist via `extraResources` in the builder config.
  if (app.isPackaged) {
    const packaged = path.join(process.resourcesPath, 'frontend-dist', 'index.html')
    if (fs.existsSync(packaged)) return packaged
  }
  // Unpackaged production fallback: relative to dist/main/windowManager.js
  // → up to project root, then sibling frontend/dist.
  const local = path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist', 'index.html')
  if (fs.existsSync(local)) return local
  return null
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  const saved = store.get('windowBounds', DEFAULT_BOUNDS)

  mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    show: false,
    backgroundColor: '#0F172A',
    title: 'SmartAccounting',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  if (saved.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
    flushPendingOAuthUrl()
  })

  // Persist size/position on resize/move (debounced is overkill — we only
  // pay the cost on `close` as well, see below).
  const persistBounds = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const isMaximized = mainWindow.isMaximized()
    if (isMaximized) {
      store.set('windowBounds', { ...store.get('windowBounds'), isMaximized: true })
      return
    }
    const b = mainWindow.getBounds()
    store.set('windowBounds', {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      isMaximized: false,
    })
  }

  mainWindow.on('close', persistBounds)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Force `window.open(...)` to the system browser. Returning `deny` prevents
  // Electron from spawning a new BrowserWindow.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Prevent in-app navigation away from the app origin (e.g. accidental clicks
  // on absolute links) — shell out instead.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? ''
    try {
      const target = new URL(url)
      const origin = new URL(current).origin
      if (target.origin !== origin) {
        event.preventDefault()
        void shell.openExternal(url)
      }
    } catch {
      /* malformed URL: just block */
      event.preventDefault()
    }
  })

  const isDev =
    process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    void mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtml = resolveFrontendIndex()
    if (indexHtml) {
      void mainWindow.loadURL(pathToFileURL(indexHtml).toString())
    } else {
      void mainWindow.loadURL(
        'data:text/html,<h1>SmartAccounting frontend bundle not found.</h1>' +
          '<p>Build the frontend (<code>npm run build:frontend</code>) before launching the desktop app.</p>',
      )
    }
  }

  return mainWindow
}

export function toggleMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
  } else {
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
}
