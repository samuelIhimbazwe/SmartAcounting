import React from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  resetTillForm,
  setTillCounts,
  setTillNotes,
} from '../../store/slices/tillSlice';
import {postTillClose} from '../../api/retail';

export default function TillCloseScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const till = useSelector((s: RootState) => s.till);

  const submit = async () => {
    const body = {
      businessDate: till.businessDate,
      posRegisterCode: till.posRegisterCode,
      countedCash: Number(till.countedCash),
      countedMomo: Number(till.countedMomo),
      countedAirtel: Number(till.countedAirtel),
      countedCard: Number(till.countedCard),
      countedOnAccount: Number(till.countedOnAccount),
      notes: till.notes?.trim() || null,
    };
    try {
      await postTillClose(body);
      Toast.show({type: 'success', text1: 'Till closed'});
      dispatch(resetTillForm());
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Till close failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h}>Counted totals</Text>
      <TextInput
        label="Cash"
        keyboardType="decimal-pad"
        value={till.countedCash}
        onChangeText={t => dispatch(setTillCounts({countedCash: t}))}
        style={styles.field}
      />
      <TextInput
        label="MTN MoMo"
        keyboardType="decimal-pad"
        value={till.countedMomo}
        onChangeText={t => dispatch(setTillCounts({countedMomo: t}))}
        style={styles.field}
      />
      <TextInput
        label="Airtel Money"
        keyboardType="decimal-pad"
        value={till.countedAirtel}
        onChangeText={t => dispatch(setTillCounts({countedAirtel: t}))}
        style={styles.field}
      />
      <TextInput
        label="Card"
        keyboardType="decimal-pad"
        value={till.countedCard}
        onChangeText={t => dispatch(setTillCounts({countedCard: t}))}
        style={styles.field}
      />
      <TextInput
        label="On account"
        keyboardType="decimal-pad"
        value={till.countedOnAccount}
        onChangeText={t =>
          dispatch(setTillCounts({countedOnAccount: t}))
        }
        style={styles.field}
      />
      <TextInput
        label="Notes"
        value={till.notes}
        onChangeText={t => dispatch(setTillNotes(t))}
        style={styles.field}
      />
      <Button mode="contained" onPress={() => void submit()} contentStyle={styles.btnInner}>
        Submit till close
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  wrap: {padding: 16, gap: 8},
  field: {marginBottom: 4},
  btnInner: {minHeight: 48},
});
