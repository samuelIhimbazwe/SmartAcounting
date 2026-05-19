import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {listPriceListsApi} from '../../api/customers';

export default function PriceListManageScreen() {
  const {t} = useTranslation();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    void listPriceListsApi()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text>{t('customers.priceListsHint')}</Text>
      {rows.map(r => (
        <Text key={String(r.id)} style={styles.row}>
          {String(r.name)} · {String(r.currencyCode ?? 'RWF')}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({wrap: {padding: 12, gap: 8}, row: {marginTop: 8}});
