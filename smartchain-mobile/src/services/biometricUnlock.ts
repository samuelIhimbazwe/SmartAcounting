import {Alert, Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';
import i18n from '../i18n';
import {getItem, setItem, removeItem} from '../utils/storage';

const SERVICE = 'smartaccounting.biometric';
const ENABLED_KEY = 'biometric_unlock_enabled';
const OFFER_SHOWN_KEY = 'biometric_offer_shown';

export function isBiometricUnlockEnabled(): boolean {
  return getItem(ENABLED_KEY) === 'true';
}

export function setBiometricUnlockEnabled(enabled: boolean): void {
  if (enabled) {
    setItem(ENABLED_KEY, 'true');
  } else {
    removeItem(ENABLED_KEY);
  }
}

export function wasBiometricOfferShown(): boolean {
  return getItem(OFFER_SHOWN_KEY) === 'true';
}

export function markBiometricOfferShown(): void {
  setItem(OFFER_SHOWN_KEY, 'true');
}

export function shouldOfferBiometricUnlock(): boolean {
  return !isBiometricUnlockEnabled() && !wasBiometricOfferShown();
}

export async function offerBiometricUnlockAfterLogin(
  refreshToken: string,
  username: string,
): Promise<void> {
  const supported = await Keychain.getSupportedBiometryType();
  if (!supported) {
    markBiometricOfferShown();
    return;
  }

  markBiometricOfferShown();

  Alert.alert(
    i18n.t('auth.biometricEnableTitle'),
    i18n.t('auth.biometricEnableMessage'),
    [
      {text: i18n.t('common.notNow'), style: 'cancel'},
      {
        text: i18n.t('common.enable'),
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
        title: i18n.t('auth.biometricPrompt'),
        subtitle:
          Platform.OS === 'ios'
            ? i18n.t('auth.biometricFaceId')
            : i18n.t('auth.biometricFingerprint'),
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
