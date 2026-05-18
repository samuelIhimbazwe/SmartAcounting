import {MMKV} from 'react-native-mmkv';

const mmkv = new MMKV({id: 'smartchain-secure-store'});

export function getItem(key: string): string | undefined {
  return mmkv.getString(key);
}

export function setItem(key: string, value: string): void {
  mmkv.set(key, value);
}

export function removeItem(key: string): void {
  mmkv.delete(key);
}
