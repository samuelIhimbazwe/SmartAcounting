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
  ],
  // Phased ratchet (global, scoped files in collectCoverageFrom):
  //   Phase 6 hardened: 85 / 75 (lines+statements / branches+functions)
  //   Full-app 70% target requires expanding collectCoverageFrom + posSlice/efd tests.
  coverageThreshold: {
    global: {
      branches: 74,
      functions: 78,
      lines: 84,
      statements: 84,
    },
  },
};
