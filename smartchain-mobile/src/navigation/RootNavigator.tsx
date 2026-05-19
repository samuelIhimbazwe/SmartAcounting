import React, {useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {navigationRef} from './navigationRef';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../store';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LocationPickerScreen from '../screens/location/LocationPickerScreen';
import {fetchLocations} from '../api/locations';
import {
  selectLocation,
  setAccessibleLocations,
} from '../store/slices/locationSlice';
import {registerPushNotifications} from '../services/notifications';
import {startSseListener, stopSseListener} from '../services/sseListener';
import {
  offerBiometricUnlockAfterLogin,
  shouldOfferBiometricUnlock,
} from '../services/biometricUnlock';
import {runInventorySync} from '../inventory/inventorySync';
import {refreshReorderAlerts} from '../inventory/reorderCheck';
import {startReorderSuggestionsWatcher} from '../services/reorderSuggestionsSync';
import {rebuildProductSearchIndex} from '../services/productSearchIndex';
import {downloadProductModelIfNeeded} from '../services/productRecognition';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);
  const userName = useSelector((state: RootState) => state.auth.userName);
  const tenantId = useSelector((state: RootState) => state.auth.tenantId);
  const role = useSelector((state: RootState) => state.auth.role);
  const selectedLocationId = useSelector(
    (s: RootState) => s.location.selectedLocationId,
  );
  const locationPickerRequired = useSelector(
    (s: RootState) => s.location.locationPickerRequired,
  );
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setLocationReady(false);
      return;
    }
    void (async () => {
      try {
        const remote = await fetchLocations();
        const mapped = remote.map(l => ({
          id: l.id,
          name: l.name,
          locationCode: l.locationCode,
          currencyDefault: l.currencyDefault,
        }));
        dispatch(setAccessibleLocations(mapped));
        if (mapped.length === 1 && !selectedLocationId) {
          dispatch(selectLocation(mapped[0]));
        }
      } catch {
        /* offline: use persisted selection */
      } finally {
        setLocationReady(true);
      }
    })();
  }, [token, dispatch, selectedLocationId]);

  const needsLocationPicker =
    token &&
    locationReady &&
    !selectedLocationId &&
    locationPickerRequired;
  useEffect(() => {
    if (token && refreshToken && userName && shouldOfferBiometricUnlock()) {
      void offerBiometricUnlockAfterLogin(refreshToken, userName);
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

  const selectedLocationCode = useSelector(
    (s: RootState) => s.location.selectedLocationCode,
  );

  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!token || !selectedLocationCode) {
      return undefined;
    }
    const stopReorder = startReorderSuggestionsWatcher();
    void runInventorySync()
      .then(() => rebuildProductSearchIndex())
      .then(() => refreshReorderAlerts());
    void downloadProductModelIfNeeded();
    const sub = AppState.addEventListener('change', next => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        void runInventorySync()
          .then(() => rebuildProductSearchIndex())
          .then(() => refreshReorderAlerts());
      }
      appState.current = next;
    });
    return () => {
      stopReorder();
      sub.remove();
    };
  }, [token, selectedLocationCode]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {token ? (
          needsLocationPicker ? (
            <Stack.Screen name="LocationPicker">
              {() => (
                <LocationPickerScreen onDone={() => setLocationReady(true)} />
              )}
            </Stack.Screen>
          ) : locationReady ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : null
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
