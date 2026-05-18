/**
 * Native receipt-printer transports.
 *
 * - `getPairedPrinters()` — list serial ports that look like a receipt printer
 *   (the OS doesn't expose a "thermal printer" category, so we lean on
 *   `serialport`'s `list()` and let the caller pick one).
 * - `printReceiptUsb()` — uses `node-thermal-printer` over a system print queue
 *   discovered by the OS. Suitable for USB-attached ESC/POS printers that
 *   register themselves as Windows/macOS/Linux printers.
 * - `printReceiptSerial()` — opens the given COM/tty port at 9600 baud, writes
 *   the raw ESC/POS bytes, then closes the port.
 *
 * Both `serialport` and `node-thermal-printer` (its underlying transport
 * `iconv-lite` etc. are pure-JS, but the OS-printer integration may pull in
 * native bits) are loaded lazily so a missing native binary degrades the
 * feature to "no printers" / `false` rather than crashing the main process.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SerialPortLike {
  open(cb: (err: Error | null) => void): void
  write(buf: Buffer, cb: (err: Error | null) => void): void
  drain(cb: () => void): void
  close(cb?: () => void): void
}
interface SerialPortStatic {
  new (opts: { path: string; baudRate: number; autoOpen?: boolean }): SerialPortLike
  list(): Promise<Array<{ path: string }>>
}

interface ThermalPrinterLike {
  isPrinterConnected(): Promise<boolean>
  raw(buf: Buffer): void
  execute(): Promise<void>
}

interface ThermalPrinterModule {
  ThermalPrinter: new (opts: any) => ThermalPrinterLike
  PrinterTypes: { EPSON: string; STAR: string }
}

function loadSerialPort(): SerialPortStatic | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('serialport') as { SerialPort: SerialPortStatic }
    return mod.SerialPort
  } catch {
    return null
  }
}

function loadThermalPrinter(): ThermalPrinterModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('node-thermal-printer') as ThermalPrinterModule
  } catch {
    return null
  }
}

export async function getPairedPrinters(): Promise<string[]> {
  const SerialPort = loadSerialPort()
  if (!SerialPort) return []
  try {
    const ports = await SerialPort.list()
    return ports.map((p) => p.path).filter((path): path is string => !!path)
  } catch {
    return []
  }
}

export async function printReceiptUsb(escposData: string): Promise<boolean> {
  if (!escposData) return false
  const mod = loadThermalPrinter()
  if (!mod) return false
  try {
    const printer = new mod.ThermalPrinter({
      type: mod.PrinterTypes.EPSON,
      interface: 'printer:auto',
      removeSpecialCharacters: false,
      lineCharacter: '-',
      options: { timeout: 5000 },
    })
    const connected = await printer.isPrinterConnected()
    if (!connected) return false
    printer.raw(Buffer.from(escposData, 'utf-8'))
    await printer.execute()
    return true
  } catch {
    return false
  }
}

export function printReceiptSerial(port: string, escposData: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!port || !escposData) {
      resolve(false)
      return
    }
    const SerialPort = loadSerialPort()
    if (!SerialPort) {
      resolve(false)
      return
    }
    let serial: SerialPortLike | null = null
    try {
      serial = new SerialPort({ path: port, baudRate: 9600, autoOpen: false })
    } catch {
      resolve(false)
      return
    }
    const close = (ok: boolean): void => {
      try {
        serial?.close(() => resolve(ok))
      } catch {
        resolve(ok)
      }
    }
    serial.open((openErr) => {
      if (openErr) {
        resolve(false)
        return
      }
      serial!.write(Buffer.from(escposData, 'utf-8'), (writeErr) => {
        if (writeErr) {
          close(false)
          return
        }
        serial!.drain(() => {
          close(true)
        })
      })
    })
  })
}
