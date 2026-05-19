import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {apiClient, isApiError} from '../../api/client';
import type {RootState} from '../../store';
import type {PosStackParamList} from '../../navigation/PosNavigator';
import {queueOfflineReturn} from '../../services/offlineQueue';

const RETURN_REASONS = [
  'DAMAGED',
  'WRONG_ITEM',
  'CUSTOMER_CHANGE_OF_MIND',
  'EXPIRED',
  'QUALITY_ISSUE',
  'OTHER',
];

const REFUND_METHODS = [
  {value: 'CASH', label: 'Cash'},
  {value: 'MOMO', label: 'MoMo'},
  {value: 'STORE_CREDIT', label: 'Store Credit'},
];

type Nav = NativeStackNavigationProp<PosStackParamList, 'Returns'>;

interface ReturnLineForm {
  productId: string;
  sku: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

export default function ReturnsScreen() {
  const navigation = useNavigation<Nav>();
  const posRegisterCode = useSelector((s: RootState) => s.pos.posRegisterCode);
  const online = useSelector((s: RootState) => s.network.online);
  const [originalRef, setOriginalRef] = useState('');
  const [reason, setReason] = useState('DAMAGED');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [items, setItems] = useState<ReturnLineForm[]>([
    {
      productId: '',
      sku: '',
      productName: '',
      quantity: '1',
      unitPrice: '',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        productId: '',
        sku: '',
        productName: '',
        quantity: '1',
        unitPrice: '',
      },
    ]);
  };

  const updateItem = (index: number, field: keyof ReturnLineForm, value: string) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? {...item, [field]: value} : item)),
    );
  };

  const totalRefund = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const doSubmit = async () => {
    setSubmitting(true);
    const body = {
      originalTransactionId: originalRef.trim() || null,
      reason,
      refundMethod,
      tillCode: posRegisterCode || 'REG-01',
      lines: items.map(i => ({
        productId: i.productId.trim() || '00000000-0000-0000-0000-000000000001',
        sku: i.sku.trim() || 'RETURN',
        productName: i.productName.trim(),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        restock: reason !== 'DAMAGED' && reason !== 'EXPIRED',
        condition:
          reason === 'DAMAGED'
            ? 'DAMAGED'
            : reason === 'EXPIRED'
              ? 'EXPIRED'
              : 'RESALEABLE',
      })),
    };
    try {
      if (online) {
        await apiClient.post('/pos/returns', body);
      } else {
        await queueOfflineReturn(body);
      }

      Alert.alert(
        online ? 'Return processed' : 'Return queued',
        online
          ? `Refund of ${totalRefund.toLocaleString()} FRW processed successfully.`
          : 'Return saved offline — will sync when online.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error: unknown) {
      let msg = 'Return failed';
      if (isApiError(error)) {
        if (error.status === 403) {
          msg =
            'This return requires manager approval. A manager has been notified.';
        } else {
          msg = String((error.body as {message?: string})?.message ?? error.message);
        }
      } else if (error instanceof Error) {
        msg = error.message;
      }
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReturn = () => {
    const valid = items.every(
      i => i.productName.trim() && i.quantity && i.unitPrice,
    );
    if (!valid) {
      Alert.alert('Error', 'Please fill in all item details');
      return;
    }

    Alert.alert(
      'Confirm Return',
      `Refund ${totalRefund.toLocaleString()} FRW via ${refundMethod}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Confirm', onPress: () => void doSubmit()},
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Process Return</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Original Receipt Number (optional)</Text>
        <TextInput
          style={styles.input}
          value={originalRef}
          onChangeText={setOriginalRef}
          placeholder="e.g. TXN-20250518-001"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Reason for Return</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.reasonRow}>
            {RETURN_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonChip, reason === r && styles.reasonSelected]}
                onPress={() => setReason(r)}>
                <Text
                  style={[
                    styles.reasonText,
                    reason === r && styles.reasonTextSelected,
                  ]}>
                  {r.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Items to Return</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <TextInput
              style={styles.input}
              value={item.productId}
              onChangeText={v => updateItem(index, 'productId', v)}
              placeholder="Product ID (UUID)"
            />
            <TextInput
              style={styles.input}
              value={item.productName}
              onChangeText={v => updateItem(index, 'productName', v)}
              placeholder="Product name"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={item.quantity}
                onChangeText={v => updateItem(index, 'quantity', v)}
                placeholder="Qty"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={item.unitPrice}
                onChangeText={v => updateItem(index, 'unitPrice', v)}
                placeholder="Unit price (FRW)"
                keyboardType="numeric"
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Text style={styles.addButtonText}>+ Add another item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Refund Method</Text>
        <View style={styles.methodRow}>
          {REFUND_METHODS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.methodChip,
                refundMethod === m.value && styles.methodSelected,
              ]}
              onPress={() => setRefundMethod(m.value)}>
              <Text
                style={[
                  styles.methodText,
                  refundMethod === m.value && styles.methodTextSelected,
                ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Refund</Text>
        <Text style={styles.totalAmount}>
          {totalRefund.toLocaleString()} FRW
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={submitReturn}
        disabled={submitting}>
        <Text style={styles.submitText}>
          {submitting ? 'Processing...' : 'Process Return'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC', padding: 16},
  title: {fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 20},
  section: {marginBottom: 20},
  label: {fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8},
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 8,
  },
  row: {flexDirection: 'row', gap: 8},
  halfInput: {flex: 1},
  reasonRow: {flexDirection: 'row', gap: 8, paddingBottom: 4},
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  reasonSelected: {backgroundColor: '#1B6FDB', borderColor: '#1B6FDB'},
  reasonText: {fontSize: 13, color: '#475569'},
  reasonTextSelected: {color: '#FFFFFF'},
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addButton: {
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1B6FDB',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addButtonText: {color: '#1B6FDB', fontWeight: '600'},
  methodRow: {flexDirection: 'row', gap: 8},
  methodChip: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  methodSelected: {backgroundColor: '#1B6FDB', borderColor: '#1B6FDB'},
  methodText: {fontWeight: '600', color: '#475569'},
  methodTextSelected: {color: '#FFFFFF'},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalLabel: {fontSize: 16, color: '#475569', fontWeight: '600'},
  totalAmount: {fontSize: 22, fontWeight: '700', color: '#0F172A'},
  submitButton: {
    backgroundColor: '#DC2626',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitDisabled: {backgroundColor: '#FCA5A5'},
  submitText: {color: '#FFFFFF', fontSize: 17, fontWeight: '700'},
});
