import {getItem, setItem} from '../utils/storage';

export type ReceiptDeliveryMode = 'ask' | 'always' | 'never';

export type ReceiptDeliveryConfig = {
  whatsappEnabled: boolean;
  mode: ReceiptDeliveryMode;
};

const KEY = 'receipt_delivery_v1';

const DEFAULTS: ReceiptDeliveryConfig = {
  whatsappEnabled: true,
  mode: 'ask',
};

export function loadReceiptDeliveryConfig(): ReceiptDeliveryConfig {
  try {
    const raw = getItem(KEY);
    if (!raw) {
      return {...DEFAULTS};
    }
    return {...DEFAULTS, ...(JSON.parse(raw) as ReceiptDeliveryConfig)};
  } catch {
    return {...DEFAULTS};
  }
}

export function saveReceiptDeliveryConfig(cfg: ReceiptDeliveryConfig): void {
  setItem(KEY, JSON.stringify(cfg));
}
