import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  clearCart,
  removeFromCart,
  setBarcodeInput,
  setCustomer,
  setDiscount,
  setLastTransaction,
  setLastReceiptLines,
  setLastCustomerPhone,
  setLastFiscal,
  setPosRegisterCode,
  setProcessing,
  setSessionCurrency,
  updateQuantity,
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
import {usePermission} from '../../hooks/usePermission';
import {postCheckout} from '../../api/pos';
import {queueOfflineCheckout} from '../../services/offlineQueue';
import {
  createLayaway,
  minLayawayDeposit,
} from '../../customers/layawayRepository';
import {formatMoney} from '../../utils/currency';
import {
  cartTotal,
  sumTenderLines,
  validateTendersForTotal,
} from '../../utils/tenderValidation';
import {testIds} from '../../e2e/testIds';
import {
  DEFAULT_RWANDA_VAT,
  summarizeCart,
} from '../../fiscal/vatEngine';
import {submitSaleToEfd} from '../../services/efd';
import {recordFiscalAudit} from '../../fiscal/auditLogRepository';
import {hapticSuccess} from '../../utils/haptics';
import {Badge, Button, Card, Input} from '../../components/ui';
import {colors, spacing} from '../../theme/tokens';
import {textStyles} from '../../theme/typography';
import {PaymentBottomSheet} from './PaymentBottomSheet';

type Nav = NativeStackNavigationProp<PosStackParamList, 'Checkout'>;

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
  const userId = useSelector((s: RootState) => s.auth.userId);
  const locationId = useSelector((s: RootState) => s.location.selectedLocationId);
  const scannerMode = loadHardwareConfig().scannerModeEnabled;
  const canDiscount = usePermission('POS_DISCOUNT');
  const canReturns = usePermission('POS_RETURNS');

  type MomoVerifyState = {
    status: 'idle' | 'pending' | 'ok' | 'fail';
    message?: string;
  };
  const [momoVerify, setMomoVerify] = useState<Record<number, MomoVerifyState>>({});
  const [ussdSecondsLeft, setUssdSecondsLeft] = useState(90);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const isMomoTender = (tt: string) =>
    tt === 'MOMO' || tt === 'AIRTEL_MONEY';

  const hasOpenMomoTender = useMemo(
    () =>
      tenderLines.some(
        l => isMomoTender(l.tenderType) && (l.amount ?? 0) > 0,
      ),
    [tenderLines],
  );

  useEffect(() => {
    if (!hasOpenMomoTender) {
      setUssdSecondsLeft(90);
      return;
    }
    if (ussdSecondsLeft <= 0) {
      Toast.show({type: 'error', text1: t('payments.ussdExpired')});
      return;
    }
    const timer = setInterval(() => setUssdSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(timer);
  }, [hasOpenMomoTender, ussdSecondsLeft, t]);

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
      setPaymentOpen(false);
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

    for (let i = 0; i < tenderLines.length; i++) {
      const line = tenderLines[i];
      if (line.amount > 0 && isMomoTender(line.tenderType)) {
        if (momoVerify[i]?.status !== 'ok') {
          Toast.show({
            type: 'error',
            text1: t('payments.verifyMomo'),
            text2: t('payments.ussdCode'),
          });
          return;
        }
      }
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
        hapticSuccess();
        Toast.show({type: 'success', text1: t('pos.saleCompleted')});
        dispatch(setLastReceiptLines([...cart]));
        dispatch(setLastCustomerPhone(selectedCustomer?.phone ?? null));
        dispatch(clearCart());
        setPaymentOpen(false);
        navigation.navigate('Receipt');
      } else {
        await queueOfflineCheckout(body);
        Toast.show({type: 'info', text1: t('pos.savedOffline')});
        dispatch(setLastReceiptLines([...cart]));
        dispatch(clearCart());
        setPaymentOpen(false);
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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        {canReturns ? (
          <Button variant="secondary" onPress={() => navigation.navigate('Returns')}>
            {t('pos.processReturn')}
          </Button>
        ) : null}

        <Card style={styles.section}>
          <Text style={textStyles.sectionHeader}>{t('pos.registerTender')}</Text>
          <Input
            label={t('pos.registerCode')}
            value={posRegisterCode}
            onChangeText={v => dispatch(setPosRegisterCode(v))}
          />
          <View style={styles.row}>
            <Button
              variant={sessionCurrency === 'FRW' ? 'primary' : 'secondary'}
              onPress={() => dispatch(setSessionCurrency('FRW'))}
              style={styles.halfBtn}>
              FRW
            </Button>
            <Button
              variant={sessionCurrency === 'USD' ? 'primary' : 'secondary'}
              onPress={() => dispatch(setSessionCurrency('USD'))}
              style={styles.halfBtn}>
              USD
            </Button>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={textStyles.sectionHeader}>{t('pos.scanBarcode')}</Text>
          <View style={styles.row}>
            <Input
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
              style={styles.flex}
            />
            <Button
              testID={testIds.checkoutAdd}
              variant="secondary"
              onPress={() => {
                if (barcodeInput.trim()) {
                  void lookupAndAddProduct(barcodeInput.trim());
                  dispatch(setBarcodeInput(''));
                }
              }}>
              {t('common.add')}
            </Button>
          </View>
          <View style={styles.row}>
            <Button
              variant="secondary"
              onPress={() => navigation.navigate('Barcode')}
              style={styles.flex}>
              {t('pos.openScanner')}
            </Button>
            <Button
              variant="secondary"
              onPress={() => navigation.navigate('CatalogSearch')}
              style={styles.flex}>
              {t('pos.searchCatalog', 'Search')}
            </Button>
          </View>
          <Button variant="ghost" onPress={() => navigation.navigate('SaleHistory')}>
            {t('pos.saleHistory', 'Sale history')}
          </Button>
        </Card>

        <Card style={styles.section}>
          <Button
            variant="secondary"
            fullWidth
            onPress={() =>
              navigation.navigate('CustomerLookup', {selectForCheckout: true})
            }>
            {selectedCustomer
              ? `${t('customers.selected')}: ${selectedCustomer.customerName}`
              : t('customers.addCustomerAtCheckout')}
          </Button>
          {selectedCustomer ? (
            <Text style={textStyles.secondary}>
              {t('customers.credit')}: {selectedCustomer.creditBalance} /{' '}
              {selectedCustomer.creditLimit} · {t('customers.loyaltyPoints')}:{' '}
              {selectedCustomer.loyaltyPoints}
            </Text>
          ) : null}
          {promotionLines.map(p => (
            <Badge key={p.id} variant="success">
              {p.name}: {formatMoney(p.amount, sessionCurrency)}
            </Badge>
          ))}
          {selectedCustomer?.loyaltyEnabled ? (
            <Input
              label={t('customers.redeemPoints')}
              keyboardType="number-pad"
              value={loyaltyRedeemPoints ? String(loyaltyRedeemPoints) : ''}
              onChangeText={v =>
                dispatch(setLoyaltyRedeemPoints(parseInt(v, 10) || 0))
              }
            />
          ) : null}
          {canDiscount ? (
            <Input
              label={t('pos.discount')}
              keyboardType="decimal-pad"
              value={discount ? String(discount) : ''}
              onChangeText={v => dispatch(setDiscount(parseFloat(v) || 0))}
            />
          ) : null}
        </Card>

        <Text style={textStyles.sectionHeader}>{t('pos.cart')}</Text>
        {cart.length === 0 ? (
          <Card>
            <Text style={textStyles.secondary}>{t('pos.cartEmpty')}</Text>
          </Card>
        ) : null}
        {cart.map(item => {
          const lineKey = item.variantId ?? item.catalogItemId;
          return (
            <Card key={`${lineKey}-${item.serialNumber ?? ''}`} style={styles.cartCard}>
              <Text style={textStyles.body}>{item.name}</Text>
              <Text style={textStyles.secondary}>
                {item.variantLabel
                  ? `${item.variantLabel} · ${item.sku}`
                  : `SKU ${item.sku}`}
              </Text>
              <Text style={textStyles.caption}>{item.barcode}</Text>
              {item.requiresSerial ? (
                <Input
                  label={t('inventory.serialNumber')}
                  value={item.serialNumber ?? ''}
                  onChangeText={v =>
                    dispatch(setCartLineSerial({lineKey, serialNumber: v}))
                  }
                />
              ) : null}
              {item.variantId && !item.batchNumber ? (
                <Button
                  variant="ghost"
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
              <View style={styles.qtyRow}>
                <Text style={textStyles.body}>
                  {formatMoney(item.unitPrice, item.currency)} ×
                </Text>
                <Input
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
                />
                <Text style={textStyles.amount}>
                  {formatMoney(item.lineTotal, item.currency)}
                </Text>
              </View>
              <Button variant="ghost" onPress={() => dispatch(removeFromCart(lineKey))}>
                {t('common.remove')}
              </Button>
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.payBar}>
        <View>
          <Text style={textStyles.caption}>{t('pos.total')}</Text>
          <Text style={textStyles.amountLg}>
            {formatMoney(total, sessionCurrency)}
          </Text>
          <Text style={textStyles.caption}>
            {taxExempt
              ? t('fiscal.vatExempt', 'VAT: exempt')
              : `${t('fiscal.vat', 'VAT')} ${formatMoney(vatSummary.totalVat, sessionCurrency)}`}
          </Text>
        </View>
        <Button
          testID={testIds.checkoutComplete}
          disabled={cart.length === 0}
          onPress={() => setPaymentOpen(true)}
          style={styles.payBtn}>
          {online ? t('pos.completeSale') : t('pos.queueOfflineSale')}
        </Button>
      </View>

      <PaymentBottomSheet
        visible={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        total={total}
        sessionCurrency={sessionCurrency}
        processing={processing}
        onComplete={() => void submitCheckout()}
        onLayaway={() => void submitLayaway()}
        showLayaway={Boolean(selectedCustomer && cart.length > 0)}
        completeLabel={online ? t('pos.completeSale') : t('pos.queueOfflineSale')}
        momoVerify={momoVerify}
        setMomoVerify={setMomoVerify}
        ussdSecondsLeft={ussdSecondsLeft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  scroll: {
    padding: spacing[3],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  section: {
    gap: spacing[3],
  },
  cartCard: {
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    minWidth: 120,
  },
  halfBtn: {
    flex: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  qtyInput: {
    flex: 0,
    minWidth: 72,
  },
  payBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    padding: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  payBtn: {
    minWidth: 140,
  },
});
