declare module 'react-native-print' {
  export interface PrintOptions {
    html?: string;
    jobName?: string;
  }

  const RNPrint: {
    print(options: PrintOptions): Promise<void>;
  };

  export default RNPrint;
}
