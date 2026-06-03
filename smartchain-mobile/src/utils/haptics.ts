import {Platform, Vibration} from 'react-native';

/** Light tap feedback when adding items to cart (Android vibration; iOS no-op without native module). */
export function hapticLight() {
  if (Platform.OS === 'android') {
    Vibration.vibrate(12);
  }
}

export function hapticSuccess() {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 20, 40, 20]);
  }
}
