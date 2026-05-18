import { supports } from '../utils/webApis'

type WebHidDevice = {
  open: () => Promise<void>
  addEventListener: (type: string, listener: (ev: Event) => void) => void
}

/**
 * Optional USB HID keyboard wedge style scanner (Chrome WebHID).
 * Best-effort decode; falls back to manual scan field if unsupported or on error.
 */
export async function connectHidScanner(onScan: (barcode: string) => void): Promise<void> {
  if (!supports.hid) {
    return
  }

  try {
    const hid = (navigator as unknown as {
      hid: { requestDevice: (opts: unknown) => Promise<WebHidDevice[]> }
    }).hid
    const devices = await hid.requestDevice({
      filters: [{ usagePage: 0x01, usage: 0x06 }],
    })

    if (!devices.length) {
      return
    }

    const device = devices[0]
    await device.open()

    let buffer = ''

    device.addEventListener('inputreport', (event: Event) => {
      const report = event as { data?: DataView }
      if (!report.data?.buffer) {
        return
      }
      const data = new Uint8Array(report.data.buffer)
      const char = hidToChar(data[2] ?? 0)
      if (char === 'ENTER') {
        if (buffer.length > 0) {
          onScan(buffer)
          buffer = ''
        }
      } else if (char) {
        buffer += char
      }
    })
  } catch {
    /* user cancelled or device error — manual entry still works */
  }
}

function hidToChar(keyCode: number): string | null {
  if (keyCode >= 4 && keyCode <= 29) {
    return String.fromCharCode(keyCode + 93)
  }
  if (keyCode >= 30 && keyCode <= 39) {
    return String.fromCharCode(keyCode === 39 ? 48 : keyCode + 19)
  }
  if (keyCode === 40) {
    return 'ENTER'
  }
  return null
}
