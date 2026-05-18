import {store} from '../store';
import {recordPush} from '../store/slices/alertSlice';

/**
 * Registers FCM listeners. Requires Firebase native setup (`google-services.json` /
 * `GoogleService-Info.plist`). No SmartAccounting REST endpoint exists yet for saving device tokens.
 */
export async function registerPushNotifications(): Promise<void> {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      return;
    }

    await messaging().getToken();

    messaging().onMessage(async (remoteMessage: {
      notification?: {title?: string; body?: string};
    }) => {
      store.dispatch(
        recordPush({
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
        }),
      );
    });

    messaging().onNotificationOpenedApp(
      (remoteMessage: {notification?: {title?: string; body?: string}}) => {
        store.dispatch(
          recordPush({
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
          }),
        );
      },
    );

  } catch (e) {
    console.warn('Push notifications unavailable:', e);
  }
}
