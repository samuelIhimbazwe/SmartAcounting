import { useEffect, useRef } from 'react'
import { supports } from '../utils/webApis'

type WakeLockSentinel = { release: () => Promise<void> }

/**
 * Keeps screen awake during active POS use when supported (Chrome Android / desktop).
 */
export function useWebWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !supports.wakeLock) {
      return
    }

    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
    }

    void nav.wakeLock
      ?.request('screen')
      .then((lock) => {
        wakeLockRef.current = lock
      })
      .catch(() => {
        /* not allowed or unsupported — degrade silently */
      })

    return () => {
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
    }
  }, [active])
}
