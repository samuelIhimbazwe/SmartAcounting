import {store} from '../store';

/** Inventory API `location` query param = backend `location_code` (e.g. SHOP). */
export function getSyncLocationCode(): string {
  const code = store.getState().location?.selectedLocationCode?.trim();
  return code && code.length > 0 ? code : 'SHOP';
}
