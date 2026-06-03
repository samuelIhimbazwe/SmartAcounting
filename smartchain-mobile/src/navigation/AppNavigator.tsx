import React from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import {usePermission} from '../hooks/usePermission';
import {SyncStatusBar} from '../components/SyncStatusBar';
import {AppTabBar} from '../components/ui/AppTabBar';
import {colors} from '../theme/tokens';
import PosNavigator from './PosNavigator';
import StockNavigator from './StockNavigator';
import TillNavigator from './TillNavigator';
import DashboardNavigator from './DashboardNavigator';
import SettingsNavigator from './SettingsNavigator';
import CopilotScreen from '../screens/copilot/CopilotScreen';
import CustomerNavigator from './CustomerNavigator';

const Tab = createBottomTabNavigator();

function resolveInitialRoute(
  canTill: boolean,
  canPos: boolean,
  canDashboard: boolean,
  canCopilot: boolean,
): string {
  if (canTill && canPos && !canDashboard) {
    return 'Till';
  }
  if (canDashboard) {
    return 'Dashboard';
  }
  if (canPos) {
    return 'POS';
  }
  if (canTill) {
    return 'Till';
  }
  if (canCopilot) {
    return 'Copilot';
  }
  return 'Settings';
}

export default function AppNavigator() {
  const canTill = usePermission('POS_TILL_MANAGE');
  const canPos = usePermission('POS_ACCESS');
  const canStock = usePermission('INVENTORY_READ');
  const canCustomers = usePermission('POS_ACCESS');
  const canDashboard = usePermission('ANALYTICS_OWN');
  const canCopilot = usePermission('AI_COPILOT');
  const copilotBadge = useSelector((s: RootState) => s.copilot.badgeCount);

  const initialRouteName = resolveInitialRoute(
    canTill,
    canPos,
    canDashboard,
    canCopilot,
  );

  return (
    <SafeAreaView edges={['top']} style={{flex: 1, backgroundColor: colors.bgPage}}>
      <SyncStatusBar />
      <View style={{flex: 1, backgroundColor: colors.bgPage}}>
        <Tab.Navigator
          initialRouteName={initialRouteName}
          tabBar={props => <AppTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray400,
          }}>
          {canTill ? (
            <Tab.Screen
              name="Till"
              component={TillNavigator}
              options={{tabBarLabel: 'Till'}}
            />
          ) : null}
          {canPos ? (
            <Tab.Screen
              name="POS"
              component={PosNavigator}
              options={{tabBarLabel: 'POS'}}
            />
          ) : null}
          {canStock ? (
            <Tab.Screen
              name="Stock"
              component={StockNavigator}
              options={{tabBarLabel: 'Stock'}}
            />
          ) : null}
          {canCustomers ? (
            <Tab.Screen
              name="Customers"
              component={CustomerNavigator}
              options={{tabBarLabel: 'Customers'}}
            />
          ) : null}
          {canDashboard ? (
            <Tab.Screen
              name="Dashboard"
              component={DashboardNavigator}
              options={{tabBarLabel: 'Dashboard'}}
            />
          ) : null}
          {canCopilot ? (
            <Tab.Screen
              name="Copilot"
              component={CopilotScreen}
              options={{
                tabBarLabel: 'Copilot',
                tabBarBadge: copilotBadge > 0 ? copilotBadge : undefined,
              }}
            />
          ) : null}
          <Tab.Screen
            name="Settings"
            component={SettingsNavigator}
            options={{tabBarLabel: 'Settings'}}
          />
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}
