import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {SettingsHomeScreen} from '../screens/settings/SettingsHomeScreen';
import {LanguageSettingsScreen} from '../screens/settings/LanguageSettingsScreen';
import {PrinterSettingsScreen} from '../screens/settings/PrinterSettingsScreen';
import {LocationSettingsScreen} from '../screens/settings/LocationSettingsScreen';
import AuditLogScreen from '../screens/audit/AuditLogScreen';
import {PosHardwareSettingsScreen} from '../screens/settings/PosHardwareSettingsScreen';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  LanguageSettings: undefined;
  PrinterSettings: undefined;
  PosHardware: undefined;
  LocationSettings: undefined;
  AuditLog: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsHomeScreen}
        options={{title: t('settings.title')}}
      />
      <Stack.Screen
        name="LanguageSettings"
        component={LanguageSettingsScreen}
        options={{title: t('settings.language')}}
      />
      <Stack.Screen
        name="PrinterSettings"
        component={PrinterSettingsScreen}
        options={{title: t('settings.printer')}}
      />
      <Stack.Screen
        name="PosHardware"
        component={PosHardwareSettingsScreen}
        options={{title: t('hardware.posTitle')}}
      />
      <Stack.Screen
        name="LocationSettings"
        component={LocationSettingsScreen}
        options={{title: t('locations.switchLocation')}}
      />
      <Stack.Screen
        name="AuditLog"
        component={AuditLogScreen}
        options={{title: t('audit.title')}}
      />
    </Stack.Navigator>
  );
}
