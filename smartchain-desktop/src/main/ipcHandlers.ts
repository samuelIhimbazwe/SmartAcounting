/**
 * Centralized IPC registration.
 *
 * Every channel exposed to the renderer is wired here, with strict input
 * validation before the call leaves the trust boundary. The renderer is
 * sandboxed and only sees the contextBridge surface, so this is the single
 * place where we have to defend against malformed or hostile payloads.
 */

import { app, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs'
import {
  getPairedPrinters,
  printReceiptSerial,
  printReceiptUsb,
} from './printer'
import {
  connectHidScanner,
  disconnectScanner,
} from './barcodeScanner'
import {
  getPendingCount,
  queueTransaction,
  syncPending,
} from './offlineQueue'
import { getMainWindow } from './windowManager'

const MAX_STRING = 10 * 1024 * 1024 // 10 MiB safety ceiling
const MAX_PAYLOAD_KEYS = 1024

function isNonEmptyString(value: unknown, max = MAX_STRING): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

function isString(value: unknown, max = MAX_STRING): value is string {
  return typeof value === 'string' && value.length <= max
}

/** Cheap-but-effective payload validation for offline:queue */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  // Disallow prototype-polluting payloads.
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  if (Object.keys(value as Record<string, unknown>).length > MAX_PAYLOAD_KEYS) return false
  return true
}

function isHttpsOrLocal(value: unknown): value is string {
  if (!isNonEmptyString(value, 2048)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function registerIpcHandlers(): void {
  // -- Printer ---------------------------------------------------------------
  ipcMain.handle('printer:list', async () => getPairedPrinters())

  ipcMain.handle('printer:print-usb', async (_event: IpcMainInvokeEvent, data: unknown) => {
    if (!isNonEmptyString(data)) return false
    return printReceiptUsb(data)
  })

  ipcMain.handle(
    'printer:print-serial',
    async (_event: IpcMainInvokeEvent, port: unknown, data: unknown) => {
      if (!isNonEmptyString(port, 256)) return false
      if (!isNonEmptyString(data)) return false
      return printReceiptSerial(port, data)
    },
  )

  // -- Scanner ---------------------------------------------------------------
  ipcMain.handle('scanner:connect', async () => {
    connectHidScanner((barcode) => {
      const win = getMainWindow()
      if (!win || win.isDestroyed()) return
      win.webContents.send('scanner:scanned', barcode)
    })
  })

  ipcMain.handle('scanner:disconnect', async () => {
    disconnectScanner()
  })

  // -- Offline queue ---------------------------------------------------------
  ipcMain.handle('offline:queue', async (_event: IpcMainInvokeEvent, payload: unknown) => {
    if (!isPlainObject(payload)) {
      throw new Error('offline:queue requires an object payload')
    }
    return queueTransaction(payload)
  })

  ipcMain.handle('offline:pending-count', async () => getPendingCount())

  ipcMain.handle(
    'offline:sync',
    async (
      _event: IpcMainInvokeEvent,
      apiUrl: unknown,
      token: unknown,
      tenantId: unknown,
    ) => {
      if (!isHttpsOrLocal(apiUrl)) {
        throw new Error('offline:sync requires a valid api URL')
      }
      if (!isNonEmptyString(token, 8192)) {
        throw new Error('offline:sync requires a non-empty token')
      }
      if (!isNonEmptyString(tenantId, 256)) {
        throw new Error('offline:sync requires a tenantId')
      }
      return syncPending(apiUrl, token, tenantId)
    },
  )

  // -- Filesystem ------------------------------------------------------------
  ipcMain.handle(
    'fs:save-export',
    async (
      _event: IpcMainInvokeEvent,
      filename: unknown,
      data: unknown,
      encoding: unknown = 'utf8',
    ) => {
      if (!isNonEmptyString(filename, 512)) {
        throw new Error('fs:save-export requires a filename')
      }
      if (!isString(data)) {
        throw new Error('fs:save-export requires string data')
      }
      const enc = encoding === 'base64' ? 'base64' : 'utf8'
      if (enc === 'base64' && data.length > MAX_STRING) {
        throw new Error('fs:save-export payload too large')
      }
      if (enc === 'utf8' && data.length > MAX_STRING) {
        throw new Error('fs:save-export payload too large')
      }
      const win = getMainWindow() ?? undefined
      const result = win
        ? await dialog.showSaveDialog(win, { defaultPath: filename })
        : await dialog.showSaveDialog({ defaultPath: filename })
      if (result.canceled || !result.filePath) {
        return { saved: false }
      }
      if (enc === 'base64') {
        fs.writeFileSync(result.filePath, Buffer.from(data, 'base64'))
      } else {
        fs.writeFileSync(result.filePath, data, { encoding: 'utf-8' })
      }
      return { saved: true, filePath: result.filePath }
    },
  )

  // -- App metadata ----------------------------------------------------------
  ipcMain.handle('app:version', async () => app.getVersion())
  ipcMain.handle('app:platform', async () => process.platform)

  // -- OAuth2 (system browser + smartchain:// callback) ------------------------
  ipcMain.handle(
    'auth:start-oauth',
    async (_event: IpcMainInvokeEvent, apiBaseUrl: unknown, loginPath: unknown) => {
      if (!isHttpsOrLocal(apiBaseUrl)) {
        throw new Error('auth:start-oauth requires a valid API base URL')
      }
      if (!isNonEmptyString(loginPath, 512) || !loginPath.startsWith('/')) {
        throw new Error('auth:start-oauth requires an absolute login path')
      }
      const base = apiBaseUrl.replace(/\/$/, '')
      const authorizeUrl = `${base}${loginPath}`
      await shell.openExternal(authorizeUrl)
    },
  )
}
