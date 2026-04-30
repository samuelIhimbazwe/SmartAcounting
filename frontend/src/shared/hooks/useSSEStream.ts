import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'

interface SSEOptions<T> {
  endpoint: string
  onMessage: (data: T) => void
  enabled?: boolean
}

export function useSSEStream<T>({ endpoint, onMessage, enabled = true }: SSEOptions<T>) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const retryMs = useRef(1_000)

  useEffect(() => {
    if (!enabled || !accessToken) {
      return
    }

    let stream: EventSource | null = null
    let reconnectTimer: number | null = null

    const connect = () => {
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${encodeURIComponent(accessToken)}`
      stream = new EventSource(url)

      stream.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data) as T)
          retryMs.current = 1_000
        } catch {
          // Intentionally ignore malformed events.
        }
      }

      stream.onerror = () => {
        stream?.close()
        reconnectTimer = window.setTimeout(() => {
          retryMs.current = Math.min(retryMs.current * 2, 15_000)
          connect()
        }, retryMs.current)
      }
    }

    connect()
    return () => {
      stream?.close()
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
    }
  }, [accessToken, enabled, endpoint, onMessage])
}
