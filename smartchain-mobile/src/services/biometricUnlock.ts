import {Alert, Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'smartaccounting.biometric';
const ENABLED_KEY = 'biometric_unlock_enabled';

export function isBiometricUnlockEnabled(): boolean {
  const {getItem} = require('../utils/storage') as typeof import('../utils/storage');
  return getItem(ENABLED_KEY) === 'true';
}

export function setBiometricUnlockEnabled(enabled: boolean): void {
  const {setItem, removeItem} = require('../utils/storage') as typeof import('../utils/storage');
  if (enabled) {
    setItem(ENABLED_KEY, 'true');
  } else {
    removeItem(ENABLED_KEY);
  }
}

export async function offerBiometricUnlockAfterLogin(
  refreshToken: string,
  username: string,
): Promise<void> {
  const supported = await Keychain.getSupportedBiometryType();
  if (!supported) {
    return;
  }

  Alert.alert(
    'Enable biometric unlock',
    'Use Face ID / fingerprint to unlock the app on this device?',
    [
      {text: 'Not now', style: 'cancel'},
      {
        text: 'Enable',
        onPress: () => {
          void enableBiometricCredentials(refreshToken, username);
        },
      },
    ],
  );
}

export async function enableBiometricCredentials(
  refreshToken: string,
  username: string,
): Promise<void> {
  await Keychain.setGenericPassword(username, refreshToken, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  });
  setBiometricUnlockEnabled(true);
}

export async function loadRefreshTokenWithBiometric(): Promise<string | null> {
  if (!isBiometricUnlockEnabled()) {
    return null;
  }
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE,
      authenticationPrompt: {
        title: 'Unlock SmartAccounting',
        subtitle: Platform.OS === 'ios' ? 'Use Face ID' : 'Use fingerprint',
      },
    });
    if (!credentials) {
      return null;
    }
    return credentials.password;
  } catch {
    return null;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
  setBiometricUnlockEnabled(false);
}
