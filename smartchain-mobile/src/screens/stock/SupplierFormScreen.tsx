import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {database} from '../../db';
import {Supplier} from '../../db/models/Supplier';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {createSupplier, updateSupplier} from '../../inventory/inventoryRepository';
import {normaliseSupplierName} from '../../utils/procurementPayload';

type Route = RouteProp<StockStackParamList, 'SupplierForm'>;

export default function SupplierFormScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tin, setTin] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const id = route.params?.supplierId;
    if (!id) {
      return;
    }
    void database.get<Supplier>('suppliers').find(id).then(s => {
      setName(s.name);
      setPhone(s.phone ?? '');
      setEmail(s.email ?? '');
      setAddress(s.address ?? '');
      setTin(s.tinNumber ?? '');
      setNotes(s.notes ?? '');
    });
  }, [route.params?.supplierId]);

  const save = async () => {
    const trimmed = normaliseSupplierName(name);
    if (!trimmed) {
      return;
    }
    if (route.params?.supplierId) {
      await updateSupplier(route.params.supplierId, {
        name: trimmed,
        phone,
        email,
        address,
        tinNumber: tin,
        notes,
      });
    } else {
      await createSupplier({
        name: trimmed,
        phone,
        email,
        address,
        tinNumber: tin,
        notes,
      });
    }
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <TextInput label={t('inventory.supplierName')} value={name} onChangeText={setName} />
      <TextInput label={t('inventory.phone')} value={phone} onChangeText={setPhone} />
      <TextInput label={t('inventory.email')} value={email} onChangeText={setEmail} />
      <TextInput label={t('inventory.address')} value={address} onChangeText={setAddress} />
      <TextInput label={t('inventory.tin')} value={tin} onChangeText={setTin} />
      <TextInput label={t('inventory.notes')} value={notes} onChangeText={setNotes} multiline />
      <Button mode="contained" onPress={() => void save()}>
        {t('common.submit')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({wrap: {padding: 12, gap: 8}});
