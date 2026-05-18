/**
 * Wraps `electron-updater` with a sane default schedule:
 *   - One check shortly after startup (5 s)
 *   - One check every hour thereafter
 *   - A native confirmation dialog when a download completes so the user can
 *     decide whether to install immediately or on next quit.
 *
 * Updater traffic is opt-in: in development we no-op so the app starts even
 * with no publish channel configured.
 */

import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

const HOURLY = 60 * 60 * 1000

let initialized = false

export function initAutoUpdater(): void {
  if (initialized) return
  initialized = true

  if (!app.isPackaged) {
    // electron-updater complains loudly without a feed in dev; skip entirely.
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[autoUpdater] error', err.message)
  })

  autoUpdater.on('update-downloaded', (info) => {
    void dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'SmartAccounting update ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'Restart now to apply the update, or it will install the next time you quit SmartAccounting.',
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  const tick = (): void => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => undefined)
  }

  setTimeout(tick, 5_000)
  setInterval(tick, HOURLY)
}
