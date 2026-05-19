import {getItem, setItem} from '../utils/storage';

export type SyncProgressState = {
  active: boolean;
  processed: number;
  total: number;
};

const KEY = 'catalog_sync_progress_v1';

export function getSyncProgress(): SyncProgressState | null {
  try {
    const raw = getItem(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SyncProgressState;
  } catch {
    return null;
  }
}

export function setSyncProgress(state: SyncProgressState | null): void {
  if (!state) {
    setItem(KEY, '');
    return;
  }
  setItem(KEY, JSON.stringify(state));
}
