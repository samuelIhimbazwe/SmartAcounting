import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card, FAB} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {listActiveSuppliers, softDeleteSupplier} from '../../inventory/inventoryRepository';
import type {Supplier} from '../../db/models/Supplier';

type Nav = NativeStackNavigationProp<StockStackParamList, 'Suppliers'>;

export default function SuppliersScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<Supplier[]>([]);

  const reload = useCallback(async () => {
    setRows(await listActiveSuppliers());
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
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text>{item.phone}</Text> : null}
              {item.email ? <Text>{item.email}</Text> : null}
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => navigation.navigate('SupplierForm', {supplierId: item.id})}>
                {t('inventory.editSupplier')}
              </Button>
              <Button
                textColor="#DC2626"
                onPress={() => void softDeleteSupplier(item.id).then(reload)}>
                {t('inventory.deleteSupplier')}
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('SupplierForm', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  card: {marginBottom: 8},
  name: {fontWeight: '600', fontSize: 16},
  fab: {position: 'absolute', right: 16, bottom: 16},
});
