import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card, TextInput} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {
  cancelLayaway,
  collectLayaway,
  listOpenLayaways,
  recordLayawayPayment,
} from '../../customers/layawayRepository';
import type {LayawayOrder} from '../../db/models/LayawayOrder';

export default function LayawayListScreen() {
  const {t} = useTranslation();
  const [rows, setRows] = useState<LayawayOrder[]>([]);
  const [paymentById, setPaymentById] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    void listOpenLayaways().then(setRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const pay = async (id: string) => {
    const amount = parseFloat(paymentById[id] ?? '0');
    if (amount <= 0) {
      Toast.show({type: 'error', text1: t('customers.paymentAmount')});
      return;
    }
    const updated = await recordLayawayPayment(id, amount);
    if (!updated) {
      Toast.show({type: 'error', text1: t('customers.layawayPaymentFailed')});
      return;
    }
    setPaymentById(prev => ({...prev, [id]: ''}));
    reload();
    Toast.show({type: 'success', text1: t('customers.layawayPaymentRecorded')});
  };

  const collect = async (id: string) => {
    const ok = await collectLayaway(id);
    if (!ok) {
      Toast.show({type: 'error', text1: t('customers.layawayCollectFailed')});
      return;
    }
    reload();
    Toast.show({type: 'success', text1: t('customers.layawayCollected')});
  };

  const cancel = async (id: string) => {
    const ok = await cancelLayaway(id);
    if (!ok) {
      Toast.show({type: 'error', text1: t('customers.layawayCancelFailed')});
      return;
    }
    reload();
    Toast.show({type: 'success', text1: t('customers.layawayCancelled')});
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text>{t('customers.layawayOpen')}</Text>
              <Text>
                {t('customers.deposit')}: {item.depositAmount} · {t('customers.balanceDue')}:{' '}
                {item.balanceDue}
              </Text>
              {item.collectionDate ? (
                <Text>
                  {t('customers.collectionDate')}: {item.collectionDate}
                </Text>
              ) : null}
              <TextInput
                label={t('customers.paymentAmount')}
                keyboardType="decimal-pad"
                value={paymentById[item.id] ?? ''}
                onChangeText={v =>
                  setPaymentById(prev => ({...prev, [item.id]: v}))
                }
                style={styles.field}
              />
              <View style={styles.actions}>
                <Button compact mode="outlined" onPress={() => void pay(item.id)}>
                  {t('customers.recordPayment')}
                </Button>
                <Button
                  compact
                  mode="contained"
                  disabled={item.balanceDue > 0.01}
                  onPress={() => void collect(item.id)}>
                  {t('customers.markCollected')}
                </Button>
                <Button compact mode="text" onPress={() => void cancel(item.id)}>
                  {t('customers.cancelLayaway')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  card: {marginBottom: 8},
  field: {marginTop: 8},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
});
