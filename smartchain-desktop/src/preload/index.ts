/**
 * Preload script — runs in the renderer process before any page scripts.
 *
 * With `contextIsolation: true` and `sandbox: true`, this file may only use
 * Electron's `contextBridge` and `ipcRenderer`. Node built-ins are *not*
 * available in a sandboxed preload, and that is by design — every native
 * capability must round-trip through an IPC handler in the main process.
 *
 * The exposed shape must match exactly with the `SmartAccountingDesktopApi`
 * declared in `frontend/src/utils/platform.ts`.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

type SyncResult = { synced: number; failed: number; errors?: string[] }

type QueueSaleResult = { localId: string; status: 'queued' }

type QueueStatusItem = {
  localId: string
  createdAt: number
  retryCount: number
  lastError: string | null
}

type QueueStatus = {
  pendingCount: number
  failedCount: number
  items: QueueStatusItem[]
}

const api = {
  isDesktop: true,
  printer: {
    list: (): Promise<string[]> => ipcRenderer.invoke('printer:list'),
    printUsb: (data: string): Promise<boolean> =>
      ipcRenderer.invoke('printer:print-usb', data),
    printSerial: (port: string, data: string): Promise<boolean> =>
      ipcRenderer.invoke('printer:print-serial', port, data),
  },
  scanner: {
    connect: (): Promise<void> => ipcRenderer.invoke('scanner:connect'),
    disconnect: (): Promise<void> => ipcRenderer.invoke('scanner:disconnect'),
    onScan: (cb: (barcode: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, barcode: string): void => {
        if (typeof barcode === 'string') cb(barcode)
      }
      ipcRenderer.on('scanner:scanned', listener)
      return () => {
        ipcRenderer.removeListener('scanner:scanned', listener)
      }
    },
  },
  offline: {
    queue: (payload: object): Promise<string> =>
      ipcRenderer.invoke('offline:queue', payload),
    pendingCount: (): Promise<number> => ipcRenderer.invoke('offline:pending-count'),
    sync: (apiUrl: string, token: string, tenantId: string): Promise<SyncResult> =>
      ipcRenderer.invoke('offline:sync', apiUrl, token, tenantId),
  },
  queueSale: (payload: object): Promise<QueueSaleResult> =>
    ipcRenderer.invoke('pos:queue-sale', payload),
  getQueueStatus: (): Promise<QueueStatus> => ipcRenderer.invoke('pos:get-queue-status'),
  syncQueue: (apiUrl: string, token: string, tenantId: string): Promise<SyncResult> =>
    ipcRenderer.invoke('pos:sync-queue', apiUrl, token, tenantId),
  clearFailed: (): Promise<{ deleted: number }> => ipcRenderer.invoke('pos:clear-failed'),
  resetFailedRetries: (): Promise<{ reset: number }> =>
    ipcRenderer.invoke('pos:reset-failed-retries'),
  getEfdSecret: (): Promise<string | undefined> => ipcRenderer.invoke('pos:get-efd-secret'),
  fs: {
    saveExport: (
      filename: string,
      data: string,
      encoding?: 'utf8' | 'base64',
    ): Promise<{ saved: boolean; filePath?: string }> =>
      ipcRenderer.invoke('fs:save-export', filename, data, encoding ?? 'utf8'),
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    platform: (): Promise<string> => ipcRenderer.invoke('app:platform'),
  },
  auth: {
    startOAuth: (apiBaseUrl: string, loginPath: string): Promise<void> =>
      ipcRenderer.invoke('auth:start-oauth', apiBaseUrl, loginPath),
    onOAuth2Callback: (cb: (params: Record<string, string>) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, params: Record<string, string>): void => {
        if (params && typeof params === 'object') {
          cb(params)
        }
      }
      ipcRenderer.on('auth:oauth2-callback', listener)
      return () => {
        ipcRenderer.removeListener('auth:oauth2-callback', listener)
      }
    },
  },
  navigation: {
    onNavigate: (cb: (route: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, route: string): void => {
        if (typeof route === 'string') {
          cb(route)
        }
      }
      ipcRenderer.on('navigate', listener)
      return () => {
        ipcRenderer.removeListener('navigate', listener)
      }
    },
  },
} as const

const electronAPI = {
  getEfdSecret: (): Promise<string | undefined> =>
    ipcRenderer.invoke('pos:get-efd-secret'),
} as const

contextBridge.exposeInMainWorld('smartAccountingDesktop', api)
contextBridge.exposeInMainWorld('smartchainDesktop', api)
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
