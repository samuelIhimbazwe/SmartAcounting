import {Platform} from 'react-native';
import {printReceiptEscPos} from '../api/pos';

export async function printReceipt(transactionId: string): Promise<void> {
  const data = await printReceiptEscPos(transactionId);
  const escpos = data.escPos ?? '';

  if (Platform.OS === 'android') {
    await printViaBluetooth(escpos);
  } else {
    await printViaAirPrint(escpos);
  }
}

async function printViaBluetooth(escposData: string): Promise<void> {
  console.log('Bluetooth ESC/POS payload length:', escposData.length);
}

async function printViaAirPrint(htmlOrText: string): Promise<void> {
  console.log('AirPrint payload length:', htmlOrText.length);
}
