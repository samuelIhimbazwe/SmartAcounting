import React from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, Card, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  setTillBusinessDate,
  setTillExpectedSnapshot,
  setTillRegisterCode,
} from '../../store/slices/tillSlice';
import {fetchTillExpected} from '../../api/retail';
import type {TillStackParamList} from '../../navigation/TillNavigator';

type Nav = NativeStackNavigationProp<TillStackParamList, 'TillOpen'>;

export default function TillOpenScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const businessDate = useSelector((s: RootState) => s.till.businessDate);
  const posRegisterCode = useSelector((s: RootState) => s.till.posRegisterCode);
  const snapshot = useSelector((s: RootState) => s.till.tillExpectedSnapshot);

  const loadExpected = async () => {
    try {
      const data = await fetchTillExpected(businessDate, posRegisterCode);
      dispatch(setTillExpectedSnapshot(data));
      Toast.show({type: 'success', text1: 'Till snapshot loaded'});
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Could not load till snapshot',
        text2: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h}>Till session</Text>
      <TextInput
        label="Business date (YYYY-MM-DD)"
        value={businessDate}
        onChangeText={t => dispatch(setTillBusinessDate(t))}
        style={styles.field}
      />
      <TextInput
        label="POS register code"
        value={posRegisterCode}
        onChangeText={t => dispatch(setTillRegisterCode(t))}
        style={styles.field}
      />
      <Button mode="contained" onPress={() => void loadExpected()} contentStyle={styles.btnInner}>
        Load expected counts
      </Button>
      {snapshot ? (
        <Card style={styles.card}>
          <Card.Title title="Expected (reference)" />
          <Card.Content>
            <Text selectable style={styles.mono}>
              {JSON.stringify(snapshot, null, 2)}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
      <Button
        mode="contained-tonal"
        onPress={() => navigation.navigate('TillClose')}
        contentStyle={styles.btnInner}>
        Close till
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  mono: {fontSize: 12},
  wrap: {padding: 16, gap: 10},
  field: {marginBottom: 4},
  card: {marginTop: 8},
  btnInner: {minHeight: 48},
});
