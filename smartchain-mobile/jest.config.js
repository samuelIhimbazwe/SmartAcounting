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
    'src/utils/tenderValidation.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 30,
      lines: 45,
      statements: 45,
    },
  },
};
