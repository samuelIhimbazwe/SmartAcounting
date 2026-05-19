import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {navigationRef} from './navigationRef';
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
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);
  const userName = useSelector((state: RootState) => state.auth.userName);
  const tenantId = useSelector((state: RootState) => state.auth.tenantId);
  const role = useSelector((state: RootState) => state.auth.role);
  const biometricOffered = useRef(false);

  useEffect(() => {
    if (token && refreshToken && userName && !biometricOffered.current) {
      const {
        isBiometricUnlockEnabled,
        offerBiometricUnlockAfterLogin,
      } = require('../services/biometricUnlock') as typeof import('../services/biometricUnlock');
      if (!isBiometricUnlockEnabled()) {
        biometricOffered.current = true;
        void offerBiometricUnlockAfterLogin(refreshToken, userName);
      }
    }
  }, [token, refreshToken, userName]);

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
    <NavigationContainer ref={navigationRef}>
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
