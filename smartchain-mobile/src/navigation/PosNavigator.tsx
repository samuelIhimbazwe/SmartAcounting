import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import CheckoutScreen from '../screens/pos/CheckoutScreen';
import BarcodeScreen from '../screens/pos/BarcodeScreen';
import ReceiptScreen from '../screens/pos/ReceiptScreen';
import ReturnsScreen from '../screens/pos/ReturnsScreen';

export type PosStackParamList = {
  Checkout: undefined;
  Barcode: undefined;
  Receipt: undefined;
  Returns: undefined;
};

const Stack = createNativeStackNavigator<PosStackParamList>();

export default function PosNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{title: 'Checkout'}} />
      <Stack.Screen name="Barcode" component={BarcodeScreen} options={{title: 'Scan barcode'}} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{title: 'Receipt'}} />
      <Stack.Screen name="Returns" component={ReturnsScreen} options={{title: 'Returns'}} />
    </Stack.Navigator>
  );
}
