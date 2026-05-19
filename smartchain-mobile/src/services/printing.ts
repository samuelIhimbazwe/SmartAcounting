import {Platform, Alert} from 'react-native';
import i18n from '../i18n';
import type {CartItem} from '../store/slices/posSlice';
import type {ReceiptHtmlInput} from '../hardware/receiptHtml';
import {
  printReceipt as routePrintReceipt,
  printReceiptWithHtmlFallback,
  resolvePrintRoute,
} from './printRouter';
import {systemPrintService} from './printer/SystemPrintService';

export async function printReceipt(
  transactionId: string,
  cartLines: CartItem[] = [],
  htmlExtras?: Omit<ReceiptHtmlInput, 'transactionId' | 'lines'>,
  locationId?: string | null,
): Promise<void> {
  if (Platform.OS === 'ios') {
    if (!htmlExtras) {
      throw new Error(i18n.t('receipt.iosPrintNeedsData'));
    }
    await systemPrintService.printReceipt(transactionId, cartLines, htmlExtras);
    return;
  }

  const route = resolvePrintRoute(locationId);
  if (route === 'system') {
    if (!htmlExtras) {
      throw new Error(i18n.t('printing.failed'));
    }
    await systemPrintService.printReceipt(transactionId, cartLines, htmlExtras);
    return;
  }

  if (htmlExtras) {
    await printReceiptWithHtmlFallback(
      transactionId,
      cartLines,
      htmlExtras,
      locationId,
    );
    return;
  }

  await routePrintReceipt(transactionId, cartLines, locationId);
}

export async function printReceiptWithAlert(
  transactionId: string,
  cartLines: CartItem[] = [],
  htmlExtras?: Omit<ReceiptHtmlInput, 'transactionId' | 'lines'>,
  locationId?: string | null,
): Promise<void> {
  try {
    await printReceipt(transactionId, cartLines, htmlExtras, locationId);
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

export {openCashDrawer, shouldKickCashDrawer} from './printRouter';
