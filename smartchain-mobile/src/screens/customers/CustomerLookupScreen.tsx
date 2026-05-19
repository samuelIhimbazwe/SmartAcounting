import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card, Searchbar} from 'react-native-paper';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {setCustomer, type SelectedCustomer} from '../../store/slices/posSlice';
import type {CustomerStackParamList} from '../../navigation/CustomerNavigator';
import {searchCustomers} from '../../customers/customerRepository';
import {searchCustomersApi} from '../../api/customers';
import {upsertCustomerFromServer} from '../../customers/customerRepository';
import type {Customer} from '../../db/models/Customer';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'CustomerLookup'>;
type Route = RouteProp<CustomerStackParamList, 'CustomerLookup'>;

export default function CustomerLookupScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useDispatch();
  const online = useSelector((s: RootState) => s.network.online);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Customer[]>([]);

  const reload = useCallback(async () => {
    if (online) {
      try {
        const remote = await searchCustomersApi(query || undefined);
        for (const r of remote) {
          await upsertCustomerFromServer(r as Record<string, unknown>);
        }
      } catch {
        /* use local */
      }
    }
    setRows(await searchCustomers(query));
  }, [online, query]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const pick = (c: Customer) => {
    const selected: SelectedCustomer = {
      customerId: c.id,
      serverId: c.serverId,
      customerName: c.name,
      phone: c.phone,
      priceListId: c.priceListId,
      creditLimit: c.creditLimit,
      creditBalance: c.creditBalance,
      loyaltyPoints: c.loyaltyPoints,
      loyaltyEnabled: c.loyaltyEnabled,
    };
    if (route.params?.selectForCheckout) {
      dispatch(setCustomer(selected));
      navigation.getParent()?.goBack();
      return;
    }
    navigation.navigate('CustomerDetail', {customerId: c.id});
  };

  return (
    <View style={styles.wrap}>
      <Searchbar
        placeholder={t('customers.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void reload()}
      />
      <Button mode="outlined" onPress={() => navigation.navigate('CustomerForm', {})}>
        {t('customers.addCustomer')}
      </Button>
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Card style={styles.card} onPress={() => pick(item)}>
            <Card.Content>
              <Text style={styles.name}>{item.name}</Text>
              <Text>{item.phone ?? '—'}</Text>
              <Text>
                {t('customers.credit')}: {item.creditBalance} / {item.creditLimit}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12, gap: 8},
  card: {marginBottom: 8},
  name: {fontWeight: '600'},
});
