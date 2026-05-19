import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import type {AppDispatch, RootState} from '../../store';
import {
  loadBalancesPending,
  loadBalancesDone,
  loadBalancesFailed,
} from '../../store/slices/inventorySlice';
import {fetchBalances} from '../../api/inventory';
import {runInventorySync} from '../../inventory/inventorySync';
import {listProducts, variantLabel} from '../../inventory/inventoryRepository';
import {refreshReorderAlerts} from '../../inventory/reorderCheck';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import type {AppRole} from '../../utils/roles';
import {canManageInventory, canManageProcurement, hasAnyRole} from '../../utils/roles';
import type {Product} from '../../db/models/Product';
import type {ProductVariant} from '../../db/models/ProductVariant';
import {expirySeverity} from '../../inventory/inventoryMath';
import {database} from '../../db';
import {VariantBatch} from '../../db/models/VariantBatch';
import {Q} from '@nozbe/watermelondb';

type Nav = NativeStackNavigationProp<StockStackParamList, 'StockList'>;

type StockRow = {
  product: Product;
  variant: ProductVariant;
  batches: {batchNumber: string; qty: number; expiryDate?: string}[];
};

export default function StockScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector((s: RootState) => s.inventory.loading);
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const manage = canManageInventory(roles);
  const procurement = canManageProcurement(roles);
  const showLowStock = hasAnyRole(roles, 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [reorderCount, setReorderCount] = useState(0);

  const reload = useCallback(async () => {
    dispatch(loadBalancesPending());
    try {
      const apiRows = await fetchBalances();
      dispatch(loadBalancesDone(apiRows));
      await runInventorySync();
    } catch (e) {
      dispatch(loadBalancesFailed(String(e)));
    }
    const products = await listProducts();
    const built: StockRow[] = [];
    for (const product of products) {
      const variants = await database
        .get<ProductVariant>('product_variants')
        .query(Q.where('product_id', product.id))
        .fetch();
      for (const variant of variants) {
        const mine = (
          await database
            .get<VariantBatch>('variant_batches')
            .query(Q.where('variant_id', variant.id))
            .fetch()
        ).map(b => ({
            batchNumber: b.batchNumber,
            qty: b.qty,
            expiryDate: b.expiryDate,
          }));
        built.push({product, variant, batches: mine});
      }
    }
    setRows(built);
    const alerts = await refreshReorderAlerts();
    setReorderCount(alerts.length);
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <Button mode="outlined" loading={loading} onPress={() => void reload()} contentStyle={styles.btnInner}>
        {t('inventory.refresh')}
      </Button>
      {showLowStock ? (
        <Button mode="contained-tonal" onPress={() => navigation.navigate('LowStock')} contentStyle={styles.btnInner}>
          {t('inventory.lowStock')}
        </Button>
      ) : null}
      {reorderCount > 0 ? (
        <Button mode="contained-tonal" onPress={() => navigation.navigate('Reorder')} contentStyle={styles.btnInner}>
          {t('inventory.reorderAlerts', {count: reorderCount})}
        </Button>
      ) : null}
      <Button mode="contained-tonal" onPress={() => navigation.navigate('Expiring')} contentStyle={styles.btnInner}>
        {t('inventory.expiringSoon')}
      </Button>
      <Button mode="contained" onPress={() => navigation.navigate('StockCount')} contentStyle={styles.btnInner}>
        {t('stock.countTitle')}
      </Button>
      {manage ? (
        <>
          <Button mode="outlined" onPress={() => navigation.navigate('Suppliers')} contentStyle={styles.btnInner}>
            {t('inventory.suppliers')}
          </Button>
          <Button mode="outlined" onPress={() => navigation.navigate('SerialLookup')} contentStyle={styles.btnInner}>
            {t('inventory.serialLookup')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('ReceiveGrn', {})}
            contentStyle={styles.btnInner}>
            {t('inventory.receiveWithoutPo')}
          </Button>
        </>
      ) : null}
      {procurement ? (
        <Button mode="outlined" onPress={() => navigation.navigate('PurchaseOrders')} contentStyle={styles.btnInner}>
          {t('inventory.purchaseOrders')}
        </Button>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={r => r.variant.id}
        renderItem={({item}) => (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate('ProductDetail', {productId: item.product.id})}>
            <Card.Content>
              <Text style={styles.name}>{item.product.name}</Text>
              <Text>{variantLabel(item.variant)}</Text>
              <Text>
                {t('inventory.stockQty')}: {item.variant.stockQty}
                {item.product.saleUomId ? ` · ${t('inventory.uomUnit')}` : ''}
              </Text>
              {item.batches.map(b => {
                const sev = expirySeverity(b.expiryDate);
                const color = sev === 'red' ? '#DC2626' : sev === 'amber' ? '#D97706' : '#666';
                return (
                  <Text key={b.batchNumber} style={{color, fontSize: 12}}>
                    {t('inventory.batch')}: {b.batchNumber} · {b.qty}
                    {b.expiryDate ? ` · ${b.expiryDate}` : ''}
                  </Text>
                );
              })}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12, gap: 8},
  name: {fontWeight: '600', fontSize: 16},
  card: {marginBottom: 8},
  btnInner: {minHeight: 44},
});
