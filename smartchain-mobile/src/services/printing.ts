import {Platform, Alert} from 'react-native';
import {printerService} from './printer/BluetoothPrinterService';

export async function printReceipt(transactionId: string): Promise<void> {
  if (Platform.OS === 'android') {
    await printerService.printReceipt(transactionId);
    return;
  }
  Alert.alert(
    'Printing',
    'Bluetooth printing is Android-only. Use AirPrint from the receipt screen.',
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
