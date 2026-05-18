/**
 * System tray with a fixed context menu and an IPC channel back into the
 * renderer for shortcut navigation (e.g. "Open POS" routes to /retail).
 */

import { app, Menu, nativeImage, Tray, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createMainWindow, getMainWindow, toggleMainWindow } from './windowManager'

let tray: Tray | null = null

function loadTrayImage(): Electron.NativeImage {
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', 'tray-icon.png'),
    path.join(__dirname, '..', '..', 'assets', 'icon.png'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const img = nativeImage.createFromPath(candidate)
      if (!img.isEmpty()) return img.resize({ width: 16, height: 16 })
    }
  }
  return nativeImage.createEmpty()
}

function navigate(route: string): void {
  let win = getMainWindow()
  if (!win || win.isDestroyed()) {
    win = createMainWindow()
  }
  if (!win.isVisible()) win.show()
  win.focus()
  // Tell the renderer where to go. The frontend can listen via the preload
  // bridge if it wants to react; otherwise this is a no-op.
  win.webContents.send('navigate', route)
}

export function createTray(): Tray | null {
  if (tray) return tray
  try {
    tray = new Tray(loadTrayImage())
  } catch {
    return null
  }

  const menu = Menu.buildFromTemplate([
    { label: 'Open SmartAccounting', click: () => navigate('/') },
    { type: 'separator' },
    { label: 'POS', click: () => navigate('/retail') },
    { label: 'Dashboard', click: () => navigate('/dashboard') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])

  tray.setToolTip('SmartAccounting')
  tray.setContextMenu(menu)
  tray.on('click', () => toggleMainWindow())

  // Allow the renderer to request route changes too (e.g. from a custom menu).
  ipcMain.on('tray:navigate', (_event, route: unknown) => {
    if (typeof route === 'string' && route.startsWith('/')) {
      navigate(route)
    }
  })

  return tray
}

export function destroyTray(): void {
  try {
    tray?.destroy()
  } catch {
    /* ignore */
  }
  tray = null
}
