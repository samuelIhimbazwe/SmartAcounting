import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import StockScreen from '../screens/stock/StockScreen';
import LowStockScreen from '../screens/stock/LowStockScreen';
import StockCountScreen from '../screens/stock/StockCountScreen';

export type StockStackParamList = {
  StockList: undefined;
  LowStock: undefined;
  StockCount: undefined;
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
      <Stack.Screen
        name="StockCount"
        component={StockCountScreen}
        options={{title: 'Stock count'}}
      />
    </Stack.Navigator>
  );
}
