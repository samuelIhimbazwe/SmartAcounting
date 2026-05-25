module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@reduxjs/toolkit|immer|react-redux)/)',
  ],
  // Scope to units under test until the suite grows; expand this list with new __tests__.
  collectCoverageFrom: [
    'src/api/secureFetch.ts',
    'src/api/aiAnalytics.ts',
    'src/store/slices/locationSlice.ts',
    'src/utils/tenderValidation.ts',
    'src/pricing/priceListPick.ts',
    'src/pricing/resolveCheckoutPrice.ts',
    'src/pricing/loyalty.ts',
    'src/fiscal/vatEngine.ts',
    'src/fiscal/auditChain.ts',
    'src/hardware/pluParser.ts',
    'src/hardware/escpos.ts',
    'src/services/syncProgress.ts',
    'src/services/receiptDeliveryConfig.ts',
    'src/fiscal/efdSignature.ts',
    'src/utils/formatting.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
