import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';
import {Platform, PermissionsAndroid} from 'react-native';
import {captureError} from '../crashReporting';
import {getItem, setItem} from '../../utils/storage';
import {printReceiptEscPos} from '../../api/pos';
import {appendReceiptLineExtras} from '../../utils/receiptExtras';
import type {CartItem} from '../../store/slices/posSlice';

const PREFERRED_PRINTER_KEY = 'preferred_printer';

class BluetoothPrinterService {
  private connectedDevice: BluetoothDevice | null = null;

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
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permission denied');
    }

    const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!isEnabled) {
      await RNBluetoothClassic.requestBluetoothEnabled();
    }

    const paired = await RNBluetoothClassic.getBondedDevices();
    return paired.filter(d => {
      const name = d.name?.toLowerCase() ?? '';
      return (
        name.includes('print') ||
        name.includes('pos') ||
        name.includes('thermal') ||
        name.includes('rp') ||
        name.includes('xp') ||
        name.includes('mp') ||
        name.includes('epson')
      );
    });
  }

  async connect(deviceAddress: string): Promise<void> {
    try {
      if (this.connectedDevice) {
        await this.disconnect();
      }

      const device = await RNBluetoothClassic.connectToDevice(deviceAddress);
      this.connectedDevice = device;
      setItem(PREFERRED_PRINTER_KEY, deviceAddress);
    } catch (error) {
      captureError(error as Error, {deviceAddress});
      throw new Error(
        'Could not connect to printer. Make sure it is on and paired in Bluetooth settings.',
      );
    }
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
    if (this.connectedDevice) {
      await this.connectedDevice.disconnect();
      this.connectedDevice = null;
    }
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  async printEscPos(escposData: string): Promise<void> {
    if (!this.connectedDevice) {
      const connected = await this.autoConnect();
      if (!connected) {
        throw new Error(
          'No printer connected. Go to Settings → Printer to connect one.',
        );
      }
    }

    try {
      await this.connectedDevice!.write(escposData);
    } catch (error) {
      this.connectedDevice = null;
      captureError(error as Error);
      throw new Error('Print failed. Check printer is on and in range.');
    }
  }

  async printReceipt(
    transactionId: string,
    cartLines: CartItem[] = [],
  ): Promise<void> {
    const data = await printReceiptEscPos(transactionId);
    const escpos = appendReceiptLineExtras(data.escPos ?? '', cartLines);
    await this.printEscPos(escpos);
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
