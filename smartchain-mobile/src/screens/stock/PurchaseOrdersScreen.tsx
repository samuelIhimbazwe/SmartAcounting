import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card, FAB} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {listPurchaseOrders} from '../../inventory/inventoryRepository';
import type {PurchaseOrder} from '../../db/models/PurchaseOrder';

type Nav = NativeStackNavigationProp<StockStackParamList, 'PurchaseOrders'>;

export default function PurchaseOrdersScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);

  const reload = useCallback(async () => {
    setRows(await listPurchaseOrders());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate('PoDetail', {poId: item.id})}>
            <Card.Content>
              <Text style={styles.name}>{item.status}</Text>
              <Text>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.needsSync ? (
                <Text style={styles.pending}>{t('inventory.pendingSync')}</Text>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePo', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  card: {marginBottom: 8},
  name: {fontWeight: '600'},
  pending: {color: '#D97706', marginTop: 4},
  fab: {position: 'absolute', right: 16, bottom: 16},
});
