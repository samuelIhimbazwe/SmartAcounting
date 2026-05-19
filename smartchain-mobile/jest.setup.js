jest.mock('react-native-ssl-pinning', () => ({
  fetch: jest.fn(),
}));
