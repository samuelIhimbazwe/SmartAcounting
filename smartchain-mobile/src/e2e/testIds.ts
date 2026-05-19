/** Stable IDs for Maestro / accessibility — keep in sync with e2e/smoke.yaml */
export const testIds = {
  authUsername: 'auth.username',
  authPassword: 'auth.password',
  authSignIn: 'auth.sign-in',
  tillOpenFloat: 'till.open-float',
  tillOpenSubmit: 'till.open-submit',
  tillContinuePos: 'till.continue-pos',
  tillCloseNav: 'till.close-nav',
  tillCloseSubmit: 'till.close-submit',
  checkoutBarcode: 'checkout.barcode',
  checkoutAdd: 'checkout.add',
  checkoutTenderCash: 'checkout.tender-cash',
  checkoutComplete: 'checkout.complete-sale',
  receiptPrint: 'receipt.print',
} as const;
