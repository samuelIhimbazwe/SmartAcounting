/**

 * SmartAccounting Desktop — Electron main entry point.

 *

 * - Enforces a single instance (a second launch focuses the existing window).

 * - Locks down navigation and permission requests across the whole app.

 * - Boots the window, IPC handlers, system tray, and auto-updater.

 *

 * Security rules (mirrored in every supporting file):

 *   - nodeIntegration: false

 *   - contextIsolation: true

 *   - sandbox: true

 *   - All native capabilities routed via the preload contextBridge.

 */



import { app, BrowserWindow, session } from 'electron'

import { createMainWindow, getMainWindow } from './windowManager'

import { registerIpcHandlers } from './ipcHandlers'

import { createTray, destroyTray } from './tray'

import { initAutoUpdater } from './autoUpdater'

import { closeOfflineQueue, disconnectScannerIfAny } from './lifecycle'

import {

  flushPendingOAuthUrl,

  handleStartupOAuthArgv,

  installOpenUrlHandler,

  registerOAuthProtocolClient,

} from './oauthProtocol'



registerOAuthProtocolClient()

installOpenUrlHandler()

handleStartupOAuthArgv(process.argv)



const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {

  app.quit()

} else {

  app.on('second-instance', (_event, argv) => {

    handleStartupOAuthArgv(argv)

    const win = getMainWindow()

    if (win && !win.isDestroyed()) {

      if (win.isMinimized()) win.restore()

      if (!win.isVisible()) win.show()

      win.focus()

    }

  })



  app.on('ready', () => {

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const main = getMainWindow()
      const isMainWindow =
        main && !main.isDestroyed() && webContents.id === main.webContents.id
      if (isMainWindow && permission === 'media') {
        callback(true)
        return
      }
      callback(false)
    })



    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {

      cb({

        responseHeaders: {

          ...details.responseHeaders,

          'X-Content-Type-Options': ['nosniff'],

        },

      })

    })



    registerIpcHandlers()

    createMainWindow()

    createTray()

    initAutoUpdater()

    flushPendingOAuthUrl()

  })



  app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) {

      createMainWindow()

      flushPendingOAuthUrl()

    }

  })



  app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {

      app.quit()

    }

  })



  app.on('will-quit', () => {

    disconnectScannerIfAny()

    closeOfflineQueue()

    destroyTray()

  })



  app.on('web-contents-created', (_event, contents) => {

    contents.on('will-attach-webview', (e) => {

      e.preventDefault()

    })

    contents.setWindowOpenHandler(() => ({ action: 'deny' }))

  })

}


