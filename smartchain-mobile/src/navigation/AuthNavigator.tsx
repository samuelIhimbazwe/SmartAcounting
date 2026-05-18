import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import MfaScreen from '../screens/auth/MfaScreen';

export type AuthStackParamList = {
  Login: undefined;
  Mfa: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Sign in'}} />
      <Stack.Screen name="Mfa" component={MfaScreen} options={{title: 'Verify identity'}} />
    </Stack.Navigator>
  );
}
