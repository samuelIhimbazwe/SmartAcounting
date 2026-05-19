import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {CustomerStackParamList} from '../../navigation/CustomerNavigator';
import {getCustomer} from '../../customers/customerRepository';
import {fetchCustomerSales, fetchLoyaltyTransactions} from '../../api/customers';
import type {Customer} from '../../db/models/Customer';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'CustomerDetail'>;
type Route = RouteProp<CustomerStackParamList, 'CustomerDetail'>;

export default function CustomerDetailScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [loyalty, setLoyalty] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    const c = await getCustomer(route.params.customerId);
    setCustomer(c);
    try {
      setSales((await fetchCustomerSales(c.serverId ?? c.id)) as Record<string, unknown>[]);
      setLoyalty((await fetchLoyaltyTransactions(c.serverId ?? c.id)) as Record<string, unknown>[]);
    } catch {
      setSales([]);
      setLoyalty([]);
    }
  }, [route.params.customerId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!customer) {
    return <Text style={styles.wrap}>{t('common.loading')}</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card>
        <Card.Content>
          <Text style={styles.title}>{customer.name}</Text>
          <Text>{customer.phone}</Text>
          <Text>{customer.email}</Text>
          <Text>{t('customers.type')}: {customer.customerType}</Text>
          <Text>
            {t('customers.credit')}: {customer.creditBalance} / {customer.creditLimit}
          </Text>
          <Text>
            {t('customers.loyaltyPoints')}: {customer.loyaltyPoints}
          </Text>
        </Card.Content>
      </Card>
      <Button mode="outlined" onPress={() => navigation.navigate('CustomerForm', {customerId: customer.id})}>
        {t('common.edit')}
      </Button>
      <Button mode="outlined" onPress={() => navigation.navigate('CreditStatement', {customerId: customer.id})}>
        {t('customers.creditStatement')}
      </Button>
      <Text style={styles.section}>{t('customers.purchaseHistory')}</Text>
      {sales.map((s, i) => (
        <Text key={String(i)}>
          {String(s.createdAt ?? '')} · {String(s.totalAmount ?? '')}
        </Text>
      ))}
      <Text style={styles.section}>{t('customers.loyaltyLog')}</Text>
      {loyalty.map((tx, i) => (
        <Text key={String(i)}>
          {String(tx.transactionType)} {String(tx.points)} pts
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  title: {fontSize: 18, fontWeight: '700'},
  section: {fontWeight: '600', marginTop: 12},
});
