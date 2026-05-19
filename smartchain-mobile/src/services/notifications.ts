import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Toast from 'react-native-toast-message';
import {apiClient} from '../api/client';
import {navigateFromPushRoute} from '../navigation/pushNavigation';
import type {AppRole} from '../utils/roles';

export async function registerPushNotifications(): Promise<void> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Push notification permission denied');
      return;
    }

    const token = await messaging().getToken();
    const appVersion = DeviceInfo.getVersion();

    await apiClient.post('/notifications/push-token', {
      token,
      platform: Platform.OS.toUpperCase(),
      appVersion,
    });

    messaging().onMessage(async remoteMessage => {
      showInAppNotification(
        remoteMessage.notification?.title || '',
        remoteMessage.notification?.body || '',
        remoteMessage.data?.route as string | undefined,
      );
    });

    messaging().onNotificationOpenedApp(remoteMessage => {
      const route = remoteMessage.data?.route;
      if (route && typeof route === 'string') {
        navigateFromPushRoute(route, pushRoles());
      }
    });

    const initial = await messaging().getInitialNotification();
    if (initial?.data?.route && typeof initial.data.route === 'string') {
      navigateFromPushRoute(initial.data.route, pushRoles());
    }
  } catch (e) {
    console.warn('Push notifications unavailable:', e);
  }
}

function showInAppNotification(
  title: string,
  body: string,
  route?: string,
): void {
  Toast.show({
    type: 'info',
    text1: title,
    text2: body,
    onPress: () => {
      if (route) {
        navigateFromPushRoute(route, pushRoles());
      }
    },
    visibilityTime: 5000,
  });
}

function pushRoles(): AppRole[] {
  const {store} = require('../store') as typeof import('../store');
  return store.getState().auth.roles as AppRole[];
}
