import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {defaultStackScreenOptions} from '../theme/navigation';
import CustomerLookupScreen from '../screens/customers/CustomerLookupScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import CustomerFormScreen from '../screens/customers/CustomerFormScreen';
import CreditStatementScreen from '../screens/customers/CreditStatementScreen';
import PriceListManageScreen from '../screens/customers/PriceListManageScreen';
import PromotionManageScreen from '../screens/customers/PromotionManageScreen';
import LayawayListScreen from '../screens/customers/LayawayListScreen';
import QuoteListScreen from '../screens/customers/QuoteListScreen';
import QuoteBuilderScreen from '../screens/customers/QuoteBuilderScreen';

export type CustomerStackParamList = {
  CustomerLookup: {selectForCheckout?: boolean};
  CustomerDetail: {customerId: string};
  CustomerForm: {customerId?: string};
  CreditStatement: {customerId: string};
  PriceListManage: undefined;
  PromotionManage: undefined;
  LayawayList: undefined;
  QuoteList: undefined;
  QuoteBuilder: {quoteId?: string};
};

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions}>
      <Stack.Screen name="CustomerLookup" component={CustomerLookupScreen} options={{title: 'Customers'}} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{title: 'Customer'}} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{title: 'Customer'}} />
      <Stack.Screen name="CreditStatement" component={CreditStatementScreen} options={{title: 'Credit'}} />
      <Stack.Screen name="PriceListManage" component={PriceListManageScreen} options={{title: 'Price lists'}} />
      <Stack.Screen name="PromotionManage" component={PromotionManageScreen} options={{title: 'Promotions'}} />
      <Stack.Screen name="LayawayList" component={LayawayListScreen} options={{title: 'Layaway'}} />
      <Stack.Screen name="QuoteList" component={QuoteListScreen} options={{title: 'Quotes'}} />
      <Stack.Screen name="QuoteBuilder" component={QuoteBuilderScreen} options={{title: 'Quote'}} />
    </Stack.Navigator>
  );
}
