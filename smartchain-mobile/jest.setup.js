jest.mock('react-native-ssl-pinning', () => ({
  fetch: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: component => component,
  captureException: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
}));

jest.mock('./src/services/crashReporting', () => ({
  initCrashReporting: jest.fn(),
  setUserContext: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const {View} = require('react-native');
  return {GestureHandlerRootView: View};
});

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({children}) => children,
}));

jest.mock('./src/i18n', () => ({
  __esModule: true,
  default: {use: jest.fn(), init: jest.fn(), t: (k) => k, language: 'en'},
  initI18n: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./src/hooks/useNetwork', () => ({useNetwork: jest.fn()}));
jest.mock('./src/hooks/useSync', () => ({useSync: jest.fn()}));
jest.mock('./src/navigation/RootNavigator', () => {
  const React = require('react');
  const {Text} = require('react-native');
  return () => React.createElement(Text, null, 'RootNavigator');
});

jest.mock('./src/store', () => ({
  store: {
    getState: () => ({auth: {}, network: {online: true}}),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  },
  persistor: {persist: jest.fn(), subscribe: jest.fn()},
}));

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaProvider: View, SafeAreaView: View};
});

jest.mock('react-native-paper', () => {
  const {View} = require('react-native');
  return {PaperProvider: View};
});

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const {View} = require('react-native');
  return () => React.createElement(View, {testID: 'mock-qrcode'});
});

jest.mock('react-native-tcp-socket', () => ({
  __esModule: true,
  default: {
    createConnection: jest.fn((_opts, cb) => {
      const client = {
        write: jest.fn((_d, _enc, done) => done?.(null)),
        destroy: jest.fn(),
        on: jest.fn(),
      };
      if (typeof cb === 'function') {
        cb();
      }
      return client;
    }),
  },
}));

jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => ({
    scan: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
    removeDeviceListeners: jest.fn(),
  }));
});

jest.mock('react-native-print', () => ({
  __esModule: true,
  default: {print: jest.fn().mockResolvedValue(undefined)},
}));
