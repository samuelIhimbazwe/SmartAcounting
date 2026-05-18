import {Platform, Alert} from 'react-native';
import {printerService} from './printer/BluetoothPrinterService';

export async function printReceipt(transactionId: string): Promise<void> {
  if (Platform.OS === 'android') {
    await printerService.printReceipt(transactionId);
    return;
  }
  Alert.alert(
    'Printing',
    'Bluetooth receipt printing is available on Android. Use the web app for iOS receipts.',
  );
}

export async function printReceiptWithAlert(transactionId: string): Promise<void> {
  try {
    await printReceipt(transactionId);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Print failed';
    Alert.alert(
      'Print failed',
      `${message}\n\nThe sale was recorded successfully.`,
      [{text: 'OK'}],
    );
  }
}
