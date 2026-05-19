import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {Button, Menu, TextInput} from 'react-native-paper';
import type {BluetoothDevice} from 'react-native-bluetooth-classic';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {printerService} from '../../services/printer/BluetoothPrinterService';
import {networkPrinterService} from '../../services/printer/NetworkPrinterService';
import {
  loadHardwareConfig,
  saveHardwareConfig,
  newNetworkPrinterId,
  type HardwareConfig,
  type NetworkPrinterEntry,
  type PrinterRouteKind,
} from '../../hardware/printerConfig';

export function PrinterSettingsScreen() {
  const {t} = useTranslation();
  const locationId = useSelector((s: RootState) => s.location.selectedLocationId);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [netScanning, setNetScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [cfg, setCfg] = useState<HardwareConfig>(loadHardwareConfig);
  const [manualName, setManualName] = useState('');
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('9100');
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);

  useEffect(() => {
    setConnected(printerService.isConnected());
  }, []);

  const persist = (next: HardwareConfig) => {
    setCfg(next);
    saveHardwareConfig(next);
  };

  const locationPref = locationId
    ? cfg.locationPrinterPrefs[locationId]
    : undefined;
  const activeKind: PrinterRouteKind =
    locationPref?.kind ?? cfg.defaultPrinterKind;

  const setLocationRoute = (kind: PrinterRouteKind, networkPrinterId?: string) => {
    if (!locationId) {
      persist({...cfg, defaultPrinterKind: kind, defaultNetworkPrinterId: networkPrinterId});
      return;
    }
    persist({
      ...cfg,
      locationPrinterPrefs: {
        ...cfg.locationPrinterPrefs,
        [locationId]: {kind, networkPrinterId},
      },
    });
  };

  const scanBt = async () => {
    if (Platform.OS !== 'android') {
      return;
    }
    setScanning(true);
    try {
      const found = await printerService.scanForPrinters();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert(t('hardware.noBtPrintersTitle'), t('hardware.noBtPrintersBody'));
      }
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.error'));
    } finally {
      setScanning(false);
    }
  };

  const connectBt = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      await printerService.connect(device.address);
      setConnected(true);
      Alert.alert(t('hardware.connected'), device.name ?? device.address);
    } catch (e: unknown) {
      Alert.alert(t('hardware.connectFailed'), e instanceof Error ? e.message : '');
    } finally {
      setConnecting(null);
    }
  };

  const scanNetwork = async () => {
    setNetScanning(true);
    try {
      const found = await networkPrinterService.discoverPrinters();
      if (found.length === 0) {
        Alert.alert(t('hardware.noNetworkPrintersTitle'), t('hardware.noNetworkPrintersBody'));
        return;
      }
      const merged = [...cfg.networkPrinters];
      for (const p of found) {
        if (!merged.some(m => m.host === p.host && m.port === p.port)) {
          merged.push({
            id: newNetworkPrinterId(),
            name: p.name,
            host: p.host,
            port: p.port,
          });
        }
      }
      persist({...cfg, networkPrinters: merged});
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : '');
    } finally {
      setNetScanning(false);
    }
  };

  const addManualNetwork = () => {
    if (!manualHost.trim()) {
      return;
    }
    const entry: NetworkPrinterEntry = {
      id: newNetworkPrinterId(),
      name: manualName.trim() || manualHost.trim(),
      host: manualHost.trim(),
      port: parseInt(manualPort, 10) || 9100,
    };
    persist({...cfg, networkPrinters: [...cfg.networkPrinters, entry]});
    setManualName('');
    setManualHost('');
  };

  const removeNetwork = (id: string) => {
    persist({
      ...cfg,
      networkPrinters: cfg.networkPrinters.filter(p => p.id !== id),
    });
  };

  const testBt = async () => {
    try {
      await printerService.printTestPage();
      Alert.alert(t('common.success'), t('hardware.testPrintOk'));
    } catch (e: unknown) {
      Alert.alert(t('hardware.printFailed'), e instanceof Error ? e.message : '');
    }
  };

  const testNetwork = async (entry: NetworkPrinterEntry) => {
    try {
      await networkPrinterService.printTestPage(entry);
      Alert.alert(t('common.success'), t('hardware.testPrintOk'));
    } catch (e: unknown) {
      Alert.alert(t('hardware.printFailed'), e instanceof Error ? e.message : '');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{t('hardware.preferredRoute')}</Text>
      <Menu
        visible={routeMenuOpen}
        onDismiss={() => setRouteMenuOpen(false)}
        anchor={
          <Button onPress={() => setRouteMenuOpen(true)} mode="outlined">
            {t(`hardware.route.${activeKind}`)}
          </Button>
        }>
        {(['bluetooth', 'network', 'system'] as PrinterRouteKind[]).map(kind => (
          <Menu.Item
            key={kind}
            title={t(`hardware.route.${kind}`)}
            onPress={() => {
              setRouteMenuOpen(false);
              setLocationRoute(kind, cfg.networkPrinters[0]?.id);
            }}
          />
        ))}
      </Menu>

      {Platform.OS === 'android' ? (
        <>
          <Text style={styles.heading}>{t('settings.printer')} (Bluetooth)</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: connected ? '#16A34A' : '#DC2626'},
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? t('hardware.connected') : t('hardware.notConnected')}
            </Text>
          </View>
          {connected ? (
            <TouchableOpacity style={styles.testButton} onPress={() => void testBt()}>
              <Text style={styles.testButtonText}>{t('hardware.testPrint')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => void scanBt()}
            disabled={scanning}>
            {scanning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.scanButtonText}>{t('hardware.scanBt')}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>{t('hardware.btHint')}</Text>
          {devices.map(item => (
            <TouchableOpacity
              key={item.address}
              style={styles.deviceRow}
              onPress={() => void connectBt(item)}
              disabled={connecting === item.address}>
              <View>
                <Text style={styles.deviceName}>{item.name || 'Unknown'}</Text>
                <Text style={styles.deviceAddress}>{item.address}</Text>
              </View>
              {connecting === item.address ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.connectText}>{t('hardware.connect')}</Text>
              )}
            </TouchableOpacity>
          ))}

          <Text style={styles.heading}>{t('hardware.networkPrinters')}</Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => void scanNetwork()}
            disabled={netScanning}>
            {netScanning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.scanButtonText}>{t('hardware.discoverNetwork')}</Text>
            )}
          </TouchableOpacity>
          <TextInput
            label={t('hardware.printerName')}
            value={manualName}
            onChangeText={setManualName}
            style={styles.field}
          />
          <TextInput
            label={t('hardware.printerHost')}
            value={manualHost}
            onChangeText={setManualHost}
            autoCapitalize="none"
            style={styles.field}
          />
          <TextInput
            label={t('hardware.printerPort')}
            value={manualPort}
            onChangeText={setManualPort}
            keyboardType="number-pad"
            style={styles.field}
          />
          <Button mode="contained" onPress={addManualNetwork}>
            {t('hardware.addNetworkPrinter')}
          </Button>
          {cfg.networkPrinters.map(entry => (
            <View key={entry.id} style={styles.deviceRow}>
              <View style={{flex: 1}}>
                <Text style={styles.deviceName}>{entry.name}</Text>
                <Text style={styles.deviceAddress}>
                  {entry.host}:{entry.port}
                </Text>
              </View>
              <TouchableOpacity onPress={() => void testNetwork(entry)}>
                <Text style={styles.connectText}>{t('hardware.testPrint')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeNetwork(entry.id)}>
                <Text style={styles.removeText}>{t('common.remove')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.hint}>{t('hardware.iosPrinterHint')}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC', padding: 16},
  heading: {fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8},
  statusRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  statusDot: {width: 12, height: 12, borderRadius: 6, marginRight: 8},
  statusText: {fontSize: 16, fontWeight: '600', color: '#0F172A'},
  testButton: {
    backgroundColor: '#1B6FDB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {color: '#FFFFFF', fontWeight: '600', fontSize: 15},
  scanButton: {
    backgroundColor: '#475569',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  scanButtonText: {color: '#FFFFFF', fontWeight: '600', fontSize: 15},
  hint: {color: '#94A3B8', fontSize: 13, marginBottom: 16, textAlign: 'center'},
  field: {marginVertical: 4},
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  deviceName: {fontSize: 15, fontWeight: '600', color: '#0F172A'},
  deviceAddress: {fontSize: 12, color: '#94A3B8', marginTop: 2},
  connectText: {color: '#1B6FDB', fontWeight: '600', fontSize: 14},
  removeText: {color: '#DC2626', fontWeight: '600', fontSize: 14},
});
