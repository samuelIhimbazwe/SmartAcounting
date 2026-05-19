import {getItem, setItem} from '../utils/storage';

export type PrinterRouteKind = 'bluetooth' | 'network' | 'system';

export interface NetworkPrinterEntry {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface LocationPrinterPref {
  kind: PrinterRouteKind;
  networkPrinterId?: string;
}

export interface HardwareConfig {
  networkPrinters: NetworkPrinterEntry[];
  /** Global default when no per-location override. */
  defaultPrinterKind: PrinterRouteKind;
  defaultNetworkPrinterId?: string;
  locationPrinterPrefs: Record<string, LocationPrinterPref>;
  cashDrawerEnabled: boolean;
  pluPrefixDigit: string;
  pluValueMode: 'weight' | 'price';
  scannerModeEnabled: boolean;
  poleDisplayEnabled: boolean;
  poleDisplayType: 'none' | 'network';
  poleDisplayHost: string;
  poleDisplayPort: number;
  storeDisplayName: string;
}

const STORAGE_KEY = 'hardware_config_v1';

export const DEFAULT_HARDWARE_CONFIG: HardwareConfig = {
  networkPrinters: [],
  defaultPrinterKind: 'bluetooth',
  locationPrinterPrefs: {},
  cashDrawerEnabled: true,
  pluPrefixDigit: '2',
  pluValueMode: 'weight',
  scannerModeEnabled: false,
  poleDisplayEnabled: false,
  poleDisplayType: 'none',
  poleDisplayHost: '',
  poleDisplayPort: 9101,
  storeDisplayName: 'SmartAccounting',
};

export function loadHardwareConfig(): HardwareConfig {
  const raw = getItem(STORAGE_KEY);
  if (!raw) {
    return {...DEFAULT_HARDWARE_CONFIG};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<HardwareConfig>;
    return {...DEFAULT_HARDWARE_CONFIG, ...parsed};
  } catch {
    return {...DEFAULT_HARDWARE_CONFIG};
  }
}

export function saveHardwareConfig(config: HardwareConfig): void {
  setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getPrinterRouteForLocation(
  config: HardwareConfig,
  locationId: string | null | undefined,
): {kind: PrinterRouteKind; networkPrinterId?: string} {
  if (locationId && config.locationPrinterPrefs[locationId]) {
    const pref = config.locationPrinterPrefs[locationId];
    return {kind: pref.kind, networkPrinterId: pref.networkPrinterId};
  }
  return {
    kind: config.defaultPrinterKind,
    networkPrinterId: config.defaultNetworkPrinterId,
  };
}

export function resolveNetworkPrinter(
  config: HardwareConfig,
  networkPrinterId?: string,
): NetworkPrinterEntry | null {
  const id = networkPrinterId ?? config.defaultNetworkPrinterId;
  if (!id) {
    return config.networkPrinters[0] ?? null;
  }
  return config.networkPrinters.find(p => p.id === id) ?? null;
}

export function newNetworkPrinterId(): string {
  return `net-${Date.now()}`;
}
