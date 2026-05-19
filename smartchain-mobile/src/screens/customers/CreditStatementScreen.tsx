import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {getCustomer} from '../../customers/customerRepository';
import {recordCustomerPayment} from '../../api/customers';
import type {CustomerStackParamList} from '../../navigation/CustomerNavigator';

type Route = RouteProp<CustomerStackParamList, 'CreditStatement'>;

export default function CreditStatementScreen() {
  const {t} = useTranslation();
  const route = useRoute<Route>();
  const [balance, setBalance] = useState(0);
  const [payment, setPayment] = useState('');

  const load = useCallback(async () => {
    const c = await getCustomer(route.params.customerId);
    setBalance(c.creditBalance);
  }, [route.params.customerId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const postPayment = async () => {
    const c = await getCustomer(route.params.customerId);
    const res = await recordCustomerPayment(c.serverId ?? c.id, {
      amount: parseFloat(payment) || 0,
    });
    setBalance(res.creditBalance);
    setPayment('');
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.balance}>
        {t('customers.outstandingCredit')}: {balance}
      </Text>
      <TextInput label={t('customers.paymentAmount')} value={payment} onChangeText={setPayment} keyboardType="decimal-pad" />
      <Button mode="contained" onPress={() => void postPayment()}>
        {t('customers.recordPayment')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  balance: {fontSize: 16, fontWeight: '600'},
});
