import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {apiClient} from '../../api/client';
import {fetchTillExpected} from '../../api/retail';
import {printerService} from '../../services/printer/BluetoothPrinterService';
import {
  setTillBusinessDate,
  setTillExpectedSnapshot,
  setTillRegisterCode,
} from '../../store/slices/tillSlice';
import {setShiftContext} from '../../store/slices/posSlice';
import type {TillStackParamList} from '../../navigation/TillNavigator';
import axios from 'axios';

type Nav = NativeStackNavigationProp<TillStackParamList, 'TillOpen'>;

export default function TillOpenScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const [tillCode, setTillCode] = useState('REG-01');
  const [floatAmount, setFloatAmount] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [printerConnected, setPrinterConnected] = useState(
    printerService.isConnected(),
  );
  const [opening, setOpening] = useState(false);

  const {userId, userName} = useSelector((s: RootState) => s.auth);

  const openTill = async () => {
    if (!floatAmount || Number.isNaN(Number(floatAmount))) {
      Alert.alert('Error', 'Please enter the opening float amount');
      return;
    }

    setOpening(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const expected = await fetchTillExpected(today, tillCode);
      dispatch(setTillBusinessDate(today));
      dispatch(setTillRegisterCode(tillCode));
      dispatch(setTillExpectedSnapshot(expected));

      const shiftStartTime = new Date().toISOString();
      const name = cashierName.trim() || userName || 'Cashier';

      if (userId) {
        try {
          await apiClient.post('/hr/attendance', {
            employeeId: userId,
            attendanceDate: today,
            status: 'PRESENT',
            notes: `Shift start till ${tillCode}`,
          });
        } catch (attErr) {
          if (!axios.isAxiosError(attErr) || attErr.response?.status !== 403) {
            console.warn('Attendance record skipped:', attErr);
          }
        }
      }

      dispatch(
        setShiftContext({
          posRegisterCode: tillCode,
          openingFloat: Number(floatAmount),
          shiftStartTime,
          cashierName: name,
        }),
      );

      navigation.getParent()?.navigate('POS', {screen: 'Checkout'});
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data
          ? String(
              (error.response.data as {message?: string}).message ??
                error.message,
            )
          : error instanceof Error
            ? error.message
            : 'Could not open till';
      Alert.alert('Error', message);
    } finally {
      setOpening(false);
    }
  };

  const connectPrinter = () => {
    navigation.getParent()?.navigate('Settings', {screen: 'PrinterSettings'});
    setTimeout(() => setPrinterConnected(printerService.isConnected()), 500);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Start Shift</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString('en-RW', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Receipt Printer</Text>
        <View style={styles.printerRow}>
          <View
            style={[
              styles.dot,
              {backgroundColor: printerConnected ? '#16A34A' : '#DC2626'},
            ]}
          />
          <Text style={styles.printerStatus}>
            {printerConnected ? 'Connected' : 'Not connected'}
          </Text>
          {!printerConnected ? (
            <TouchableOpacity style={styles.connectBtn} onPress={connectPrinter}>
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Till / Register</Text>
        <TextInput
          style={styles.input}
          value={tillCode}
          onChangeText={setTillCode}
          placeholder="REG-01"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Opening Float (FRW)</Text>
        <TextInput
          style={styles.input}
          value={floatAmount}
          onChangeText={setFloatAmount}
          placeholder="e.g. 50000"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>
          Count the cash in the till and enter the total
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={cashierName}
          onChangeText={setCashierName}
          placeholder={userName || 'Enter your name'}
        />
      </View>

      <View style={styles.checklist}>
        <Text style={styles.checklistTitle}>Before you start:</Text>
        <Text style={styles.checklistItem}>✓ Cash float counted and confirmed</Text>
        <Text style={styles.checklistItem}>
          ✓ Receipt printer is on and connected
        </Text>
        <Text style={styles.checklistItem}>✓ Barcode scanner is working</Text>
        <Text style={styles.checklistItem}>✓ Internet connection is active</Text>
      </View>

      <TouchableOpacity
        style={[styles.openButton, opening && styles.openButtonDisabled]}
        onPress={() => void openTill()}
        disabled={opening}>
        <Text style={styles.openButtonText}>
          {opening ? 'Opening...' : 'Open Till & Start Shift'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC', padding: 20},
  title: {fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 4},
  subtitle: {fontSize: 15, color: '#64748B', marginBottom: 24},
  section: {marginBottom: 20},
  label: {fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8},
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  hint: {fontSize: 12, color: '#94A3B8', marginTop: 4},
  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dot: {width: 10, height: 10, borderRadius: 5, marginRight: 8},
  printerStatus: {flex: 1, fontSize: 15, color: '#0F172A'},
  connectBtn: {backgroundColor: '#1B6FDB', padding: 8, borderRadius: 6},
  connectBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  checklist: {
    backgroundColor: '#DCFCE7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  checklistTitle: {fontSize: 14, fontWeight: '600', color: '#15803D', marginBottom: 8},
  checklistItem: {fontSize: 14, color: '#166534', marginBottom: 4},
  openButton: {
    backgroundColor: '#16A34A',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  openButtonDisabled: {backgroundColor: '#86EFAC'},
  openButtonText: {color: '#FFFFFF', fontSize: 18, fontWeight: '700'},
});
