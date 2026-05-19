import {Platform} from 'react-native';
import type {CartItem} from '../store/slices/posSlice';
import {
  getPrinterRouteForLocation,
  loadHardwareConfig,
  type PrinterRouteKind,
} from '../hardware/printerConfig';
import {printerService} from './printer/BluetoothPrinterService';
import {networkPrinterService} from './printer/NetworkPrinterService';
import {systemPrintService} from './printer/SystemPrintService';
import type {ReceiptHtmlInput} from '../hardware/receiptHtml';

export function resolvePrintRoute(
  locationId?: string | null,
): PrinterRouteKind {
  if (Platform.OS === 'ios') {
    return 'system';
  }
  const config = loadHardwareConfig();
  const {kind} = getPrinterRouteForLocation(config, locationId);
  if (kind === 'network' && config.networkPrinters.length === 0) {
    return config.defaultPrinterKind === 'bluetooth' ? 'bluetooth' : 'system';
  }
  return kind;
}

export async function printReceipt(
  transactionId: string,
  cartLines: CartItem[] = [],
  locationId?: string | null,
  networkPrinterId?: string,
): Promise<void> {
  const config = loadHardwareConfig();
  const route = resolvePrintRoute(locationId);
  if (route === 'network') {
    const pref = getPrinterRouteForLocation(config, locationId);
    await networkPrinterService.printReceipt(
      transactionId,
      cartLines,
      networkPrinterId ?? pref.networkPrinterId,
    );
    return;
  }
  if (route === 'bluetooth') {
    await printerService.printReceipt(transactionId, cartLines);
    return;
  }
  throw new Error('Use system print for this route');
}

export async function printReceiptWithHtmlFallback(
  transactionId: string,
  cartLines: CartItem[],
  htmlInput: Omit<ReceiptHtmlInput, 'transactionId' | 'lines'>,
  locationId?: string | null,
): Promise<void> {
  const route = resolvePrintRoute(locationId);
  if (route === 'system') {
    await systemPrintService.printReceipt(transactionId, cartLines, htmlInput);
    return;
  }
  try {
    await printReceipt(transactionId, cartLines, locationId);
  } catch {
    await systemPrintService.printReceipt(transactionId, cartLines, htmlInput);
  }
}

export async function openCashDrawer(locationId?: string | null): Promise<void> {
  const config = loadHardwareConfig();
  if (!config.cashDrawerEnabled) {
    return;
  }
  if (Platform.OS !== 'android') {
    return;
  }
  const {kind, networkPrinterId} = getPrinterRouteForLocation(
    config,
    locationId,
  );
  if (kind === 'network') {
    await networkPrinterService.openCashDrawer(networkPrinterId);
    return;
  }
  await printerService.openCashDrawer();
}

export function shouldKickCashDrawer(tenderLines: Array<{tenderType: string; amount: number}>): boolean {
  const paid = tenderLines.filter(t => t.amount > 0);
  if (paid.length === 0) {
    return false;
  }
  const hasCash = paid.some(t => t.tenderType === 'CASH');
  return hasCash;
}
