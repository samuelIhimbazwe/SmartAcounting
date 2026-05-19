import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import {useSelector} from 'react-redux';
import {apiClient, isApiError} from '../../api/client';
import type {RootState} from '../../store';
import {queueOfflineStockCount} from '../../services/offlineQueue';
import {useTranslation} from 'react-i18next';
import {getSyncLocationCode} from '../../inventory/syncLocation';

interface CountItem {
  productId: string;
  sku: string;
  name: string;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number | null;
  counted: boolean;
}

export default function StockCountScreen() {
  const {t} = useTranslation();
  const online = useSelector((s: RootState) => s.network.online);
  const locationCode = useSelector(
    (s: RootState) => s.location.selectedLocationCode,
  );
  const [items, setItems] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadInventory = useCallback(async () => {
    const location = getSyncLocationCode();
    setLoading(true);
    try {
      const {data} = await apiClient.get<
        Array<{
          productId: string;
          quantity: number;
          productName?: string;
          sku?: string;
        }>
      >('/inventory/balances', {params: {location}});

      setItems(
        data.map(item => ({
          productId: String(item.productId),
          sku: item.sku ?? String(item.productId).slice(0, 8),
          name: item.productName ?? item.sku ?? 'Product',
          systemQuantity: Number(item.quantity) || 0,
          countedQuantity: null,
          variance: null,
          counted: false,
        })),
      );
    } catch (error: unknown) {
      const message = isApiError(error)
        ? String((error.body as {message?: string})?.message ?? error.message)
        : error instanceof Error
          ? error.message
          : t('stock.loadFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  }, [locationCode, t]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const updateCount = useCallback((productId: string, quantity: string) => {
    setItems(prev =>
      prev.map(item => {
        if (item.productId !== productId) {
          return item;
        }
        const counted = quantity === '' ? null : Number(quantity);
        return {
          ...item,
          countedQuantity: counted,
          variance:
            counted !== null && !Number.isNaN(counted)
              ? counted - item.systemQuantity
              : null,
          counted: counted !== null && !Number.isNaN(counted),
        };
      }),
    );
  }, []);

  const onBarcodeScanned = useCallback(
    (barcode: string) => {
      const found = items.find(
        i => i.sku === barcode || i.productId === barcode,
      );
      if (found) {
        setSearchQuery(found.name);
      } else {
        Alert.alert(
          t('stock.notFound'),
          t('stock.notFoundSku', {sku: barcode}),
        );
      }
    },
    [items, t],
  );

  const doSubmit = async () => {
    const location = getSyncLocationCode();
    setSubmitting(true);
    try {
      const adjustments = items.filter(
        i => i.counted && i.variance !== null && i.variance !== 0,
      );
      const today = new Date().toISOString().split('T')[0];
      const queuedAdjustments = adjustments.map(adj => {
        if (adj.variance! > 0) {
          return {
            variance: adj.variance,
            receiveBody: {
              productId: adj.productId,
              quantity: adj.variance,
              location,
              costPrice: 0,
              supplierRef: 'STOCK_COUNT',
              lotCode: null,
              expiryDate: null,
            },
          };
        }
        return {
          variance: adj.variance,
          shrinkageBody: {
            productId: adj.productId,
            sku: adj.sku,
            productName: adj.name,
            quantity: Math.abs(adj.variance!),
            unitCost: 0,
            reason: 'STOCK_COUNT_VARIANCE',
            location,
            incidentDate: today,
            notes: 'Stock count adjustment — shortage',
          },
        };
      });

      if (!online) {
        await queueOfflineStockCount({adjustments: queuedAdjustments});
        Alert.alert(
          t('stock.queued'),
          t('stock.queuedBody', {count: adjustments.length}),
          [{text: t('common.ok'), onPress: () => void loadInventory()}],
        );
        return;
      }

      for (const adj of queuedAdjustments) {
        if (Number(adj.variance) > 0) {
          await apiClient.post('/inventory/receive', adj.receiveBody);
        } else {
          await apiClient.post('/inventory/shrinkage', adj.shrinkageBody);
        }
      }

      Alert.alert(
        t('stock.submitted'),
        t('stock.submittedBody', {count: adjustments.length}),
        [{text: t('common.ok'), onPress: () => void loadInventory()}],
      );
    } catch (error: unknown) {
      const message = isApiError(error)
        ? String((error.body as {message?: string})?.message ?? error.message)
        : error instanceof Error
          ? error.message
          : t('stock.submitFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCount = () => {
    const counted = items.filter(i => i.counted);
    if (counted.length === 0) {
      Alert.alert(t('stock.nothingToSubmit'), t('stock.countOneFirst'));
      return;
    }

    const withVariance = counted.filter(i => i.variance !== 0);
    Alert.alert(
      t('stock.confirmTitle'),
      t('stock.confirmBody', {
        counted: counted.length,
        variances: withVariance.length,
      }),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {text: t('common.submit'), onPress: () => void doSubmit()},
      ],
    );
  };

  const filtered = items.filter(
    i =>
      searchQuery === '' ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const countedCount = items.filter(i => i.counted).length;
  const varianceCount = items.filter(i => i.counted && i.variance !== 0).length;

  const renderItem = ({item}: {item: CountItem}) => (
    <View
      style={[
        styles.itemRow,
        item.counted && item.variance !== 0 && styles.itemVariance,
        item.counted && item.variance === 0 && styles.itemOk,
      ]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemSku}>{item.sku}</Text>
        <Text style={styles.itemSystem}>
          {t('stock.systemQty', {qty: item.systemQuantity})}
        </Text>
        {item.variance !== null && item.variance !== 0 ? (
          <Text
            style={[
              styles.variance,
              {color: item.variance > 0 ? '#16A34A' : '#DC2626'},
            ]}>
            {t('stock.varianceLine', {
              value: `${item.variance > 0 ? '+' : ''}${item.variance}`,
            })}
          </Text>
        ) : null}
      </View>
      <TextInput
        style={styles.countInput}
        value={item.countedQuantity?.toString() ?? ''}
        onChangeText={v => updateCount(item.productId, v)}
        placeholder={t('stock.countPlaceholder')}
        keyboardType="numeric"
        selectTextOnFocus
        onSubmitEditing={() => {
          if (searchQuery.match(/^\d+$/)) {
            onBarcodeScanned(searchQuery);
          }
        }}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('stock.loadingInventory')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>{t('stock.totalItems')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, {color: '#1B6FDB'}]}>
            {countedCount}
          </Text>
          <Text style={styles.statLabel}>{t('stock.counted')}</Text>
        </View>
        <View style={styles.stat}>
          <Text
            style={[
              styles.statValue,
              {color: varianceCount > 0 ? '#DC2626' : '#16A34A'},
            ]}>
            {varianceCount}
          </Text>
          <Text style={styles.statLabel}>{t('stock.variances')}</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('stock.searchPlaceholder')}
      />

      <FlatList
        data={filtered}
        keyExtractor={i => i.productId}
        renderItem={renderItem}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={submitCount}
        disabled={submitting}>
        <Text style={styles.submitText}>
          {submitting
            ? t('stock.submitting')
            : t('stock.submitCount', {count: countedCount})}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC'},
  loadingText: {padding: 24, textAlign: 'center', color: '#64748B'},
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stat: {flex: 1, alignItems: 'center'},
  statValue: {fontSize: 24, fontWeight: '700', color: '#0F172A'},
  statLabel: {fontSize: 12, color: '#94A3B8', marginTop: 2},
  search: {
    margin: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  list: {flex: 1, paddingHorizontal: 12},
  itemRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemVariance: {borderColor: '#FCA5A5', backgroundColor: '#FEF2F2'},
  itemOk: {borderColor: '#86EFAC', backgroundColor: '#F0FDF4'},
  itemInfo: {flex: 1, marginRight: 12},
  itemName: {fontSize: 15, fontWeight: '600', color: '#0F172A'},
  itemSku: {fontSize: 12, color: '#94A3B8', marginTop: 2},
  itemSystem: {fontSize: 13, color: '#475569', marginTop: 4},
  variance: {fontSize: 13, fontWeight: '600', marginTop: 2},
  countInput: {
    width: 80,
    borderWidth: 2,
    borderColor: '#1B6FDB',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0F172A',
  },
  submitButton: {
    margin: 12,
    backgroundColor: '#1B6FDB',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: {backgroundColor: '#93C5FD'},
  submitText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
});
