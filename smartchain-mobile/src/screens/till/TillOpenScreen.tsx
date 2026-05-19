import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {apiClient, isApiError} from '../../api/client';
import {fetchTillExpected} from '../../api/retail';
import {
  getCurrentTillSession,
  openTillSession,
  suspendTillSession,
} from '../../api/tillSessions';
import {fetchRegisters, type RegisterDto} from '../../api/locations';
import {
  canManageTillSession,
  canOpenCashDrawer,
  canPrintXReport,
} from '../../utils/roles';
import {openCashDrawer} from '../../services/printing';
import {recordFiscalAudit} from '../../fiscal/auditLogRepository';
import type {AppRole} from '../../utils/roles';
import {clearTillSession} from '../../store/slices/tillSlice';
import {useTranslation} from 'react-i18next';
import {printerService} from '../../services/printer/BluetoothPrinterService';
import {
  setCurrentSessionId,
  setTillBusinessDate,
  setTillExpectedSnapshot,
  setTillRegisterCode,
  setRegisterId,
} from '../../store/slices/tillSlice';
import {setShiftContext} from '../../store/slices/posSlice';
import type {TillStackParamList} from '../../navigation/TillNavigator';
import {testIds} from '../../e2e/testIds';

type Nav = NativeStackNavigationProp<TillStackParamList, 'TillOpen'>;

export default function TillOpenScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const [tillCode, setTillCode] = useState('REG-01');
  const [registers, setRegisters] = useState<RegisterDto[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
  const locationId = useSelector((s: RootState) => s.location.selectedLocationId);
  const locationName = useSelector((s: RootState) => s.location.selectedLocationName);
  const [floatAmount, setFloatAmount] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [printerConnected, setPrinterConnected] = useState(
    printerService.isConnected(),
  );
  const [opening, setOpening] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const {userId, userName, roles} = useSelector((s: RootState) => s.auth);
  const currentSessionId = useSelector((s: RootState) => s.till.currentSessionId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const {t} = useTranslation();
  const appRoles = roles as AppRole[];
  const canSuspend = canManageTillSession(appRoles);
  const showXReport = canPrintXReport(appRoles);
  const showOpenDrawer = canOpenCashDrawer(appRoles);

  const openDrawerManual = async () => {
    try {
      await openCashDrawer(locationId);
      if (activeSessionId) {
        await recordFiscalAudit({
          entityType: 'TILL',
          entityId: activeSessionId,
          action: 'CASH_DRAWER_OPEN',
          actorId: userId ?? 'unknown',
        });
      }
      Alert.alert(t('hardware.openDrawer'), t('hardware.drawerOpened'));
    } catch (e: unknown) {
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('hardware.printFailed'),
      );
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const session = await getCurrentTillSession();
        dispatch(setCurrentSessionId(session.id));
        dispatch(setTillRegisterCode(session.posRegisterCode));
        dispatch(
          setShiftContext({
            posRegisterCode: session.posRegisterCode,
            openingFloat: Number(session.openingFloat),
            shiftStartTime: session.openedAt,
            cashierName: userName || 'Cashier',
          }),
        );
        setActiveSessionId(session.id);
      } catch {
        /* no open session — show open flow */
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [dispatch, userName]);

  useEffect(() => {
    if (!locationId) {
      return;
    }
    void fetchRegisters(locationId).then(regs => {
      setRegisters(regs);
      if (regs.length === 1) {
        setSelectedRegisterId(regs[0].id);
        setTillCode(regs[0].name);
        dispatch(setRegisterId(regs[0].id));
        dispatch(setTillRegisterCode(regs[0].name));
      }
    });
  }, [locationId, dispatch]);

  const goToPos = (
    registerCode: string,
    float: number,
    sessionId: string,
    shiftStartTime: string,
    name: string,
  ) => {
    dispatch(setCurrentSessionId(sessionId));
    dispatch(
      setShiftContext({
        posRegisterCode: registerCode,
        openingFloat: float,
        shiftStartTime,
        cashierName: name,
      }),
    );
    navigation.getParent()?.navigate('POS', {screen: 'Checkout'});
  };

  const openTill = async () => {
    if (!floatAmount || Number.isNaN(Number(floatAmount))) {
      Alert.alert(t('common.error'), t('till.floatRequired'));
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
          if (!isApiError(attErr) || attErr.status !== 403) {
            console.warn('Attendance record skipped:', attErr);
          }
        }
      }

      const session = await openTillSession({
        posRegisterCode: tillCode,
        openingFloat: Number(floatAmount),
        registerId: selectedRegisterId ?? undefined,
        locationId: locationId ?? undefined,
      });

      goToPos(tillCode, Number(floatAmount), session.id, shiftStartTime, name);
    } catch (error: unknown) {
      const message = isApiError(error)
        ? String((error.body as {message?: string})?.message ?? error.message)
        : error instanceof Error
          ? error.message
          : t('till.openFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setOpening(false);
    }
  };

  const connectPrinter = () => {
    navigation.getParent()?.navigate('Settings', {screen: 'PrinterSettings'});
    setTimeout(() => setPrinterConnected(printerService.isConnected()), 500);
  };

  const suspendSession = async () => {
    const sid = currentSessionId || activeSessionId;
    if (!sid) {
      return;
    }
    setSuspending(true);
    try {
      await suspendTillSession(sid);
      dispatch(clearTillSession());
      setActiveSessionId(null);
      Alert.alert(t('common.success'), t('till.suspended'));
    } catch (error: unknown) {
      const message = isApiError(error)
        ? String((error.body as {message?: string})?.message ?? error.message)
        : t('till.suspendFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setSuspending(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1B6FDB" />
        <Text style={styles.loadingText}>{t('till.checkingSession')}</Text>
      </View>
    );
  }

  if (activeSessionId) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{t('till.openTitle')}</Text>
        <Text style={styles.subtitle}>{t('till.sessionOpen')}</Text>
        <TouchableOpacity
          testID={testIds.tillContinuePos}
          style={styles.openButton}
          onPress={() =>
            navigation.getParent()?.navigate('POS', {screen: 'Checkout'})
          }>
          <Text style={styles.openButtonText}>{t('till.continueToPos')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={testIds.tillCloseNav}
          style={styles.linkButton}
          onPress={() => navigation.navigate('TillClose')}>
          <Text style={styles.linkButtonText}>{t('till.closeTitle')}</Text>
        </TouchableOpacity>
        {showXReport ? (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() =>
              navigation.navigate('FiscalReport', {
                tillSessionId: activeSessionId,
                reportType: 'X',
              })
            }>
            <Text style={styles.linkButtonText}>{t('fiscal.printXReport')}</Text>
          </TouchableOpacity>
        ) : null}
        {showOpenDrawer ? (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => void openDrawerManual()}>
            <Text style={styles.linkButtonText}>{t('hardware.openDrawer')}</Text>
          </TouchableOpacity>
        ) : null}
        {canSuspend ? (
          <TouchableOpacity
            style={[styles.suspendButton, suspending && styles.openButtonDisabled]}
            onPress={() => void suspendSession()}
            disabled={suspending}>
            <Text style={styles.suspendButtonText}>{t('till.suspend')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('till.openTitle')}</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString('en-RW', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>
      {locationName ? (
        <Text style={styles.subtitle}>{locationName}</Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>{t('till.printerLabel')}</Text>
        <View style={styles.printerRow}>
          <View
            style={[
              styles.dot,
              {backgroundColor: printerConnected ? '#16A34A' : '#DC2626'},
            ]}
          />
          <Text style={styles.printerStatus}>
            {printerConnected
              ? t('till.printerConnected')
              : t('till.printerNotConnected')}
          </Text>
          {!printerConnected ? (
            <TouchableOpacity style={styles.connectBtn} onPress={connectPrinter}>
              <Text style={styles.connectBtnText}>
                {t('till.connectPrinter')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('locations.selectRegister')}</Text>
        {registers.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[
              styles.registerChip,
              selectedRegisterId === r.id && styles.registerChipActive,
            ]}
            onPress={() => {
              setSelectedRegisterId(r.id);
              setTillCode(r.name);
              dispatch(setRegisterId(r.id));
              dispatch(setTillRegisterCode(r.name));
            }}>
            <Text>{r.name}</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.input}
          value={tillCode}
          onChangeText={setTillCode}
          placeholder={t('till.registerPlaceholder')}
        />
      </View>
      {canSuspend ? (
        <TouchableOpacity
          style={styles.connectBtn}
          onPress={() => navigation.navigate('FloorView')}>
          <Text style={styles.connectBtnText}>{t('locations.floorView')}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>{t('till.openingFloat')}</Text>
        <TextInput
          testID={testIds.tillOpenFloat}
          style={styles.input}
          value={floatAmount}
          onChangeText={setFloatAmount}
          placeholder={t('till.floatPlaceholder')}
          keyboardType="numeric"
          accessibilityLabel={t('till.openingFloat')}
        />
        <Text style={styles.hint}>{t('till.floatHint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('till.cashierName')}</Text>
        <TextInput
          style={styles.input}
          value={cashierName}
          onChangeText={setCashierName}
          placeholder={userName || t('till.cashierPlaceholder')}
        />
      </View>

      <View style={styles.checklist}>
        <Text style={styles.checklistTitle}>{t('till.checklistTitle')}</Text>
        <Text style={styles.checklistItem}>✓ {t('till.checklistFloat')}</Text>
        <Text style={styles.checklistItem}>✓ {t('till.checklistPrinter')}</Text>
        <Text style={styles.checklistItem}>✓ {t('till.checklistScanner')}</Text>
        <Text style={styles.checklistItem}>✓ {t('till.checklistInternet')}</Text>
      </View>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Shifts')}>
        <Text style={styles.linkButtonText}>{t('till.viewShifts')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID={testIds.tillOpenSubmit}
        style={[styles.openButton, opening && styles.openButtonDisabled]}
        onPress={() => void openTill()}
        disabled={opening}
        accessibilityLabel={t('till.openButton')}>
        <Text style={styles.openButtonText}>
          {opening ? t('till.opening') : t('till.openButton')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC', padding: 20},
  loading: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  loadingText: {fontSize: 15, color: '#64748B'},
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
  linkButton: {alignItems: 'center', marginBottom: 12},
  linkButtonText: {color: '#1B6FDB', fontWeight: '600', fontSize: 15},
  suspendButton: {
    backgroundColor: '#D97706',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  suspendButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  registerChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  registerChipActive: {borderColor: '#1B6FDB', backgroundColor: '#EFF6FF'},
});
