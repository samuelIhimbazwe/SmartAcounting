import React from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import {usePermission} from '../hooks/usePermission';
import {SyncStatusBar} from '../components/SyncStatusBar';
import PosNavigator from './PosNavigator';
import StockNavigator from './StockNavigator';
import TillNavigator from './TillNavigator';
import DashboardNavigator from './DashboardNavigator';
import SettingsNavigator from './SettingsNavigator';
import CopilotScreen from '../screens/copilot/CopilotScreen';
import CustomerNavigator from './CustomerNavigator';

const Tab = createBottomTabNavigator();

function tabIcon(name: string, color: string, size: number) {
  return <Icon name={name} color={color} size={Math.max(size, 24)} />;
}

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
          {canTill ? (
            <Tab.Screen
              name="Till"
              component={TillNavigator}
              options={{
                tabBarIcon: p => tabIcon('cash-multiple', p.color, p.size),
              }}
            />
          ) : null}
          {canPos ? (
            <Tab.Screen
              name="POS"
              component={PosNavigator}
              options={{
                tabBarIcon: p => tabIcon('cash-register', p.color, p.size),
              }}
            />
          ) : null}
          {canStock ? (
            <Tab.Screen
              name="Stock"
              component={StockNavigator}
              options={{
                tabBarIcon: p => tabIcon('package-variant', p.color, p.size),
              }}
            />
          ) : null}
          {canCustomers ? (
            <Tab.Screen
              name="Customers"
              component={CustomerNavigator}
              options={{
                tabBarIcon: p => tabIcon('account-group', p.color, p.size),
              }}
            />
          ) : null}
          {canDashboard ? (
            <Tab.Screen
              name="Dashboard"
              component={DashboardNavigator}
              options={{
                tabBarIcon: p =>
                  tabIcon('view-dashboard-outline', p.color, p.size),
              }}
            />
          ) : null}
          {canCopilot ? (
            <Tab.Screen
              name="Copilot"
              component={CopilotScreen}
              options={{
                tabBarIcon: p => (
                  <Text style={{fontSize: 20, color: p.color}}>✨</Text>
                ),
                tabBarLabel: 'Copilot',
                tabBarBadge: copilotBadge > 0 ? copilotBadge : undefined,
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
