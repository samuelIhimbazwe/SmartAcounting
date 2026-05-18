import { desktop, isDesktop } from '../utils/platform'
import { supports } from '../utils/webApis'

/** ESC/POS thermal service UUID (common BLE printers) */
const BLE_PRINT_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb'
const BLE_PRINT_CHAR = '00002af1-0000-1000-8000-00805f9b34fb'

type BluetoothDevice = { gatt?: { connect: () => Promise<BluetoothRemoteGATTServer> } }
type BluetoothRemoteGATTServer = {
  getPrimaryService: (uuid: string) => Promise<BluetoothRemoteGATTService>
}
type BluetoothRemoteGATTService = {
  getCharacteristic: (uuid: string) => Promise<BluetoothRemoteGATTCharacteristic>
}
type BluetoothRemoteGATTCharacteristic = {
  writeValue: (buf: BufferSource) => Promise<void>
}

/**
 * Send ESC/POS over Web Bluetooth; falls back to browser print on failure or unsupported.
 */
export async function printViaWebBluetooth(escposData: string): Promise<void> {
  if (!supports.bluetooth) {
    window.print()
    return
  }

  try {
    const device: BluetoothDevice = await (
      navigator as unknown as {
        bluetooth: {
          requestDevice: (opts: { filters: { services: string[] }[] }) => Promise<BluetoothDevice>
        }
      }
    ).bluetooth.requestDevice({
      filters: [{ services: [BLE_PRINT_SERVICE] }],
    })
    const server = await device.gatt?.connect()
    if (!server) {
      window.print()
      return
    }
    const service = await server.getPrimaryService(BLE_PRINT_SERVICE)
    const characteristic = await service.getCharacteristic(BLE_PRINT_CHAR)
    const encoder = new TextEncoder()
    await characteristic.writeValue(encoder.encode(escposData))
  } catch {
    window.print()
  }
}

/**
 * Print a receipt using the best available transport.
 *
 * Priority:
 *   1. Electron native printer (USB / Serial via preload bridge)
 *   2. Web Bluetooth ESC/POS
 *   3. Web Serial ESC/POS
 *   4. Browser `window.print()`
 *
 * Existing call sites that use `printViaWebBluetooth` / `printViaWebSerial`
 * directly continue to work unchanged.
 */
export async function printReceipt(escposData: string): Promise<void> {
  if (isDesktop() && desktop) {
    try {
      const printers = await desktop.printer.list()
      if (printers.length > 0) {
        await desktop.printer.printSerial(printers[0], escposData)
      } else {
        await desktop.printer.printUsb(escposData)
      }
      return
    } catch {
      /* fall through to web transports */
    }
  }
  if (supports.bluetooth) {
    await printViaWebBluetooth(escposData)
    return
  }
  if (supports.serial) {
    await printViaWebSerial(escposData)
    return
  }
  window.print()
}

/**
 * Send ESC/POS over Web Serial; falls back to browser print on failure or unsupported.
 */
export async function printViaWebSerial(escposData: string): Promise<void> {
  if (!supports.serial) {
    window.print()
    return
  }

  try {
    type SerialLike = {
      open: (opts: { baudRate: number }) => Promise<void>
      writable?: { getWriter: () => WritableStreamDefaultWriter<Uint8Array> }
      close: () => Promise<void>
    }
    const port = await (
      navigator as unknown as { serial: { requestPort: () => Promise<SerialLike> } }
    ).serial.requestPort()
    await port.open({ baudRate: 9600 })
    const writer = port.writable?.getWriter()
    if (!writer) {
      window.print()
      return
    }
    const encoder = new TextEncoder()
    await writer.write(encoder.encode(escposData))
    await writer.releaseLock()
    await port.close()
  } catch {
    window.print()
  }
}
