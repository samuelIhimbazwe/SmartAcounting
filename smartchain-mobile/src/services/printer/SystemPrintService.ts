import {Platform} from 'react-native';
import RNPrint from 'react-native-print';
import type {CartItem} from '../../store/slices/posSlice';
import {buildReceiptHtml, type ReceiptHtmlInput} from '../../hardware/receiptHtml';
import {loadHardwareConfig} from '../../hardware/printerConfig';

/**
 * System print (AirPrint on iOS, system print dialog on Android fallback).
 * Replaces the previous iOS print stub.
 */
class SystemPrintService {
  async printHtml(html: string, jobName = 'Receipt'): Promise<void> {
    await RNPrint.print({
      html,
      jobName,
    });
  }

  async printReceiptFromState(input: ReceiptHtmlInput): Promise<void> {
    const config = loadHardwareConfig();
    const html = buildReceiptHtml({
      ...input,
      storeName: input.storeName ?? config.storeDisplayName,
    });
    await this.printHtml(html, `Receipt ${input.transactionId}`);
  }

  async printReceipt(
    transactionId: string,
    lines: CartItem[],
    extras: Omit<ReceiptHtmlInput, 'transactionId' | 'lines'>,
  ): Promise<void> {
    await this.printReceiptFromState({
      transactionId,
      lines,
      ...extras,
    });
  }

  isAirPrintPlatform(): boolean {
    return Platform.OS === 'ios';
  }
}

export const systemPrintService = new SystemPrintService();
