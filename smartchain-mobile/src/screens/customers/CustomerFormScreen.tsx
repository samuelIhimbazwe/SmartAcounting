import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, Switch, TextInput} from 'react-native-paper';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import type {CustomerStackParamList} from '../../navigation/CustomerNavigator';
import {
  createCustomer,
  getCustomer,
  softDeleteCustomer,
  updateCustomer,
} from '../../customers/customerRepository';
import {createCustomerApi, deleteCustomerApi, updateCustomerApi} from '../../api/customers';
import type {CustomerType} from '../../db/models/Customer';

type Route = RouteProp<CustomerStackParamList, 'CustomerForm'>;

export default function CustomerFormScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const online = useSelector((s: RootState) => s.network.online);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tin, setTin] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('RETAIL');
  const [creditLimit, setCreditLimit] = useState('0');
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const id = route.params?.customerId;
    if (!id) {
      return;
    }
    void getCustomer(id).then(c => {
      setName(c.name);
      setPhone(c.phone ?? '');
      setEmail(c.email ?? '');
      setTin(c.tinNumber ?? '');
      setCustomerType(c.customerType);
      setCreditLimit(String(c.creditLimit));
      setLoyaltyEnabled(c.loyaltyEnabled);
      setNotes(c.notes ?? '');
    });
  }, [route.params?.customerId]);

  const save = async () => {
    const body = {
      name: name.trim(),
      phone,
      email,
      tinNumber: tin,
      customerType,
      creditLimit: parseFloat(creditLimit) || 0,
      loyaltyEnabled,
      notes,
    };
    if (route.params?.customerId) {
      await updateCustomer(route.params.customerId, body);
      if (online) {
        const c = await getCustomer(route.params.customerId);
        await updateCustomerApi(c.serverId ?? c.id, body);
      }
    } else {
      const local = await createCustomer(body);
      if (online) {
        const remote = await createCustomerApi(body);
        await updateCustomer(local.id, {serverId: remote.id});
      }
    }
    navigation.goBack();
  };

  const remove = async () => {
    const id = route.params?.customerId;
    if (!id) {
      return;
    }
    const c = await getCustomer(id);
    await softDeleteCustomer(id);
    if (online && c.serverId) {
      await deleteCustomerApi(c.serverId);
    }
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <TextInput label={t('customers.name')} value={name} onChangeText={setName} />
      <TextInput label={t('customers.phone')} value={phone} onChangeText={setPhone} />
      <TextInput label={t('customers.email')} value={email} onChangeText={setEmail} />
      <TextInput label={t('customers.tin')} value={tin} onChangeText={setTin} />
      <TextInput label={t('customers.creditLimit')} value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" />
      <TextInput label={t('inventory.notes')} value={notes} onChangeText={setNotes} multiline />
      <Text>{t('customers.loyaltyEnabled')}</Text>
      <Switch value={loyaltyEnabled} onValueChange={setLoyaltyEnabled} />
      <Button mode="contained" onPress={() => void save()}>
        {t('common.submit')}
      </Button>
      {route.params?.customerId ? (
        <Button mode="outlined" textColor="#DC2626" onPress={() => void remove()}>
          {t('customers.delete')}
        </Button>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({wrap: {padding: 12, gap: 8}});
