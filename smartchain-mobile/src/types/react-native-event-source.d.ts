declare module 'react-native-event-source' {
  export default class EventSource {
    constructor(url: string, options?: Record<string, unknown>);
    addEventListener(type: string, listener: (event: {data?: string}) => void): void;
    close(): void;
  }
}
