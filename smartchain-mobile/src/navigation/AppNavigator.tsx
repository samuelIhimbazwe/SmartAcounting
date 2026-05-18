import React from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import type {AppRole} from '../utils/roles';
import {hasAnyRole} from '../utils/roles';
import {SyncStatusBar} from '../components/SyncStatusBar';
import PosNavigator from './PosNavigator';
import StockNavigator from './StockNavigator';
import TillNavigator from './TillNavigator';
import OwnerDashboardScreen from '../screens/dashboard/OwnerDashboardScreen';

const Tab = createBottomTabNavigator();

function tabIcon(name: string, color: string, size: number) {
  return <Icon name={name} color={color} size={Math.max(size, 24)} />;
}

export default function AppNavigator() {
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];

  const showPos = hasAnyRole(roles, 'CEO', 'SALES_MANAGER', 'OPS_MANAGER');
  const showStock = hasAnyRole(
    roles,
    'CEO',
    'SALES_MANAGER',
    'OPS_MANAGER',
    'ACCOUNTING_CONTROLLER',
  );
  const showTill = hasAnyRole(
    roles,
    'CEO',
    'SALES_MANAGER',
    'OPS_MANAGER',
    'ACCOUNTING_CONTROLLER',
  );
  const showDashboard = hasAnyRole(roles, 'CEO', 'CFO');

  return (
    <SafeAreaView edges={['top']} style={{flex: 1}}>
      <SyncStatusBar />
      <View style={{flex: 1}}>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {minHeight: 56},
            tabBarItemStyle: {minHeight: 48},
            headerShown: false,
          }}>
          {showPos ? (
            <Tab.Screen
              name="POS"
              component={PosNavigator}
              options={{
                tabBarIcon: p => tabIcon('cash-register', p.color, p.size),
              }}
            />
          ) : null}
          {showStock ? (
            <Tab.Screen
              name="Stock"
              component={StockNavigator}
              options={{
                tabBarIcon: p => tabIcon('package-variant', p.color, p.size),
              }}
            />
          ) : null}
          {showTill ? (
            <Tab.Screen
              name="Till"
              component={TillNavigator}
              options={{
                tabBarIcon: p => tabIcon('cash-multiple', p.color, p.size),
              }}
            />
          ) : null}
          {showDashboard ? (
            <Tab.Screen
              name="Dashboard"
              component={OwnerDashboardScreen}
              options={{
                tabBarIcon: p =>
                  tabIcon('view-dashboard-outline', p.color, p.size),
              }}
            />
          ) : null}
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}
