import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import StockScreen from '../screens/stock/StockScreen';
import LowStockScreen from '../screens/stock/LowStockScreen';

export type StockStackParamList = {
  StockList: undefined;
  LowStock: undefined;
};

const Stack = createNativeStackNavigator<StockStackParamList>();

export default function StockNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StockList"
        component={StockScreen}
        options={{title: 'Stock levels'}}
      />
      <Stack.Screen
        name="LowStock"
        component={LowStockScreen}
        options={{title: 'Low stock'}}
      />
    </Stack.Navigator>
  );
}
