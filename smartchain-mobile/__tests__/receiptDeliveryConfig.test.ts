import {
  loadReceiptDeliveryConfig,
  saveReceiptDeliveryConfig,
} from '../src/services/receiptDeliveryConfig';

describe('receiptDeliveryConfig', () => {
  it('round-trips settings', () => {
    saveReceiptDeliveryConfig({whatsappEnabled: false, mode: 'never'});
    expect(loadReceiptDeliveryConfig().mode).toBe('never');
    saveReceiptDeliveryConfig({whatsappEnabled: true, mode: 'ask'});
  });
});
