/**
 * USB-HID barcode scanner.
 *
 * Most retail scanners present themselves as a HID keyboard. We read raw HID
 * input reports, translate each keycode to ASCII (honoring the shift modifier
 * bit), accumulate characters until ENTER (0x28), then fire the registered
 * callback with the full barcode string.
 *
 * `node-hid` is loaded lazily so missing native binaries don't crash the main
 * process — `connectHidScanner` simply returns `false` if the module is
 * unavailable or no scanner is plugged in.
 */

// USB HID Usage Table — Keyboard / Keypad page (Page 0x07).
// Index: HID Usage ID -> [unshifted, shifted]
const HID_MAP: ReadonlyArray<readonly [string, string] | undefined> = (() => {
  const m: Array<readonly [string, string] | undefined> = new Array(0xe8).fill(undefined)
  // Letters: 0x04 (a) … 0x1D (z)
  for (let i = 0; i < 26; i += 1) {
    const lower = String.fromCharCode(97 + i)
    const upper = String.fromCharCode(65 + i)
    m[0x04 + i] = [lower, upper]
  }
  // Numbers: 0x1E…0x26 = 1…9, 0x27 = 0
  const numUnshifted = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
  const numShifted = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')']
  for (let i = 0; i < 10; i += 1) {
    m[0x1e + i] = [numUnshifted[i]!, numShifted[i]!]
  }
  // Punctuation / common keys
  m[0x2c] = [' ', ' '] // space
  m[0x2d] = ['-', '_']
  m[0x2e] = ['=', '+']
  m[0x2f] = ['[', '{']
  m[0x30] = [']', '}']
  m[0x31] = ['\\', '|']
  m[0x33] = [';', ':']
  m[0x34] = ["'", '"']
  m[0x35] = ['`', '~']
  m[0x36] = [',', '<']
  m[0x37] = ['.', '>']
  m[0x38] = ['/', '?']
  return m
})()

const HID_ENTER = 0x28
const SHIFT_MASK = 0x22 // bit1 = left shift, bit5 = right shift

interface HidLike {
  on(event: 'data', cb: (data: Buffer) => void): void
  on(event: 'error', cb: (err: Error) => void): void
  close(): void
}

interface NodeHidModule {
  devices(): Array<{ vendorId: number; productId: number; usagePage?: number; usage?: number; path?: string }>
  HID: new (path: string) => HidLike
}

let activeDevice: HidLike | null = null
let scanCallback: ((barcode: string) => void) | null = null
let buffer = ''

function loadNodeHid(): NodeHidModule | null {
  try {
    // Loaded at runtime so a missing native binary just disables the feature.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('node-hid') as NodeHidModule
  } catch {
    return null
  }
}

function findKeyboardLikeDevice(hid: NodeHidModule): { path: string } | null {
  const devices = hid.devices()
  // Prefer devices on the keyboard usage page (0x01 / 0x06) which is what most
  // wedge-style barcode scanners present themselves as.
  const keyboardish = devices.find(
    (d) => d.usagePage === 0x01 && d.usage === 0x06 && d.path,
  )
  if (keyboardish?.path) return { path: keyboardish.path }
  const anyWithPath = devices.find((d) => !!d.path)
  return anyWithPath?.path ? { path: anyWithPath.path } : null
}

export function connectHidScanner(cb: (barcode: string) => void): boolean {
  if (activeDevice) return true
  const hid = loadNodeHid()
  if (!hid) return false
  const target = findKeyboardLikeDevice(hid)
  if (!target) return false
  try {
    activeDevice = new hid.HID(target.path)
  } catch {
    return false
  }
  scanCallback = cb
  buffer = ''
  activeDevice.on('data', (data: Buffer) => {
    // Standard 8-byte boot keyboard report: [modifier, reserved, k1..k6]
    if (data.length < 3) return
    const modifier = data[0] ?? 0
    const shifted = (modifier & SHIFT_MASK) !== 0
    for (let i = 2; i < Math.min(data.length, 8); i += 1) {
      const code = data[i]
      if (!code) continue
      if (code === HID_ENTER) {
        if (buffer.length > 0) {
          const value = buffer
          buffer = ''
          try {
            scanCallback?.(value)
          } catch {
            /* renderer-side bug — never crash the main process */
          }
        }
        continue
      }
      const entry = HID_MAP[code]
      if (entry) {
        buffer += shifted ? entry[1] : entry[0]
      }
    }
  })
  activeDevice.on('error', () => {
    disconnectScanner()
  })
  return true
}

export function disconnectScanner(): void {
  try {
    activeDevice?.close()
  } catch {
    /* ignore */
  }
  activeDevice = null
  scanCallback = null
  buffer = ''
}
