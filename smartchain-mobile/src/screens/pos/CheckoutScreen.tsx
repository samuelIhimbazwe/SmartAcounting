import React, {useCallback, useEffect, useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Card, TextInput} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  addTenderLine,
  clearCart,
  removeFromCart,
  removeTenderLine,
  setBarcodeInput,
  setCustomer,
  setDiscount,
  setLastTransaction,
  setLastReceiptLines,
  setLastFiscal,
  setPosRegisterCode,
  setProcessing,
  setSessionCurrency,
  updateQuantity,
  updateTenderLine,
  setTenderLineType,
  setCartLineSerial,
  setCartLineBatch,
  setPromotionResult,
  setLoyaltyRedeemPoints,
} from '../../store/slices/posSlice';
import {evaluatePromotions} from '../../pricing/promotionEngine';
import {discountFromRedeemPoints} from '../../pricing/loyalty';
import {
  consumeBatchQty,
  markSerialSold,
  pickCheckoutBatch,
} from '../../inventory/inventoryRepository';
import type {PosStackParamList} from '../../navigation/PosNavigator';
import {useBarcode} from '../../hooks/useBarcode';
import {useScannerBarcode} from '../../hooks/useScannerBarcode';
import {loadHardwareConfig} from '../../hardware/printerConfig';
import {
  openCashDrawer,
  shouldKickCashDrawer,
} from '../../services/printing';
import {poleDisplayService} from '../../services/printer/PoleDisplayService';
import {useWakeLock} from '../../hooks/useWakeLock';
import {postCheckout} from '../../api/pos';
import {queueOfflineCheckout} from '../../services/offlineQueue';
import {
  createLayaway,
  minLayawayDeposit,
} from '../../customers/layawayRepository';
import {formatMoney} from '../../utils/currency';
import type {AppRole} from '../../utils/roles';
import {canUseOnAccountTender} from '../../utils/roles';
import {
  cartTotal,
  sumTenderLines,
  validateTendersForTotal,
  type TenderType,
} from '../../utils/tenderValidation';
import {testIds} from '../../e2e/testIds';
import {
  DEFAULT_RWANDA_VAT,
  summarizeCart,
} from '../../fiscal/vatEngine';
import {submitSaleToEfd} from '../../services/efd';
import {recordFiscalAudit} from '../../fiscal/auditLogRepository';

type Nav = NativeStackNavigationProp<PosStackParamList, 'Checkout'>;

const BASE_TENDERS: TenderType[] = ['CASH', 'MOMO', 'AIRTEL_MONEY', 'CARD'];

export default function CheckoutScreen() {
  useWakeLock();
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const {lookupAndAddProduct} = useBarcode();

  const cart = useSelector((s: RootState) => s.pos.cart);
  const discount = useSelector((s: RootState) => s.pos.discount);
  const promotionDiscount = useSelector((s: RootState) => s.pos.promotionDiscount);
  const promotionLines = useSelector((s: RootState) => s.pos.promotionLines);
  const loyaltyRedeemPoints = useSelector((s: RootState) => s.pos.loyaltyRedeemPoints);
  const selectedCustomer = useSelector((s: RootState) => s.pos.selectedCustomer);
  const sessionCurrency = useSelector((s: RootState) => s.pos.sessionCurrency);
  const customerName = useSelector((s: RootState) => s.pos.customerName);
  const posRegisterCode = useSelector((s: RootState) => s.pos.posRegisterCode);
  const barcodeInput = useSelector((s: RootState) => s.pos.barcodeInput);
  const processing = useSelector((s: RootState) => s.pos.isProcessing);
  const tenderLines = useSelector((s: RootState) => s.pos.tenderLines);
  const online = useSelector((s: RootState) => s.network.online);
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const userId = useSelector((s: RootState) => s.auth.userId);
  const locationId = useSelector((s: RootState) => s.location.selectedLocationId);
  const scannerMode = loadHardwareConfig().scannerModeEnabled;

  const onScan = useCallback(
    (code: string) => {
      void lookupAndAddProduct(code);
      dispatch(setBarcodeInput(''));
    },
    [dispatch, lookupAndAddProduct],
  );

  const {
    inputRef: scannerInputRef,
    onChangeText: scannerOnChange,
    onSubmitEditing: scannerOnSubmit,
  } = useScannerBarcode(scannerMode, onScan);

  useFocusEffect(
    useCallback(() => {
      void poleDisplayService.welcome(loadHardwareConfig().storeDisplayName);
    }, []),
  );

  const showOnAccount =
    canUseOnAccountTender(roles) && (selectedCustomer?.creditLimit ?? 0) > 0;
  const tenderOptions = showOnAccount
    ? [...BASE_TENDERS, 'ON_ACCOUNT' as TenderType]
    : BASE_TENDERS;

  useEffect(() => {
    void evaluatePromotions(cart).then(r =>
      dispatch(setPromotionResult({lines: r.lines, totalDiscount: r.totalDiscount})),
    );
  }, [cart, dispatch]);

  const loyaltyDiscount = useMemo(
    () => discountFromRedeemPoints(loyaltyRedeemPoints),
    [loyaltyRedeemPoints],
  );

  const subtotal = useMemo(
    () => cart.reduce((a, b) => a + b.lineTotal, 0),
    [cart],
  );
  const total = useMemo(
    () => cartTotal(subtotal, discount + promotionDiscount + loyaltyDiscount),
    [subtotal, discount, promotionDiscount, loyaltyDiscount],
  );
  const tenderSum = useMemo(() => sumTenderLines(tenderLines), [tenderLines]);
  const taxExempt = selectedCustomer?.taxExempt ?? false;
  const vatSummary = useMemo(
    () =>
      summarizeCart(
        cart.map(c => c.lineTotal),
        DEFAULT_RWANDA_VAT,
        taxExempt,
      ),
    [cart, taxExempt],
  );

  const tenderLabel = (type: TenderType) => {
    const map: Record<TenderType, string> = {
      CASH: t('pos.tenderCash'),
      MOMO: t('pos.tenderMomo'),
      AIRTEL_MONEY: t('pos.tenderAirtel'),
      CARD: t('pos.tenderCard'),
      ON_ACCOUNT: t('pos.tenderOnAccount'),
    };
    return map[type];
  };

  const submitLayaway = async () => {
    if (!selectedCustomer) {
      Toast.show({type: 'error', text1: t('customers.selectForLayaway')});
      return;
    }
    if (cart.length === 0) {
      Toast.show({type: 'error', text1: t('pos.cartEmpty')});
      return;
    }
    const minDeposit = minLayawayDeposit(total);
    if (tenderSum + 0.001 < minDeposit) {
      Toast.show({
        type: 'error',
        text1: t('customers.layawayMinDeposit'),
        text2: String(minDeposit),
      });
      return;
    }
    try {
      dispatch(setProcessing(true));
      await createLayaway({
        customerId: selectedCustomer.customerId,
        currencyCode: sessionCurrency,
        cartJson: JSON.stringify(cart),
        totalAmount: total,
        depositAmount: tenderSum,
      });
      Toast.show({type: 'success', text1: t('customers.layawayCreated')});
      dispatch(clearCart());
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: t('customers.layawayCreateFailed'),
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      dispatch(setProcessing(false));
    }
  };

  const submitCheckout = async () => {
    if (cart.length === 0) {
      Toast.show({type: 'error', text1: t('pos.cartEmpty')});
      return;
    }

    const validation = validateTendersForTotal(tenderLines, total);
    if (!validation.ok) {
      Toast.show({
        type: 'error',
        text1:
          validation.error === 'underpaid'
            ? t('pos.tenderUnderpaid')
            : t('pos.cartEmpty'),
      });
      return;
    }

    for (const item of cart) {
      if (item.requiresSerial && !item.serialNumber?.trim()) {
        Toast.show({type: 'error', text1: t('inventory.serialRequired')});
        return;
      }
    }

    const hasOnAccount = tenderLines.some(l => l.tenderType === 'ON_ACCOUNT');
    if (hasOnAccount && !selectedCustomer) {
      Toast.show({type: 'error', text1: t('customers.selectForOnAccount')});
      return;
    }
    const lines = cart.map(i => ({
      barcode: i.barcode,
      quantity: Math.max(0.001, Number(i.quantity.toFixed(4))),
      variantId: i.variantId,
      productId: i.productId,
      serialNumber: i.serialNumber,
      batchNumber: i.batchNumber,
    }));
    const body = {
      customerName: customerName?.trim() || null,
      customerId: selectedCustomer?.serverId ?? selectedCustomer?.customerId ?? null,
      currencyCode: sessionCurrency,
      posRegisterCode,
      lines,
      tenders: tenderLines
        .filter(l => l.amount > 0)
        .map(l => ({
          tenderType: l.tenderType,
          amount: Number(l.amount.toFixed(2)),
          reference: l.reference ?? null,
        })),
      onAccountCustomerName: hasOnAccount ? customerName?.trim() || null : null,
      managerOverride: hasOnAccount,
      loyaltyPointsRedeemed: loyaltyRedeemPoints > 0 ? loyaltyRedeemPoints : null,
      saleType: 'NORMAL',
    };

    try {
      dispatch(setProcessing(true));
      if (online) {
        const res = await postCheckout(body);
        const sid = res?.salesOrderId;
        if (sid != null) {
          const orderId = String(sid);
          dispatch(setLastTransaction(orderId));
          const netAmount = Number(res?.netAmount ?? vatSummary.subtotalExVat);
          const vatAmount = Number(res?.vatAmount ?? vatSummary.totalVat);
          const fiscalSignature = res?.fiscalSignature
            ? String(res.fiscalSignature)
            : undefined;
          const fiscalQrData = res?.fiscalQrData
            ? String(res.fiscalQrData)
            : undefined;
          const efd = await submitSaleToEfd(
            {
              salesOrderId: orderId,
              grossAmount: total,
              vatAmount,
              currencyCode: sessionCurrency,
              taxExempt,
              lines: cart.map(c => ({
                name: c.name,
                qty: c.quantity,
                unitPrice: c.unitPrice,
                vat: 0,
              })),
            },
            true,
          );
          await recordFiscalAudit({
            entityType: 'SALE',
            entityId: orderId,
            action: 'POS_CHECKOUT',
            actorId: userId ?? 'unknown',
          });
          dispatch(
            setLastFiscal({
              fiscalSignature:
                fiscalSignature ?? efd.fiscalSignature ?? null,
              fiscalQrData: fiscalQrData ?? efd.fiscalQrData ?? null,
              netAmount,
              vatAmount,
              taxExempt,
            }),
          );
        }
        for (const item of cart) {
          if (item.variantId && item.batchNumber) {
            await consumeBatchQty(item.variantId, item.batchNumber, item.quantity);
          }
          if (item.serialNumber && item.variantId) {
            await markSerialSold(item.serialNumber, String(sid ?? Date.now()));
          }
        }
        if (shouldKickCashDrawer(tenderLines)) {
          void openCashDrawer(locationId).catch(() => undefined);
        }
        void poleDisplayService.total(formatMoney(total, sessionCurrency));
        const change = Math.max(0, tenderSum - total);
        void poleDisplayService.thankYou(
          formatMoney(change, sessionCurrency),
        );
        Toast.show({type: 'success', text1: t('pos.saleCompleted')});
        dispatch(setLastReceiptLines([...cart]));
        dispatch(clearCart());
        navigation.navigate('Receipt');
      } else {
        await queueOfflineCheckout(body);
        Toast.show({type: 'info', text1: t('pos.savedOffline')});
        dispatch(setLastReceiptLines([...cart]));
        dispatch(clearCart());
      }
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: t('pos.checkoutFailed'),
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
        {t('pos.processReturn')}
      </Button>
      <Text style={[styles.section, styles.sectionTitle]}>
        {t('pos.registerTender')}
      </Text>
      <TextInput
        label={t('pos.registerCode')}
        value={posRegisterCode}
        onChangeText={v => dispatch(setPosRegisterCode(v))}
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

      <Text style={[styles.section, styles.sectionTitle]}>
        {t('pos.paymentMethod')}
      </Text>
      {tenderLines.map((line, index) => (
        <View key={`${line.tenderType}-${index}`} style={styles.tenderRow}>
          <View style={styles.tenderChips}>
            {tenderOptions.map(tt => (
              <Button
                key={tt}
                compact
                testID={tt === 'CASH' ? testIds.checkoutTenderCash : undefined}
                mode={line.tenderType === tt ? 'contained' : 'outlined'}
                onPress={() =>
                  dispatch(setTenderLineType({index, tenderType: tt}))
                }
                style={styles.chipBtn}
                contentStyle={styles.btnInner}>
                {tenderLabel(tt)}
              </Button>
            ))}
          </View>
          <TextInput
            label={t('pos.tenderAmount')}
            keyboardType="decimal-pad"
            value={line.amount ? String(line.amount) : ''}
            onChangeText={v =>
              dispatch(
                updateTenderLine({
                  index,
                  amount: parseFloat(v) || 0,
                }),
              )
            }
            style={styles.field}
          />
          {tenderLines.length > 1 ? (
            <Button onPress={() => dispatch(removeTenderLine(index))}>
              {t('pos.removeTenderLine')}
            </Button>
          ) : null}
        </View>
      ))}
      <View style={styles.row}>
        {tenderOptions.map(tt => {
          const used = tenderLines.some(l => l.tenderType === tt);
          if (used) {
            return null;
          }
          return (
            <Button
              key={tt}
              mode="outlined"
              onPress={() => dispatch(addTenderLine(tt))}
              style={styles.currencyBtn}
              contentStyle={styles.btnInner}>
              + {tenderLabel(tt)}
            </Button>
          );
        })}
      </View>
      <Text style={styles.bodyMedium}>
        {t('pos.tenderTotal')}: {formatMoney(tenderSum, sessionCurrency)} /{' '}
        {t('pos.saleTotal')}: {formatMoney(total, sessionCurrency)}
      </Text>

      <Button
        mode="outlined"
        onPress={() => navigation.navigate('CustomerLookup', {selectForCheckout: true})}
        style={styles.field}>
        {selectedCustomer
          ? `${t('customers.selected')}: ${selectedCustomer.customerName}`
          : t('customers.addCustomerAtCheckout')}
      </Button>
      {selectedCustomer ? (
        <Text style={styles.bodySmall}>
          {t('customers.credit')}: {selectedCustomer.creditBalance} /{' '}
          {selectedCustomer.creditLimit} · {t('customers.loyaltyPoints')}:{' '}
          {selectedCustomer.loyaltyPoints}
        </Text>
      ) : null}
      {promotionLines.map(p => (
        <Text key={p.id} style={styles.promo}>
          {p.name}: {formatMoney(p.amount, sessionCurrency)}
        </Text>
      ))}
      {selectedCustomer?.loyaltyEnabled ? (
        <TextInput
          label={t('customers.redeemPoints')}
          keyboardType="number-pad"
          value={loyaltyRedeemPoints ? String(loyaltyRedeemPoints) : ''}
          onChangeText={v =>
            dispatch(setLoyaltyRedeemPoints(parseInt(v, 10) || 0))
          }
          style={styles.field}
        />
      ) : null}
      <TextInput
        label={t('pos.discount')}
        keyboardType="decimal-pad"
        value={discount ? String(discount) : ''}
        onChangeText={v => dispatch(setDiscount(parseFloat(v) || 0))}
        style={styles.field}
      />
      <Text style={[styles.section, styles.sectionTitle]}>
        {t('pos.scanBarcode')}
      </Text>
      <View style={styles.row}>
        <TextInput
          testID={testIds.checkoutBarcode}
          ref={scannerMode ? scannerInputRef : undefined}
          label={t('pos.barcode')}
          value={barcodeInput}
          onChangeText={v => {
            dispatch(setBarcodeInput(v));
            if (scannerMode) {
              scannerOnChange(v);
            }
          }}
          style={[styles.field, {flex: 1}]}
          showSoftInputOnFocus={!scannerMode}
          autoFocus={scannerMode}
          onSubmitEditing={() => {
            if (scannerMode) {
              scannerOnSubmit();
              return;
            }
            if (barcodeInput.trim()) {
              void lookupAndAddProduct(barcodeInput.trim());
              dispatch(setBarcodeInput(''));
            }
          }}
        />
        <Button
          testID={testIds.checkoutAdd}
          mode="contained-tonal"
          onPress={() => {
            if (barcodeInput.trim()) {
              void lookupAndAddProduct(barcodeInput.trim());
              dispatch(setBarcodeInput(''));
            }
          }}
          style={styles.addBtn}
          contentStyle={styles.btnInner}>
          {t('common.add')}
        </Button>
      </View>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Barcode')}
        style={styles.field}
        contentStyle={styles.btnInner}>
        {t('pos.openScanner')}
      </Button>

      <Text style={[styles.section, styles.sectionTitle]}>{t('pos.cart')}</Text>
      {cart.map(item => {
        const lineKey = item.variantId ?? item.catalogItemId;
        return (
        <Card key={`${lineKey}-${item.serialNumber ?? ''}`} style={styles.card}>
          <Card.Title
            title={item.name}
            subtitle={
              item.variantLabel
                ? `${item.variantLabel} · ${item.sku}`
                : `SKU ${item.sku}`
            }
          />
          <Card.Content>
            <Text style={styles.bodySmall}>{item.barcode}</Text>
            {item.uomLabel ? (
              <Text style={styles.bodySmall}>{t('inventory.uom')}: {item.uomLabel}</Text>
            ) : null}
            {item.batchNumber ? (
              <Text style={styles.bodySmall}>
                {t('inventory.batch')}: {item.batchNumber}
                {item.batchExpiry ? ` · ${item.batchExpiry}` : ''}
              </Text>
            ) : null}
            {item.requiresSerial ? (
              <TextInput
                label={t('inventory.serialNumber')}
                value={item.serialNumber ?? ''}
                onChangeText={v =>
                  dispatch(setCartLineSerial({lineKey, serialNumber: v}))
                }
                style={styles.field}
              />
            ) : null}
            {item.variantId && !item.batchNumber ? (
              <Button
                compact
                onPress={async () => {
                  const pick = await pickCheckoutBatch(item.variantId!, item.quantity);
                  if (pick) {
                    dispatch(
                      setCartLineBatch({
                        lineKey,
                        batchNumber: pick.batchNumber,
                        batchExpiry: pick.expiryDate,
                      }),
                    );
                  }
                }}>
                {t('inventory.applyFefoBatch')}
              </Button>
            ) : null}
            {item.variantId ? (
              <TextInput
                label={t('inventory.batchOverride')}
                value={item.batchNumber ?? ''}
                onChangeText={v =>
                  dispatch(
                    setCartLineBatch({
                      lineKey,
                      batchNumber: v,
                      batchExpiry: item.batchExpiry,
                    }),
                  )
                }
                style={styles.field}
              />
            ) : null}
            <Text style={styles.bodyMedium}>
              {formatMoney(item.unitPrice, item.currency)} ×{' '}
              <TextInput
                dense
                keyboardType="decimal-pad"
                value={String(item.quantity)}
                onChangeText={v =>
                  dispatch(
                    updateQuantity({
                      catalogItemId: item.catalogItemId,
                      quantity: Math.max(0.001, parseFloat(v) || 0.001),
                    }),
                  )
                }
                style={styles.qtyInput}
              />{' '}
              = {formatMoney(item.lineTotal, item.currency)}
            </Text>
            <Button onPress={() => dispatch(removeFromCart(lineKey))}>
              {t('common.remove')}
            </Button>
          </Card.Content>
        </Card>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.bodyMedium}>
          {t('pos.subtotal')} {formatMoney(subtotal, sessionCurrency)}
        </Text>
        <Text style={styles.bodyMedium}>
          {t('fiscal.subtotalExVat', 'Subtotal (ex VAT)')}{' '}
          {formatMoney(vatSummary.subtotalExVat, sessionCurrency)}
        </Text>
        <Text style={styles.bodyMedium}>
          {taxExempt
            ? t('fiscal.vatExempt', 'VAT: exempt')
            : `${t('fiscal.vat', 'VAT')} ${formatMoney(vatSummary.totalVat, sessionCurrency)}`}
        </Text>
        <Text style={styles.bodyMedium}>
          {t('pos.discount')} {discount}
        </Text>
        <Text style={styles.total}>
          {t('pos.total')} {formatMoney(total, sessionCurrency)}
        </Text>
        <Button
          testID={testIds.checkoutComplete}
          mode="contained"
          loading={processing}
          disabled={processing || tenderSum + 0.001 < total}
          onPress={() => void submitCheckout()}
          contentStyle={styles.btnInner}
          accessibilityLabel={t('pos.completeSale')}>
          {online ? t('pos.completeSale') : t('pos.queueOfflineSale')}
        </Button>
        {selectedCustomer && cart.length > 0 ? (
          <Button
            mode="outlined"
            loading={processing}
            disabled={processing}
            onPress={() => void submitLayaway()}
            contentStyle={styles.btnInner}>
            {t('customers.createLayaway')}
          </Button>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  section: {marginTop: 8, marginBottom: 4},
  field: {marginBottom: 8},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  currencyBtn: {flex: 1, minWidth: 80},
  chipBtn: {marginRight: 4, marginBottom: 4},
  tenderRow: {marginBottom: 12},
  tenderChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8},
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
  promo: {fontSize: 13, color: '#059669'},
  bodyMedium: {fontSize: 15},
  total: {fontSize: 22, fontWeight: '700'},
});
