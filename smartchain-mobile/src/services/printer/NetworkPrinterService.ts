import {Platform} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';
import {captureError} from '../crashReporting';
import {printReceiptEscPos} from '../../api/pos';
import {appendReceiptLineExtras} from '../../utils/receiptExtras';
import type {CartItem} from '../../store/slices/posSlice';
import {
  loadHardwareConfig,
  resolveNetworkPrinter,
  type NetworkPrinterEntry,
} from '../../hardware/printerConfig';
import {CASH_DRAWER_KICK, escPosCut, escPosInit} from '../../hardware/escpos';

export interface DiscoveredPrinter {
  name: string;
  host: string;
  port: number;
}

const DEFAULT_RAW_PORT = 9100;

export function sendEscPosOverTcp(
  host: string,
  port: number,
  data: string,
  timeoutMs = 8000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = TcpSocket.createConnection({host, port}, () => {
      client.write(data, 'binary', err => {
        if (err) {
          client.destroy();
          reject(err);
          return;
        }
        client.destroy();
        resolve();
      });
    });

    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error('Network printer connection timed out'));
    }, timeoutMs);

    client.on('error', (err: Error) => {
      clearTimeout(timer);
      client.destroy();
      reject(err);
    });

    client.on('close', () => clearTimeout(timer));
  });
}

class NetworkPrinterService {
  private zeroconf: Zeroconf | null = null;

  discoverPrinters(timeoutMs = 5000): Promise<DiscoveredPrinter[]> {
    if (Platform.OS !== 'android') {
      return Promise.resolve([]);
    }
    return new Promise(resolve => {
      const found: DiscoveredPrinter[] = [];
      const z = new Zeroconf();
      this.zeroconf = z;

      const finish = () => {
        try {
          z.stop();
          z.removeDeviceListeners();
        } catch {
          /* ignore */
        }
        this.zeroconf = null;
        resolve(found);
      };

      const timer = setTimeout(finish, timeoutMs);

      z.on('resolved', service => {
        const host = service.addresses?.[0] ?? service.host;
        const port = service.port || DEFAULT_RAW_PORT;
        if (host) {
          found.push({
            name: service.name || host,
            host,
            port,
          });
        }
      });

      try {
        z.scan('_printer._tcp.', 'local.');
        z.scan('_pdl-datastream._tcp.', 'local.');
      } catch (e) {
        clearTimeout(timer);
        captureError(e as Error, {context: 'zeroconf_scan'});
        finish();
      }

      setTimeout(() => {
        clearTimeout(timer);
        finish();
      }, timeoutMs);
    });
  }

  async printEscPos(
    data: string,
    printer?: NetworkPrinterEntry | null,
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('Network ESC/POS printing is Android-only');
    }
    const config = loadHardwareConfig();
    const target = printer ?? resolveNetworkPrinter(config);
    if (!target) {
      throw new Error('No network printer configured');
    }
    await sendEscPosOverTcp(target.host, target.port || DEFAULT_RAW_PORT, data);
  }

  async printReceipt(
    transactionId: string,
    cartLines: CartItem[] = [],
    networkPrinterId?: string,
  ): Promise<void> {
    const config = loadHardwareConfig();
    const printer = resolveNetworkPrinter(config, networkPrinterId);
    const data = await printReceiptEscPos(transactionId);
    const escpos = appendReceiptLineExtras(data.escPos ?? '', cartLines);
    await this.printEscPos(escpos, printer);
  }

  async printTestPage(printer?: NetworkPrinterEntry | null): Promise<void> {
    const testData = [
      escPosInit(),
      '\x1B\x61\x01',
      'SmartAccounting\n',
      'Network printer test\n',
      new Date().toLocaleString() + '\n',
      '--------------------------------\n',
      '\n\n',
      escPosCut(),
    ].join('');
    await this.printEscPos(testData, printer);
  }

  async openCashDrawer(networkPrinterId?: string): Promise<void> {
    const config = loadHardwareConfig();
    const printer = resolveNetworkPrinter(config, networkPrinterId);
    const payload = escPosInit() + CASH_DRAWER_KICK;
    await this.printEscPos(payload, printer);
  }
}

export const networkPrinterService = new NetworkPrinterService();
