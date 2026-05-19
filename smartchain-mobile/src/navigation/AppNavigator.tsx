import React from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import type {AppRole} from '../utils/roles';
import {hasAnyRole, isCashierShell} from '../utils/roles';
import {SyncStatusBar} from '../components/SyncStatusBar';
import PosNavigator from './PosNavigator';
import StockNavigator from './StockNavigator';
import TillNavigator from './TillNavigator';
import OwnerDashboardScreen from '../screens/dashboard/OwnerDashboardScreen';
import SettingsNavigator from './SettingsNavigator';
import CopilotScreen from '../screens/copilot/CopilotScreen';

const Tab = createBottomTabNavigator();

function tabIcon(name: string, color: string, size: number) {
  return <Icon name={name} color={color} size={Math.max(size, 24)} />;
}

function resolveInitialRoute(
  role: AppRole | null,
  flags: {
    showTill: boolean;
    showDashboard: boolean;
    showPos: boolean;
    cashierShell: boolean;
  },
): string {
  if (flags.cashierShell || role === 'CASHIER' || role === 'POS_OPERATOR') {
    return 'Till';
  }
  if (
    role === 'SALES_MANAGER' ||
    role === 'ACCOUNTING_CONTROLLER'
  ) {
    return flags.showTill ? 'Till' : flags.showPos ? 'POS' : 'Copilot';
  }
  if (flags.showDashboard) {
    return 'Dashboard';
  }
  if (flags.showPos) {
    return 'POS';
  }
  if (flags.showTill) {
    return 'Till';
  }
  return 'Copilot';
}

export default function AppNavigator() {
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const role = useSelector((s: RootState) => s.auth.role);
  const cashierShell = isCashierShell(roles);

  const showPos =
    cashierShell ||
    hasAnyRole(roles, 'CEO', 'SALES_MANAGER', 'OPS_MANAGER', 'CASHIER', 'POS_OPERATOR');
  const showStock =
    !cashierShell &&
    hasAnyRole(
      roles,
      'CEO',
      'SALES_MANAGER',
      'OPS_MANAGER',
      'ACCOUNTING_CONTROLLER',
    );
  const showTill =
    cashierShell ||
    hasAnyRole(
      roles,
      'CEO',
      'SALES_MANAGER',
      'OPS_MANAGER',
      'ACCOUNTING_CONTROLLER',
      'CASHIER',
      'POS_OPERATOR',
    );
  const showDashboard =
    !cashierShell && hasAnyRole(roles, 'CEO', 'CFO');
  const showCopilot = !cashierShell;

  const initialRouteName = resolveInitialRoute(role, {
    showTill,
    showDashboard,
    showPos,
    cashierShell,
  });

  return (
    <SafeAreaView edges={['top']} style={{flex: 1}}>
      <SyncStatusBar />
      <View style={{flex: 1}}>
        <Tab.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            tabBarStyle: {minHeight: 56},
            tabBarItemStyle: {minHeight: 48},
            headerShown: false,
          }}>
          {showTill ? (
            <Tab.Screen
              name="Till"
              component={TillNavigator}
              options={{
                tabBarIcon: p => tabIcon('cash-multiple', p.color, p.size),
              }}
            />
          ) : null}
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
          {showCopilot ? (
            <Tab.Screen
              name="Copilot"
              component={CopilotScreen}
              options={{
                tabBarIcon: p => (
                  <Text style={{fontSize: 20, color: p.color}}>✨</Text>
                ),
                tabBarLabel: 'Copilot',
              }}
            />
          ) : null}
          <Tab.Screen
            name="Settings"
            component={SettingsNavigator}
            options={{
              tabBarIcon: p => tabIcon('cog-outline', p.color, p.size),
            }}
          />
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}
