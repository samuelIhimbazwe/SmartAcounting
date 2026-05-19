import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import OwnerDashboardScreen from '../screens/dashboard/OwnerDashboardScreen';
import AnomalyDetailScreen from '../screens/dashboard/AnomalyDetailScreen';
import DemandForecastScreen from '../screens/dashboard/DemandForecastScreen';
import CashFlowForecastScreen from '../screens/dashboard/CashFlowForecastScreen';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  AnomalyDetail: {alert: Record<string, unknown>};
  DemandForecast: {horizonDays?: number};
  CashFlowForecast: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DashboardHome"
        component={OwnerDashboardScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AnomalyDetail"
        component={AnomalyDetailScreen}
        options={{title: 'Anomaly'}}
      />
      <Stack.Screen
        name="DemandForecast"
        component={DemandForecastScreen}
        options={{title: 'Demand forecast'}}
      />
      <Stack.Screen
        name="CashFlowForecast"
        component={CashFlowForecastScreen}
        options={{title: 'Cash flow'}}
      />
    </Stack.Navigator>
  );
}
