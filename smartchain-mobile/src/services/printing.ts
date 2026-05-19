import {Platform, Alert} from 'react-native';
import i18n from '../i18n';
import {printerService} from './printer/BluetoothPrinterService';
import type {CartItem} from '../store/slices/posSlice';

export async function printReceipt(
  transactionId: string,
  cartLines: CartItem[] = [],
): Promise<void> {
  if (Platform.OS === 'android') {
    await printerService.printReceipt(transactionId, cartLines);
    return;
  }
  Alert.alert(
    i18n.t('receipt.iosPrintTitle'),
    i18n.t('receipt.iosPrintAlert'),
  );
}

export async function printReceiptWithAlert(
  transactionId: string,
  cartLines: CartItem[] = [],
): Promise<void> {
  try {
    await printReceipt(transactionId, cartLines);
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
