import {ENV} from './env';

/**
 * Pin TLS when the API host is production Rwanda.
 * Place `smartaccounting-cert.cer` in android/app/src/main/assets/ (and iOS bundle)
 * before shipping a build that targets rw.smartaccounting.app.
 */
export const ENABLE_SSL_PINNING = ENV.API_BASE_URL.includes('rw.smartaccounting.app');

/** Ops: set true only after the cert file is present in native assets. */
export const SSL_PINNING_CERT_INSTALLED = ENABLE_SSL_PINNING;
