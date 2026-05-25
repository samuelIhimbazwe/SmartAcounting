import {
  generateEfdQrPayload,
  generateEfdSignature,
  resolveEfdDeviceSecret,
} from '../fiscal/efdSignature';

describe('efdSignature', () => {
  it('generateEfdSignature is deterministic', () => {
    const a = generateEfdSignature(
      '123456789',
      'INV-001',
      10000,
      '2026-05-20',
      'secret',
    );
    const b = generateEfdSignature(
      '123456789',
      'INV-001',
      10000,
      '2026-05-20',
      'secret',
    );
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it('generateEfdSignature changes when amount changes', () => {
    const a = generateEfdSignature(
      '123456789',
      'INV-001',
      10000,
      '2026-05-20',
      'secret',
    );
    const b = generateEfdSignature(
      '123456789',
      'INV-001',
      20000,
      '2026-05-20',
      'secret',
    );
    expect(a).not.toBe(b);
  });

  it('generateEfdQrPayload joins pipe-separated fields', () => {
    const qr = generateEfdQrPayload({
      tin: '123456789',
      invoiceNumber: 'INV-1',
      amount: 1000,
      vatAmount: 180,
      dateIso: '2026-05-20',
      signature: 'sig',
    });
    expect(qr).toBe('123456789|INV-1|1000.00|180.00|2026-05-20|sig');
  });

  it('resolveEfdDeviceSecret returns trimmed env when set', () => {
    const prev = process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET;
    process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET = '  abc  ';
    expect(resolveEfdDeviceSecret()).toBe('abc');
    if (prev === undefined) {
      delete process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET;
    } else {
      process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET = prev;
    }
  });

  it('resolveEfdDeviceSecret returns undefined when unset', () => {
    const prev = process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET;
    delete process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET;
    expect(resolveEfdDeviceSecret()).toBeUndefined();
    if (prev !== undefined) {
      process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET = prev;
    }
  });
});
