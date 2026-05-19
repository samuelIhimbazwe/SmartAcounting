import React, {useEffect, useMemo} from 'react';
import {Platform, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';
import type {RootState} from '../../store';
import {printReceiptWithAlert} from '../../services/printing';
import {testIds} from '../../e2e/testIds';
import {formatMoney} from '../../utils/currency';
import {loadHardwareConfig} from '../../hardware/printerConfig';
import {
  buildReceiptMessage,
  deliverReceipt,
} from '../../api/receiptDelivery';
import {loadReceiptDeliveryConfig} from '../../services/receiptDeliveryConfig';

export default function ReceiptScreen() {
  const {t} = useTranslation();
  const txId = useSelector((s: RootState) => s.pos.lastTransactionId);
  const receiptLines = useSelector((s: RootState) => s.pos.lastReceiptLines);
  const fiscalSignature = useSelector((s: RootState) => s.pos.lastFiscalSignature);
  const fiscalQrData = useSelector((s: RootState) => s.pos.lastFiscalQrData);
  const netAmount = useSelector((s: RootState) => s.pos.lastNetAmount);
  const vatAmount = useSelector((s: RootState) => s.pos.lastVatAmount);
  const taxExempt = useSelector((s: RootState) => s.pos.lastTaxExempt);
  const sessionCurrency = useSelector((s: RootState) => s.pos.sessionCurrency);
  const locationId = useSelector((s: RootState) => s.location.selectedLocationId);
  const customerPhone = useSelector((s: RootState) => s.pos.lastCustomerPhone);

  const total = useMemo(
    () => receiptLines.reduce((a, l) => a + l.lineTotal, 0),
    [receiptLines],
  );

  const htmlExtras = useMemo(
    () => ({
      netAmount,
      vatAmount,
      taxExempt,
      currency: sessionCurrency,
      fiscalSignature,
      storeName: loadHardwareConfig().storeDisplayName,
    }),
    [netAmount, vatAmount, taxExempt, sessionCurrency, fiscalSignature],
  );

  const sendWhatsApp = async (channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP') => {
    if (!txId || !customerPhone?.trim()) {
      return;
    }
    const cfg = loadReceiptDeliveryConfig();
    if (!cfg.whatsappEnabled && channel === 'WHATSAPP') {
      return;
    }
    try {
      const message = buildReceiptMessage(
        txId,
        receiptLines,
        total,
        sessionCurrency,
      );
      const res = await deliverReceipt({
        salesOrderId: txId,
        phone: customerPhone.trim(),
        channel,
        message,
      });
      if (res.ok) {
        Toast.show({type: 'success', text1: t('receiptDelivery.whatsappSent')});
      } else {
        if (channel === 'WHATSAPP') {
          await sendWhatsApp('SMS');
          return;
        }
        Toast.show({type: 'error', text1: t('receiptDelivery.whatsappFailed')});
      }
    } catch {
      Toast.show({type: 'error', text1: t('receiptDelivery.whatsappFailed')});
    }
  };

  useEffect(() => {
    if (!txId || !customerPhone?.trim()) {
      return;
    }
    const cfg = loadReceiptDeliveryConfig();
    if (cfg.mode === 'always' && cfg.whatsappEnabled) {
      void sendWhatsApp();
    }
  }, [txId, customerPhone]);

  const onPrint = async () => {
    if (!txId) {
      return;
    }
    await printReceiptWithAlert(txId, receiptLines, htmlExtras, locationId);
  };

  const onShare = async () => {
    if (!txId) {
      return;
    }
    await Share.share({
      title: t('receipt.title'),
      message: `${t('receipt.title')}: ${txId}`,
    });
  };

  const showWhatsApp =
    !!customerPhone?.trim() && loadReceiptDeliveryConfig().whatsappEnabled;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{t('receipt.title')}</Text>
      <Text selectable style={styles.mono}>
        {txId ?? '—'}
      </Text>
      <Text style={styles.label}>{t('fiscal.subtotalExVat')}</Text>
      <Text style={styles.value}>
        {formatMoney(netAmount, sessionCurrency)}
      </Text>
      <Text style={styles.label}>
        {taxExempt ? t('fiscal.vatExempt') : t('fiscal.vat')}
      </Text>
      <Text style={styles.value}>
        {taxExempt ? '0' : formatMoney(vatAmount, sessionCurrency)}
      </Text>
      {fiscalSignature ? (
        <>
          <Text style={styles.label}>{t('fiscal.signature')}</Text>
          <Text selectable style={styles.monoSmall}>
            {fiscalSignature}
          </Text>
        </>
      ) : null}
      {fiscalQrData ? (
        <View style={styles.qrBox}>
          <Text style={styles.rraLogo}>{t('fiscal.rraLogo')}</Text>
          <QRCode value={fiscalQrData} size={80} />
        </View>
      ) : null}
      <Button
        testID={testIds.receiptPrint}
        mode="contained"
        disabled={!txId}
        onPress={() => void onPrint()}
        contentStyle={styles.btnInner}
        accessibilityLabel={
          Platform.OS === 'ios' ? t('receipt.airPrint') : t('receipt.print')
        }>
        {Platform.OS === 'ios' ? t('receipt.airPrint') : t('receipt.print')}
      </Button>
      {showWhatsApp ? (
        <Button
          mode="outlined"
          icon="whatsapp"
          disabled={!txId}
          onPress={() => void sendWhatsApp()}
          contentStyle={styles.btnInner}>
          {t('receiptDelivery.whatsapp')}
        </Button>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Button
          mode="outlined"
          disabled={!txId}
          onPress={() => void onShare()}
          contentStyle={styles.btnInner}>
          {t('receipt.shareIos')}
        </Button>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  wrap: {flexGrow: 1, padding: 16, gap: 12},
  mono: {fontFamily: 'monospace'},
  monoSmall: {fontFamily: 'monospace', fontSize: 11},
  label: {fontSize: 13, color: '#6B7280', marginTop: 8},
  value: {fontSize: 16, fontWeight: '600'},
  qrBox: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  rraLogo: {fontWeight: '700', marginBottom: 8},
  btnInner: {minHeight: 48},
});
