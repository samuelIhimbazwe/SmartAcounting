/**
 * Set to true after placing `smartaccounting-cert.cer` in
 * android/app/src/main/assets/ (and iOS bundle per SSL_PINNING_README.txt).
 * Production builds fail fast in secureFetch when this stays false.
 */
export const SSL_PINNING_CERT_INSTALLED = false;
