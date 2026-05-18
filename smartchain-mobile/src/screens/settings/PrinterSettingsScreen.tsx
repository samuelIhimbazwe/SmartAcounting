import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import type {BluetoothDevice} from 'react-native-bluetooth-classic';
import {printerService} from '../../services/printer/BluetoothPrinterService';

export function PrinterSettingsScreen() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(printerService.isConnected());
  }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const found = await printerService.scanForPrinters();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert(
          'No printers found',
          'Make sure your printer is on and paired in Android Bluetooth settings first.',
        );
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const connect = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      await printerService.connect(device.address);
      setConnected(true);
      Alert.alert(
        'Connected',
        `Connected to ${device.name}. Print a test page to confirm.`,
      );
    } catch (e: unknown) {
      Alert.alert(
        'Connection Failed',
        e instanceof Error ? e.message : 'Connection failed',
      );
    } finally {
      setConnecting(null);
    }
  };

  const testPrint = async () => {
    try {
      await printerService.printTestPage();
      Alert.alert('Success', 'Test page printed successfully');
    } catch (e: unknown) {
      Alert.alert(
        'Print Failed',
        e instanceof Error ? e.message : 'Print failed',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {backgroundColor: connected ? '#16A34A' : '#DC2626'},
          ]}
        />
        <Text style={styles.statusText}>
          {connected ? 'Printer connected' : 'No printer connected'}
        </Text>
      </View>

      {connected ? (
        <TouchableOpacity style={styles.testButton} onPress={testPrint}>
          <Text style={styles.testButtonText}>Print test page</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={scan}
        disabled={scanning}>
        {scanning ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.scanButtonText}>Scan for printers</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Pair your printer in Android Bluetooth settings before scanning here.
      </Text>

      <FlatList
        data={devices}
        keyExtractor={d => d.address}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => connect(item)}
            disabled={connecting === item.address}>
            <View>
              <Text style={styles.deviceName}>
                {item.name || 'Unknown Device'}
              </Text>
              <Text style={styles.deviceAddress}>{item.address}</Text>
            </View>
            {connecting === item.address ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.connectText}>Connect</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC', padding: 16},
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
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  deviceName: {fontSize: 15, fontWeight: '600', color: '#0F172A'},
  deviceAddress: {fontSize: 12, color: '#94A3B8', marginTop: 2},
  connectText: {color: '#1B6FDB', fontWeight: '600', fontSize: 14},
});
