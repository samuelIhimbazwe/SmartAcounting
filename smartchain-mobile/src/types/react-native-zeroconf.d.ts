declare module 'react-native-zeroconf' {
  export interface ZeroconfService {
    name?: string;
    host?: string;
    port?: number;
    addresses?: string[];
  }

  export default class Zeroconf {
    scan(type: string, protocol: string, domain?: string): void;
    stop(): void;
    on(event: 'resolved', callback: (service: ZeroconfService) => void): void;
    removeDeviceListeners(): void;
  }
}
