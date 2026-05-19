import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {listLowStockProducts} from '../../inventory/inventoryRepository';
import type {Product} from '../../db/models/Product';
import type {ProductVariant} from '../../db/models/ProductVariant';

type Nav = NativeStackNavigationProp<StockStackParamList, 'LowStock'>;

type Row = {product: Product; variant: ProductVariant; totalQty: number};

export default function LowStockScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<Row[]>([]);

  const reload = useCallback(async () => {
    setRows(await listLowStockProducts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>{t('inventory.lowStock')}</Text>
      <Button mode="outlined" onPress={() => void reload()} contentStyle={styles.btnInner}>
        {t('inventory.refresh')}
      </Button>
      <FlatList
        data={rows}
        keyExtractor={item => item.product.id}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('inventory.noReorder')}</Text>
        }
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.name}>{item.product.name}</Text>
              <Text>
                {t('inventory.stockQty')}: {item.totalQty} / {item.product.reorderPoint}
              </Text>
              <Text>
                {t('inventory.reorderQty')}: {item.product.reorderQty}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() =>
                  navigation.navigate('CreatePo', {
                    prefillSupplierId: item.product.preferredSupplierId,
                    prefillProductId: item.product.id,
                    prefillQty: item.product.reorderQty || 1,
                  })
                }>
                {t('inventory.createPoDraft')}
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  empty: {color: '#666', marginTop: 16},
  wrap: {flex: 1, padding: 12, gap: 8},
  card: {marginBottom: 8},
  name: {fontWeight: '600'},
  btnInner: {minHeight: 48},
});
