import {Platform} from 'react-native';
import {
  loadHardwareConfig,
  resolveNetworkPrinter,
  type PrinterRouteKind,
} from '../../hardware/printerConfig';
import {escPosCut, escPosInit} from '../../hardware/escpos';
import {printerService} from './BluetoothPrinterService';
import {networkPrinterService} from './NetworkPrinterService';

export type LabelType = 'price' | 'shelf' | 'expiry';
export type LabelFormat = 'zpl' | 'escpos';

export interface LabelPayload {
  name: string;
  price: number;
  currency: string;
  barcode?: string;
  sku?: string;
  uom?: string;
  batch?: string;
  expiryDate?: string;
}

function formatPrice(price: number, currency: string): string {
  return `${price.toFixed(0)} ${currency}`;
}

export function buildZplLabel(
  type: LabelType,
  data: LabelPayload,
  copies: number,
): string {
  const qty = Math.max(1, Math.min(copies, 99));
  const lines: string[] = ['^XA'];
  if (type === 'price') {
    lines.push(`^FO30,30^A0N,28,28^FD${sanitizeZpl(data.name)}^FS`);
    lines.push(
      `^FO30,70^A0N,36,36^FD${sanitizeZpl(formatPrice(data.price, data.currency))}^FS`,
    );
    if (data.barcode) {
      lines.push(`^FO30,120^BCN,60,Y,N,N^FD${data.barcode}^FS`);
    }
  } else if (type === 'shelf') {
    lines.push(`^FO30,20^A0N,24,24^FD${sanitizeZpl(data.name)}^FS`);
    lines.push(
      `^FO30,55^A0N,32,32^FD${sanitizeZpl(formatPrice(data.price, data.currency))}^FS`,
    );
    if (data.uom) {
      lines.push(`^FO30,95^A0N,20,20^FD${sanitizeZpl(data.uom)}^FS`);
    }
    if (data.barcode) {
      lines.push(`^FO30,125^BCN,50,Y,N,N^FD${data.barcode}^FS`);
    }
  } else {
    lines.push(`^FO30,20^A0N,22,22^FD${sanitizeZpl(data.name)}^FS`);
    if (data.batch) {
      lines.push(`^FO30,50^A0N,20,20^FDBatch: ${sanitizeZpl(data.batch)}^FS`);
    }
    if (data.expiryDate) {
      lines.push(
        `^FO30,80^A0N,20,20^FDExp: ${sanitizeZpl(data.expiryDate)}^FS`,
      );
    }
  }
  lines.push(`^PQ${qty}`);
  lines.push('^XZ');
  return lines.join('\n');
}

function sanitizeZpl(s: string): string {
  return s.replace(/[\^~]/g, ' ');
}

export function buildEscPosLabel(
  type: LabelType,
  data: LabelPayload,
): string {
  const ESC = '\x1B';
  const parts = [escPosInit(), ESC + 'a' + '\x01'];
  parts.push(`${data.name}\n`);
  if (type === 'price' || type === 'shelf') {
    parts.push(`${formatPrice(data.price, data.currency)}\n`);
    if (type === 'shelf' && data.uom) {
      parts.push(`${data.uom}\n`);
    }
    if (data.barcode) {
      parts.push(`${data.barcode}\n`);
    }
  } else {
    if (data.batch) {
      parts.push(`Batch: ${data.batch}\n`);
    }
    if (data.expiryDate) {
      parts.push(`Exp: ${data.expiryDate}\n`);
    }
  }
  parts.push('\n\n', escPosCut());
  return parts.join('');
}

async function sendLabelPayload(
  payload: string,
  route: PrinterRouteKind,
  networkPrinterId?: string,
): Promise<void> {
  if (route === 'network') {
    const config = loadHardwareConfig();
    const printer = resolveNetworkPrinter(config, networkPrinterId);
    await networkPrinterService.printEscPos(payload, printer);
    return;
  }
  if (route === 'bluetooth') {
    await printerService.printEscPos(payload);
    return;
  }
  throw new Error('Label printing requires a Bluetooth or network printer');
}

class LabelPrinterService {
  async printLabel(options: {
    type: LabelType;
    format: LabelFormat;
    data: LabelPayload;
    copies?: number;
    route?: PrinterRouteKind;
    networkPrinterId?: string;
  }): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('Label printing is Android-only in this release');
    }
    const config = loadHardwareConfig();
    const route = options.route ?? config.defaultPrinterKind;
    const copies = options.copies ?? 1;
    const payload =
      options.format === 'zpl'
        ? buildZplLabel(options.type, options.data, copies)
        : buildEscPosLabel(options.type, options.data);
    await sendLabelPayload(payload, route, options.networkPrinterId);
  }

  async printBulk(
    labels: Array<{
      type: LabelType;
      format: LabelFormat;
      data: LabelPayload;
      copies?: number;
    }>,
    route?: PrinterRouteKind,
  ): Promise<void> {
    for (const label of labels) {
      await this.printLabel({...label, route});
    }
  }
}

export const labelPrinterService = new LabelPrinterService();
