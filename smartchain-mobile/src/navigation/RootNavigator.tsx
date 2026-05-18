import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import {registerPushNotifications} from '../services/notifications';
import {startSseListener, stopSseListener} from '../services/sseListener';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const tenantId = useSelector((state: RootState) => state.auth.tenantId);
  const role = useSelector((state: RootState) => state.auth.role);

  useEffect(() => {
    if (token) {
      void registerPushNotifications();
    }
  }, [token]);

  // Real-time alert stream lifecycle: start on login, stop on logout.
  useEffect(() => {
    if (token && tenantId && role) {
      startSseListener(token, tenantId, role);
      return () => stopSseListener();
    }
    stopSseListener();
    return undefined;
  }, [token, tenantId, role]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {token ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
