import {Platform, PermissionsAndroid} from 'react-native';
import {getItem} from '../../utils/storage';
import {printReceiptEscPos} from '../../api/pos';
import {appendReceiptLineExtras} from '../../utils/receiptExtras';
import type {CartItem} from '../../store/slices/posSlice';
import {CASH_DRAWER_KICK, escPosInit} from '../../hardware/escpos';

export const PREFERRED_PRINTER_KEY = 'preferred_printer';

/** Paired-device shape kept for settings UI; native BT stack removed until BLE is added. */
export type BluetoothDevice = {
  address: string;
  name?: string | null;
};

const BT_UNAVAILABLE_MSG =
  'Bluetooth printing is not available in this build. Use a network or system printer in Settings → Printer.';

class BluetoothPrinterService {
  private connectedAddress: string | null = null;

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    if (Platform.Version < 31) {
      return true;
    }

    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    return Object.values(grants).every(
      g => g === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  async scanForPrinters(): Promise<BluetoothDevice[]> {
    await this.requestPermissions();
    throw new Error(BT_UNAVAILABLE_MSG);
  }

  async connect(_deviceAddress: string): Promise<void> {
    throw new Error(BT_UNAVAILABLE_MSG);
  }

  async autoConnect(): Promise<boolean> {
    const saved = getItem(PREFERRED_PRINTER_KEY);
    if (!saved) {
      return false;
    }
    try {
      await this.connect(saved);
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connectedAddress = null;
  }

  isConnected(): boolean {
    return this.connectedAddress !== null;
  }

  async printEscPos(_escposData: string): Promise<void> {
    if (!this.isConnected()) {
      const connected = await this.autoConnect();
      if (!connected) {
        throw new Error(
          'No printer connected. Go to Settings → Printer to connect one.',
        );
      }
    }
    throw new Error(BT_UNAVAILABLE_MSG);
  }

  async printReceipt(
    transactionId: string,
    cartLines: CartItem[] = [],
  ): Promise<void> {
    const data = await printReceiptEscPos(transactionId);
    const escpos = appendReceiptLineExtras(data.escPos ?? '', cartLines);
    await this.printEscPos(escpos);
  }

  async openCashDrawer(): Promise<void> {
    await this.printEscPos(escPosInit() + CASH_DRAWER_KICK);
  }

  async printTestPage(): Promise<void> {
    const ESC = '\x1B';
    const GS = '\x1D';
    const testData = [
      ESC + '@',
      ESC + 'a' + '\x01',
      ESC + 'E' + '\x01',
      'SmartAccounting\n',
      ESC + 'E' + '\x00',
      'Test Print\n',
      new Date().toLocaleString() + '\n',
      '--------------------------------\n',
      'Printer connected successfully!\n',
      '--------------------------------\n',
      '\n\n\n',
      GS + 'V' + '\x41' + '\x03',
    ].join('');

    await this.printEscPos(testData);
  }
}

export const printerService = new BluetoothPrinterService();
