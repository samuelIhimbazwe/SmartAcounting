import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PrinterSettingsScreen} from '../screens/settings/PrinterSettingsScreen';

const Stack = createNativeStackNavigator();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PrinterSettings"
        component={PrinterSettingsScreen}
        options={{title: 'Receipt printer'}}
      />
    </Stack.Navigator>
  );
}
