module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@reduxjs/toolkit|immer|react-redux)/)',
  ],
  // Scope to units under test until the suite grows; expand this list with new __tests__.
  collectCoverageFrom: [
    'src/api/secureFetch.ts',
    'src/store/slices/tillSlice.ts',
    'src/store/slices/posSlice.ts',
    'src/store/slices/locationSlice.ts',
    'src/utils/tenderValidation.ts',
    'src/pricing/priceListPick.ts',
    'src/pricing/resolveCheckoutPrice.ts',
    'src/pricing/loyalty.ts',
    'src/fiscal/vatEngine.ts',
    'src/fiscal/auditChain.ts',
    'src/services/efd.ts',
    'src/hardware/pluParser.ts',
    'src/hardware/escpos.ts',
  ],
  // Phased ratchet (global, scoped files in collectCoverageFrom):
  //   Phase 2: 38 / 27  |  Phase 3: 43 / 32  |  Phase 4: 55 / 40
  //   Phase 5: 62 / 48  |  Phase 6: 70 / 55  (lines+statements / branches+functions)
  coverageThreshold: {
    global: {
      branches: 32,
      functions: 32,
      lines: 43,
      statements: 43,
    },
  },
};
