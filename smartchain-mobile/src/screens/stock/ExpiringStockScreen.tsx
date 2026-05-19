import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Card} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {fetchExpiringItems} from '../../inventory/inventorySync';
import {expirySeverity} from '../../inventory/inventoryMath';

export default function ExpiringStockScreen() {
  const {t} = useTranslation();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  const reload = useCallback(async () => {
    setRows(await fetchExpiringItems(30));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>{t('inventory.expiringSoon')}</Text>
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) => {
          const exp = String(item.expiryDate ?? '');
          const sev = expirySeverity(exp);
          const color = sev === 'red' ? '#DC2626' : sev === 'amber' ? '#D97706' : '#111';
          return (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={{color, fontWeight: '600'}}>
                  {String(item.productName ?? item.pname ?? item.batchNumber ?? 'Item')}
                </Text>
                <Text style={{color}}>
                  {t('inventory.expiryDate')}: {exp || '—'}
                </Text>
                <Text>
                  {t('inventory.qty')}: {String(item.qty ?? item.quantityOnHand ?? '')}
                </Text>
              </Card.Content>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  card: {marginBottom: 8},
});
