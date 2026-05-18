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
import {apiClient} from '../../api/client';
import axios from 'axios';

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
  const [items, setItems] = useState<CountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location] = useState('SHOP');

  const loadInventory = useCallback(async () => {
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
      const message =
        axios.isAxiosError(error) && error.response?.data
          ? String(
              (error.response.data as {message?: string}).message ??
                error.message,
            )
          : error instanceof Error
            ? error.message
            : 'Failed to load inventory';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [location]);

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
        Alert.alert('Not found', `SKU ${barcode} not in this location`);
      }
    },
    [items],
  );

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const adjustments = items.filter(
        i => i.counted && i.variance !== null && i.variance !== 0,
      );
      const today = new Date().toISOString().split('T')[0];

      for (const adj of adjustments) {
        if (adj.variance! > 0) {
          await apiClient.post('/inventory/receive', {
            productId: adj.productId,
            quantity: adj.variance,
            location,
            costPrice: 0,
            supplierRef: 'STOCK_COUNT',
            lotCode: null,
            expiryDate: null,
          });
        } else {
          await apiClient.post('/inventory/shrinkage', {
            productId: adj.productId,
            sku: adj.sku,
            productName: adj.name,
            quantity: Math.abs(adj.variance!),
            unitCost: 0,
            reason: 'STOCK_COUNT_VARIANCE',
            location,
            incidentDate: today,
            notes: 'Stock count adjustment — shortage',
          });
        }
      }

      Alert.alert(
        'Count submitted',
        `${adjustments.length} adjustments posted successfully`,
        [{text: 'OK', onPress: () => void loadInventory()}],
      );
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data
          ? String(
              (error.response.data as {message?: string}).message ??
                error.message,
            )
          : error instanceof Error
            ? error.message
            : 'Submit failed';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCount = () => {
    const counted = items.filter(i => i.counted);
    if (counted.length === 0) {
      Alert.alert('Nothing to submit', 'Count at least one item first');
      return;
    }

    const withVariance = counted.filter(i => i.variance !== 0);
    Alert.alert(
      'Submit stock count?',
      `${counted.length} items counted.\n` +
        `${withVariance.length} items have variances.\n\n` +
        'Variances will be posted as adjustments.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Submit', onPress: () => void doSubmit()},
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
        <Text style={styles.itemSystem}>System: {item.systemQuantity} units</Text>
        {item.variance !== null && item.variance !== 0 ? (
          <Text
            style={[
              styles.variance,
              {color: item.variance > 0 ? '#16A34A' : '#DC2626'},
            ]}>
            Variance: {item.variance > 0 ? '+' : ''}
            {item.variance}
          </Text>
        ) : null}
      </View>
      <TextInput
        style={styles.countInput}
        value={item.countedQuantity?.toString() ?? ''}
        onChangeText={v => updateCount(item.productId, v)}
        placeholder="Count"
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
        <Text style={styles.loadingText}>Loading inventory…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Total items</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, {color: '#1B6FDB'}]}>
            {countedCount}
          </Text>
          <Text style={styles.statLabel}>Counted</Text>
        </View>
        <View style={styles.stat}>
          <Text
            style={[
              styles.statValue,
              {color: varianceCount > 0 ? '#DC2626' : '#16A34A'},
            ]}>
            {varianceCount}
          </Text>
          <Text style={styles.statLabel}>Variances</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name or SKU..."
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
            ? 'Submitting...'
            : `Submit Count (${countedCount} items)`}
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
