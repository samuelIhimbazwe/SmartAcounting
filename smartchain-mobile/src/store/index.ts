import {configureStore} from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createTransform,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {combineReducers} from 'redux';
import authReducer, {
  authInitialState,
  type AuthState,
} from './slices/authSlice';
import posReducer from './slices/posSlice';
import networkReducer from './slices/networkSlice';
import alertReducer from './slices/alertSlice';
import tillReducer from './slices/tillSlice';
import inventoryReducer from './slices/inventorySlice';
import dashboardReducer from './slices/dashboardSlice';
import locationReducer from './slices/locationSlice';
import copilotReducer from './slices/copilotSlice';
import intelligenceReducer from './slices/intelligenceSlice';

/** Never persist passwords, OTP drafts, or MFA workflow fields to disk. */
const authPersistTransform = createTransform(
  (inbound: AuthState) => ({
    accessToken: inbound.accessToken,
    refreshToken: inbound.refreshToken,
    tenantId: inbound.tenantId,
    userId: inbound.userId,
    roles: inbound.roles,
    permissions: inbound.permissions ?? [],
    role: inbound.role,
    userName: inbound.userName,
  }),
  (outbound: Partial<AuthState>) => ({
    ...authInitialState,
    ...outbound,
  }),
);

const locationPersistTransform = createTransform(
  (inbound: {selectedLocationId?: string | null; selectedLocationName?: string | null; selectedLocationCode?: string | null}) => ({
    selectedLocationId: inbound.selectedLocationId ?? null,
    selectedLocationName: inbound.selectedLocationName ?? null,
    selectedLocationCode: inbound.selectedLocationCode ?? null,
  }),
  outbound => outbound,
);

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  transforms: [authPersistTransform],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

const locationPersistConfig = {
  key: 'location',
  storage: AsyncStorage,
  transforms: [locationPersistTransform],
};

const persistedLocationReducer = persistReducer(
  locationPersistConfig,
  locationReducer,
);

const rootReducer = combineReducers({
  auth: persistedAuthReducer,
  location: persistedLocationReducer,
  pos: posReducer,
  network: networkReducer,
  alerts: alertReducer,
  till: tillReducer,
  inventory: inventoryReducer,
  dashboard: dashboardReducer,
  copilot: copilotReducer,
  intelligence: intelligenceReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
