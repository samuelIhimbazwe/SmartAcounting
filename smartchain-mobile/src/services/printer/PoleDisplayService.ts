import {Platform} from 'react-native';
import {loadHardwareConfig} from '../../hardware/printerConfig';
import {sendEscPosOverTcp} from './NetworkPrinterService';

/** Many pole displays accept plain text over TCP (vendor-specific). */
function encodePoleLines(line1: string, line2: string): string {
  const l1 = line1.slice(0, 20).padEnd(20);
  const l2 = line2.slice(0, 20).padEnd(20);
  return `\x0C${l1}\r\n${l2}\r\n`;
}

class PoleDisplayService {
  private enabled(): boolean {
    const cfg = loadHardwareConfig();
    return cfg.poleDisplayEnabled && cfg.poleDisplayType === 'network';
  }

  async showLines(line1: string, line2 = ''): Promise<void> {
    if (!this.enabled() || Platform.OS !== 'android') {
      return;
    }
    const cfg = loadHardwareConfig();
    if (!cfg.poleDisplayHost.trim()) {
      return;
    }
    try {
      await sendEscPosOverTcp(
        cfg.poleDisplayHost.trim(),
        cfg.poleDisplayPort || 9101,
        encodePoleLines(line1, line2),
        3000,
      );
    } catch {
      /* non-fatal */
    }
  }

  async welcome(storeName: string): Promise<void> {
    await this.showLines(`Welcome to`, storeName.slice(0, 20));
  }

  async lineItem(name: string, price: string): Promise<void> {
    await this.showLines(name.slice(0, 20), price.slice(0, 20));
  }

  async total(amount: string): Promise<void> {
    await this.showLines('Total:', `${amount}  Please pay`);
  }

  async thankYou(change: string): Promise<void> {
    await this.showLines('Thank you!', `Change: ${change}`);
  }
}

export const poleDisplayService = new PoleDisplayService();
