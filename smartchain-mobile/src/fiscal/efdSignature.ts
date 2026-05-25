import CryptoJS from 'crypto-js';

/**
 * RRA EFD signing helpers. When `deviceSecret` is set (from EFD_DEVICE_SECRET),
 * signatures use HMAC-SHA256; otherwise callers fall back to mock values.
 * Confirm exact QR pipe format with RRA EFD documentation before production.
 */
export function generateEfdSignature(
  tin: string,
  invoiceNumber: string,
  amount: number,
  dateIso: string,
  deviceSecret: string,
): string {
  const payload = `${tin}|${invoiceNumber}|${amount.toFixed(2)}|${dateIso}`;
  return CryptoJS.HmacSHA256(payload, deviceSecret).toString(CryptoJS.enc.Base64);
}

export function generateEfdQrPayload(params: {
  tin: string;
  invoiceNumber: string;
  amount: number;
  vatAmount: number;
  dateIso: string;
  signature: string;
}): string {
  return [
    params.tin,
    params.invoiceNumber,
    params.amount.toFixed(2),
    params.vatAmount.toFixed(2),
    params.dateIso,
    params.signature,
  ].join('|');
}

export function resolveEfdDeviceSecret(): string | undefined {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_EFD_DEVICE_SECRET
      ? process.env.EXPO_PUBLIC_EFD_DEVICE_SECRET
      : undefined;
  return fromEnv?.trim() || undefined;
}
