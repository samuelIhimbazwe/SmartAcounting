import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {defaultStackScreenOptions} from '../theme/navigation';
import CheckoutScreen from '../screens/pos/CheckoutScreen';
import BarcodeScreen from '../screens/pos/BarcodeScreen';
import ReceiptScreen from '../screens/pos/ReceiptScreen';
import ReturnsScreen from '../screens/pos/ReturnsScreen';
import CustomerLookupScreen from '../screens/customers/CustomerLookupScreen';
import CatalogSearchScreen from '../screens/pos/CatalogSearchScreen';
import SaleHistoryScreen from '../screens/pos/SaleHistoryScreen';

export type PosStackParamList = {
  Checkout: undefined;
  Barcode: undefined;
  Receipt: undefined;
  Returns: undefined;
  CatalogSearch: undefined;
  SaleHistory: undefined;
  CustomerLookup: {selectForCheckout?: boolean};
};

const Stack = createNativeStackNavigator<PosStackParamList>();

export default function PosNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions}>
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{title: 'Checkout'}} />
      <Stack.Screen name="Barcode" component={BarcodeScreen} options={{title: 'Scan barcode'}} />
      <Stack.Screen name="CatalogSearch" component={CatalogSearchScreen} options={{title: 'Search catalog'}} />
      <Stack.Screen name="SaleHistory" component={SaleHistoryScreen} options={{title: 'Sale history'}} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{title: 'Receipt', headerShown: false}} />
      <Stack.Screen name="Returns" component={ReturnsScreen} options={{title: 'Returns'}} />
      <Stack.Screen name="CustomerLookup" component={CustomerLookupScreen} options={{title: 'Customer'}} />
    </Stack.Navigator>
  );
}
