import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Card, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  clearCart,
  removeFromCart,
  setBarcodeInput,
  setCustomer,
  setDiscount,
  setLastTransaction,
  setPosRegisterCode,
  setTenderType,
  setProcessing,
  setSessionCurrency,
  updateQuantity,
} from '../../store/slices/posSlice';
import type {PosStackParamList} from '../../navigation/PosNavigator';
import {useBarcode} from '../../hooks/useBarcode';
import {useWakeLock} from '../../hooks/useWakeLock';
import {postCheckout} from '../../api/pos';
import {queueOfflineCheckout} from '../../services/offlineQueue';
import {formatMoney} from '../../utils/currency';

type Nav = NativeStackNavigationProp<PosStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  useWakeLock();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const {lookupAndAddProduct} = useBarcode();

  const cart = useSelector((s: RootState) => s.pos.cart);
  const discount = useSelector((s: RootState) => s.pos.discount);
  const sessionCurrency = useSelector((s: RootState) => s.pos.sessionCurrency);
  const customerName = useSelector((s: RootState) => s.pos.customerName);
  const posRegisterCode = useSelector((s: RootState) => s.pos.posRegisterCode);
  const barcodeInput = useSelector((s: RootState) => s.pos.barcodeInput);
  const processing = useSelector((s: RootState) => s.pos.isProcessing);
  const tenderType = useSelector((s: RootState) => s.pos.tenderType);
  const online = useSelector((s: RootState) => s.network.online);

  const subtotal = useMemo(
    () => cart.reduce((a, b) => a + b.lineTotal, 0),
    [cart],
  );
  const total = useMemo(
    () => Math.max(0, subtotal - discount),
    [subtotal, discount],
  );

  const submitCheckout = async () => {
    if (cart.length === 0) {
      Toast.show({type: 'error', text1: 'Cart is empty'});
      return;
    }
    const lines = cart.map(i => ({
      barcode: i.barcode,
      quantity: Math.max(0.001, Number(i.quantity.toFixed(4))),
    }));
    const body = {
      customerName: customerName?.trim() || null,
      currencyCode: sessionCurrency,
      posRegisterCode,
      lines,
      tenders: [
        {
          tenderType,
          amount: Number(total.toFixed(2)),
          reference: null as string | null,
        },
      ],
      onAccountCustomerName: null,
      managerOverride: false,
    };
    try {
      dispatch(setProcessing(true));
      if (online) {
        const res = await postCheckout(body);
        const sid = res?.salesOrderId;
        if (sid != null) {
          dispatch(setLastTransaction(String(sid)));
        }
        Toast.show({type: 'success', text1: 'Sale completed'});
        dispatch(clearCart());
        navigation.navigate('Receipt');
      } else {
        await queueOfflineCheckout(body);
        Toast.show({
          type: 'info',
          text1: 'Saved offline — will sync when online',
        });
        dispatch(clearCart());
      }
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Checkout failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      dispatch(setProcessing(false));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Returns')}
        style={styles.field}
        textColor="#DC2626"
        contentStyle={styles.btnInner}>
        Process return / refund
      </Button>
      <Text style={[styles.section, styles.sectionTitle]}>Register & tender</Text>
      <TextInput
        label="POS register code"
        value={posRegisterCode}
        onChangeText={t => dispatch(setPosRegisterCode(t))}
        style={styles.field}
      />
      <View style={styles.row}>
        <Button
          mode={sessionCurrency === 'FRW' ? 'contained' : 'outlined'}
          onPress={() => dispatch(setSessionCurrency('FRW'))}
          style={styles.currencyBtn}
          contentStyle={styles.btnInner}>
          FRW
        </Button>
        <Button
          mode={sessionCurrency === 'USD' ? 'contained' : 'outlined'}
          onPress={() => dispatch(setSessionCurrency('USD'))}
          style={styles.currencyBtn}
          contentStyle={styles.btnInner}>
          USD
        </Button>
      </View>
      <Text style={[styles.section, styles.sectionTitle]}>Payment method</Text>
      <View style={styles.row}>
        {(['CASH', 'MOMO', 'CARD'] as const).map(t => (
          <Button
            key={t}
            mode={tenderType === t ? 'contained' : 'outlined'}
            onPress={() => dispatch(setTenderType(t))}
            style={styles.currencyBtn}
            contentStyle={styles.btnInner}>
            {t}
          </Button>
        ))}
      </View>
      <TextInput
        label="Customer name (optional)"
        value={customerName ?? ''}
        onChangeText={t =>
          dispatch(
            setCustomer(
              t.trim()
                ? {customerId: 'WALK_IN', customerName: t.trim()}
                : null,
            ),
          )
        }
        style={styles.field}
      />
      <TextInput
        label="Discount (same currency)"
        keyboardType="decimal-pad"
        value={discount ? String(discount) : ''}
        onChangeText={t => dispatch(setDiscount(parseFloat(t) || 0))}
        style={styles.field}
      />
      <Text style={[styles.section, styles.sectionTitle]}>Scan or enter barcode</Text>
      <View style={styles.row}>
        <TextInput
          label="Barcode"
          value={barcodeInput}
          onChangeText={t => dispatch(setBarcodeInput(t))}
          style={[styles.field, {flex: 1}]}
          onSubmitEditing={() => {
            if (barcodeInput.trim()) {
              void lookupAndAddProduct(barcodeInput.trim());
              dispatch(setBarcodeInput(''));
            }
          }}
        />
        <Button
          mode="contained-tonal"
          onPress={() => {
            if (barcodeInput.trim()) {
              void lookupAndAddProduct(barcodeInput.trim());
              dispatch(setBarcodeInput(''));
            }
          }}
          style={styles.addBtn}
          contentStyle={styles.btnInner}>
          Add
        </Button>
      </View>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Barcode')}
        style={styles.field}
        contentStyle={styles.btnInner}>
        Open camera scanner
      </Button>

      <Text style={[styles.section, styles.sectionTitle]}>Cart</Text>
      {cart.map(item => (
        <Card key={item.catalogItemId} style={styles.card}>
          <Card.Title title={item.name} subtitle={`SKU ${item.sku}`} />
          <Card.Content>
            <Text style={styles.bodySmall}>{item.barcode}</Text>
            <Text style={styles.bodyMedium}>
              {formatMoney(item.unitPrice, item.currency)} ×{' '}
              <TextInput
                dense
                keyboardType="decimal-pad"
                value={String(item.quantity)}
                onChangeText={t =>
                  dispatch(
                    updateQuantity({
                      catalogItemId: item.catalogItemId,
                      quantity: Math.max(0.001, parseFloat(t) || 0.001),
                    }),
                  )
                }
                style={styles.qtyInput}
              />{' '}
              = {formatMoney(item.lineTotal, item.currency)}
            </Text>
            <Button onPress={() => dispatch(removeFromCart(item.catalogItemId))}>
              Remove
            </Button>
          </Card.Content>
        </Card>
      ))}

      <View style={styles.footer}>
        <Text style={styles.bodyMedium}>
          Subtotal {formatMoney(subtotal, sessionCurrency)}
        </Text>
        <Text style={styles.bodyMedium}>Discount {discount}</Text>
        <Text style={styles.total}>
          Total {formatMoney(total, sessionCurrency)}
        </Text>
        <Button
          mode="contained"
          loading={processing}
          disabled={processing}
          onPress={() => void submitCheckout()}
          contentStyle={styles.btnInner}>
          {online ? 'Complete sale' : 'Queue offline sale'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  section: {marginTop: 8, marginBottom: 4},
  field: {marginBottom: 8},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  currencyBtn: {flex: 1},
  addBtn: {justifyContent: 'center'},
  btnInner: {minHeight: 48},
  card: {marginBottom: 8},
  qtyInput: {
    minHeight: 40,
    minWidth: 80,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  footer: {paddingVertical: 12, gap: 4},
  sectionTitle: {fontSize: 18, fontWeight: '600'},
  bodySmall: {fontSize: 12},
  bodyMedium: {fontSize: 15},
  total: {fontSize: 22, fontWeight: '700'},
});
