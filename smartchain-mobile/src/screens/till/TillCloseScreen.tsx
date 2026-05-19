import React from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  clearTillSession,
  resetTillForm,
  setTillCounts,
  setTillNotes,
} from '../../store/slices/tillSlice';
import {postTillClose} from '../../api/retail';
import {closeTillSession} from '../../api/tillSessions';
import {queueOfflineTillClose} from '../../services/offlineQueue';
import {isApiError} from '../../api/client';

export default function TillCloseScreen() {
  const {t} = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const till = useSelector((s: RootState) => s.till);
  const online = useSelector((s: RootState) => s.network.online);

  const submit = async () => {
    const sessionId = till.currentSessionId;
    if (!sessionId) {
      Toast.show({type: 'error', text1: t('till.noSession')});
      return;
    }

    const closingCash = Number(till.countedCash);
    if (Number.isNaN(closingCash)) {
      Toast.show({type: 'error', text1: t('common.error')});
      return;
    }

    const retailBody = {
      businessDate: till.businessDate,
      posRegisterCode: till.posRegisterCode,
      countedCash: closingCash,
      countedMomo: Number(till.countedMomo) || 0,
      countedAirtel: Number(till.countedAirtel) || 0,
      countedCard: Number(till.countedCard) || 0,
      countedOnAccount: Number(till.countedOnAccount) || 0,
      notes: till.notes?.trim() || null,
    };

    try {
      if (online) {
        await closeTillSession(sessionId, {
          closingCash,
          notes: till.notes?.trim() || undefined,
        });
        try {
          await postTillClose(retailBody);
        } catch (retailErr) {
          console.warn('Retail till close reporting failed:', retailErr);
        }
      } else {
        await queueOfflineTillClose({
          sessionId,
          closingCash,
          notes: till.notes?.trim() || undefined,
          retailBody,
        });
        Toast.show({
          type: 'info',
          text1: t('pos.savedOffline'),
        });
      }

      dispatch(clearTillSession());
      dispatch(resetTillForm());
      Toast.show({type: 'success', text1: t('till.closed')});
    } catch (e: unknown) {
      const message = isApiError(e)
        ? String((e.body as {message?: string})?.message ?? e.message)
        : e instanceof Error
          ? e.message
          : t('till.closeFailed');
      Toast.show({type: 'error', text1: t('till.closeFailed'), text2: message});
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h}>{t('till.closeTitle')}</Text>
      {!till.currentSessionId ? (
        <Text style={styles.warn}>{t('till.noSession')}</Text>
      ) : null}
      <Text style={styles.sub}>{t('till.countedTotals')}</Text>
      <TextInput
        label={t('till.cash')}
        keyboardType="decimal-pad"
        value={till.countedCash}
        onChangeText={v => dispatch(setTillCounts({countedCash: v}))}
        style={styles.field}
      />
      <TextInput
        label={t('till.momo')}
        keyboardType="decimal-pad"
        value={till.countedMomo}
        onChangeText={v => dispatch(setTillCounts({countedMomo: v}))}
        style={styles.field}
      />
      <TextInput
        label={t('till.airtel')}
        keyboardType="decimal-pad"
        value={till.countedAirtel}
        onChangeText={v => dispatch(setTillCounts({countedAirtel: v}))}
        style={styles.field}
      />
      <TextInput
        label={t('till.card')}
        keyboardType="decimal-pad"
        value={till.countedCard}
        onChangeText={v => dispatch(setTillCounts({countedCard: v}))}
        style={styles.field}
      />
      <TextInput
        label={t('till.onAccount')}
        keyboardType="decimal-pad"
        value={till.countedOnAccount}
        onChangeText={v => dispatch(setTillCounts({countedOnAccount: v}))}
        style={styles.field}
      />
      <TextInput
        label={t('till.notes')}
        value={till.notes}
        onChangeText={v => dispatch(setTillNotes(v))}
        style={styles.field}
      />
      <Button
        mode="contained"
        onPress={() => void submit()}
        disabled={!till.currentSessionId}
        contentStyle={styles.btnInner}>
        {t('till.closeButton')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  sub: {fontSize: 14, color: '#64748B', marginBottom: 8},
  warn: {color: '#DC2626', marginBottom: 12},
  wrap: {padding: 16, gap: 8},
  field: {marginBottom: 4},
  btnInner: {minHeight: 48},
});
