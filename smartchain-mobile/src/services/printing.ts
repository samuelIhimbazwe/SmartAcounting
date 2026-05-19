import {Platform, Alert} from 'react-native';
import i18n from '../i18n';
import {printerService} from './printer/BluetoothPrinterService';

export async function printReceipt(transactionId: string): Promise<void> {
  if (Platform.OS === 'android') {
    await printerService.printReceipt(transactionId);
    return;
  }
  Alert.alert(
    i18n.t('receipt.iosPrintTitle'),
    i18n.t('receipt.iosPrintAlert'),
  );
}

export async function printReceiptWithAlert(transactionId: string): Promise<void> {
  try {
    await printReceipt(transactionId);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : i18n.t('printing.failed');
    Alert.alert(
      i18n.t('receipt.printFailed'),
      i18n.t('receipt.printFailedBody', {message}),
      [{text: i18n.t('common.ok')}],
    );
  }
}
