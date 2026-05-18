import { useCallback, useEffect, useRef, useState } from 'react'
import { desktop, isDesktop } from '../utils/platform'
import { supports } from '../utils/webApis'

/**
 * Camera barcode scan via Barcode Detection API when available; otherwise prompt for manual entry.
 *
 * When running inside the Electron desktop shell, this hook also wires up the
 * native HID scanner via the preload bridge, in addition to (and independent
 * of) the web camera flow.
 */
export function useWebBarcode(onScan: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)

  // Desktop HID scanner: subscribe for the lifetime of the hook.
  useEffect(() => {
    if (!isDesktop()) return
    const native = desktop
    if (!native) return
    let cleanup: (() => void) | undefined
    native.scanner
      .connect()
      .then(() => {
        cleanup = native.scanner.onScan(onScan)
      })
      .catch(() => {
        /* native scanner unavailable — web camera flow still works */
      })
    return () => {
      cleanup?.()
      native.scanner.disconnect().catch(() => undefined)
    }
  }, [onScan])

  const stopScan = useCallback(() => {
    if (intervalRef.current !== undefined) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
    setScanning(false)
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {
      /* ignore */
    }
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startScan = useCallback(async () => {
    if (!supports.barcodeDetector) {
      const manual = window.prompt(
        'Barcode scanner not supported in this browser. Enter barcode manually:',
        '',
      )
      if (manual?.trim()) {
        onScan(manual.trim())
      }
      return
    }

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
    } catch {
      const manual = window.prompt(
        'Camera unavailable or permission denied. Enter barcode manually:',
        '',
      )
      if (manual?.trim()) {
        onScan(manual.trim())
      }
      return
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => undefined)
    }

    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!Detector) {
      stopScan()
      const manual = window.prompt('BarcodeDetector missing. Enter barcode manually:', '')
      if (manual?.trim()) {
        onScan(manual.trim())
      }
      return
    }

    const detector = new Detector({
      formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'],
    })

    setScanning(true)

    intervalRef.current = setInterval(() => {
      const el = videoRef.current
      if (!el) {
        return
      }
      void (async () => {
        try {
          const barcodes = await detector.detect(el)
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            stopScan()
            onScan(barcodes[0].rawValue)
          }
        } catch {
          /* ignore frame errors */
        }
      })()
    }, 150)
  }, [onScan, stopScan])

  return { videoRef, scanning, startScan, stopScan }
}
