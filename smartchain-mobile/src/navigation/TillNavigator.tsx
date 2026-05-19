import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TillOpenScreen from '../screens/till/TillOpenScreen';
import TillCloseScreen from '../screens/till/TillCloseScreen';
import ShiftManagementScreen from '../screens/till/ShiftManagementScreen';
import FloorViewScreen from '../screens/till/FloorViewScreen';

export type TillStackParamList = {
  TillOpen: undefined;
  TillClose: undefined;
  Shifts: undefined;
  FloorView: undefined;
};

const Stack = createNativeStackNavigator<TillStackParamList>();

export default function TillNavigator() {
  return (
    <Stack.Navigator initialRouteName="TillOpen">
      <Stack.Screen
        name="TillOpen"
        component={TillOpenScreen}
        options={{title: 'Till'}}
      />
      <Stack.Screen
        name="TillClose"
        component={TillCloseScreen}
        options={{title: 'Close till'}}
      />
      <Stack.Screen
        name="Shifts"
        component={ShiftManagementScreen}
        options={{title: 'Shifts'}}
      />
      <Stack.Screen
        name="FloorView"
        component={FloorViewScreen}
        options={{title: 'Floor view'}}
      />
    </Stack.Navigator>
  );
}
