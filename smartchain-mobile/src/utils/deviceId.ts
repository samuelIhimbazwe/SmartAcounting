import {v4 as uuidv4} from 'uuid';
import {getItem, setItem} from './storage';

const KEY = 'sync_device_id';

export function getDeviceId(): string {
  let id = getItem(KEY);
  if (!id) {
    id = uuidv4();
    setItem(KEY, id);
  }
  return id;
}
