import { useState, type ReactNode } from 'react'
import { useNetworkStatus } from '../../shared/hooks/useNetworkStatus'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { FailedSalesModal } from './FailedSalesModal'

/**
 * Desktop-only banner for offline POS sale queue sync (Sprint 4).
 */
export function OfflineSyncBanner() {
  const { online } = useNetworkStatus()
  const {
    isElectron,
    pendingCount,
    failedCount,
    failedItems,
    syncNow,
    isSyncing,
    clearFailed,
    retryAllFailed,
  } = useOfflineQueue()
  const [failedOpen, setFailedOpen] = useState(false)

  if (!isElectron) {
    return null
  }

  if (online && pendingCount === 0 && failedCount === 0) {
    return null
  }

  let bannerClass = 'border-b px-6 py-2 text-sm border-sky-200 bg-sky-50 text-sky-900'
  let bannerText: ReactNode = null

  if (!online) {
    bannerClass = 'border-b px-6 py-2 text-sm border-amber-200 bg-amber-50 text-amber-900'
    bannerText = 'No connection — sales are being saved locally'
  } else if (pendingCount > 0 && isSyncing) {
    bannerText = `Syncing ${pendingCount} sale${pendingCount === 1 ? '' : 's'}…`
  } else if (pendingCount > 0) {
    bannerText = (
      <>
        {pendingCount} sale{pendingCount === 1 ? '' : 's'} pending sync{' '}
        <button type="button" className="ml-1 underline" onClick={() => void syncNow()} disabled={isSyncing}>
          Sync now
        </button>
      </>
    )
  }

  return (
  <>
      {bannerText ? (
        <div className={bannerClass} role="status">
          {bannerText}
        </div>
      ) : null}
      {failedCount > 0 ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-900" role="alert">
          {failedCount} sale{failedCount === 1 ? '' : 's'} failed after 3 attempts — action required{' '}
          <button type="button" className="ml-1 underline" onClick={() => setFailedOpen(true)}>
            View failed sales
          </button>
        </div>
      ) : null}
      <FailedSalesModal
        open={failedOpen}
        items={failedItems}
        onClose={() => setFailedOpen(false)}
        onRetryAll={retryAllFailed}
        onDismissAll={async () => {
          await clearFailed()
        }}
      />
    </>
  )
}
