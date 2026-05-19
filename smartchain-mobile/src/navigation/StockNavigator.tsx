import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import StockScreen from '../screens/stock/StockScreen';
import LowStockScreen from '../screens/stock/LowStockScreen';
import StockCountScreen from '../screens/stock/StockCountScreen';
import ProductDetailScreen from '../screens/stock/ProductDetailScreen';
import SuppliersScreen from '../screens/stock/SuppliersScreen';
import SupplierFormScreen from '../screens/stock/SupplierFormScreen';
import PurchaseOrdersScreen from '../screens/stock/PurchaseOrdersScreen';
import CreatePoScreen from '../screens/stock/CreatePoScreen';
import PoDetailScreen from '../screens/stock/PoDetailScreen';
import ReceiveGrnScreen from '../screens/stock/ReceiveGrnScreen';
import ExpiringStockScreen from '../screens/stock/ExpiringStockScreen';
import SerialLookupScreen from '../screens/stock/SerialLookupScreen';
import ReorderScreen from '../screens/stock/ReorderScreen';

export type StockStackParamList = {
  StockList: undefined;
  LowStock: undefined;
  StockCount: undefined;
  ProductDetail: {productId: string};
  Suppliers: undefined;
  SupplierForm: {supplierId?: string};
  PurchaseOrders: undefined;
  CreatePo: {
    prefillSupplierId?: string;
    prefillProductId?: string;
    prefillQty?: number;
  };
  PoDetail: {poId: string};
  ReceiveGrn: {poId?: string; supplierId?: string};
  Expiring: undefined;
  SerialLookup: undefined;
  Reorder: undefined;
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
      <Stack.Screen name="LowStock" component={LowStockScreen} options={{title: 'Low stock'}} />
      <Stack.Screen name="StockCount" component={StockCountScreen} options={{title: 'Stock count'}} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{title: 'Product'}} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{title: 'Suppliers'}} />
      <Stack.Screen name="SupplierForm" component={SupplierFormScreen} options={{title: 'Supplier'}} />
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{title: 'Purchase orders'}} />
      <Stack.Screen name="CreatePo" component={CreatePoScreen} options={{title: 'Create PO'}} />
      <Stack.Screen name="PoDetail" component={PoDetailScreen} options={{title: 'Purchase order'}} />
      <Stack.Screen name="ReceiveGrn" component={ReceiveGrnScreen} options={{title: 'Receive goods'}} />
      <Stack.Screen name="Expiring" component={ExpiringStockScreen} options={{title: 'Expiring stock'}} />
      <Stack.Screen name="SerialLookup" component={SerialLookupScreen} options={{title: 'Serial lookup'}} />
      <Stack.Screen name="Reorder" component={ReorderScreen} options={{title: 'Reorder'}} />
    </Stack.Navigator>
  );
}
