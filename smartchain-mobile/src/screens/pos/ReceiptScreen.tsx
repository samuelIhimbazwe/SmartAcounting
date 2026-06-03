import React, {useEffect, useMemo} from 'react';
import {Platform, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
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
import {Button, Card} from '../../components/ui';
import {colors, spacing} from '../../theme/tokens';
import {textStyles} from '../../theme/typography';

export default function ReceiptScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={40} color={colors.white} />
          </View>
          <Text style={textStyles.screenTitle}>{t('pos.saleCompleted')}</Text>
          <Text style={textStyles.amountLg}>
            {formatMoney(total, sessionCurrency)}
          </Text>
          <Text style={textStyles.secondary}>{t('receipt.title')}</Text>
          <Text selectable style={[textStyles.caption, styles.mono]}>
            {txId ?? '—'}
          </Text>
        </View>

        <Card style={styles.details}>
          <Text style={textStyles.sectionHeader}>{t('fiscal.subtotalExVat')}</Text>
          <Text style={textStyles.amount}>
            {formatMoney(netAmount, sessionCurrency)}
          </Text>
          <Text style={textStyles.sectionHeader}>
            {taxExempt ? t('fiscal.vatExempt') : t('fiscal.vat')}
          </Text>
          <Text style={textStyles.amount}>
            {taxExempt ? '0' : formatMoney(vatAmount, sessionCurrency)}
          </Text>
          {fiscalSignature ? (
            <>
              <Text style={textStyles.sectionHeader}>{t('fiscal.signature')}</Text>
              <Text selectable style={[textStyles.caption, styles.mono]}>
                {fiscalSignature}
              </Text>
            </>
          ) : null}
          {fiscalQrData ? (
            <View style={styles.qrBox}>
              <Text style={textStyles.body}>{t('fiscal.rraLogo')}</Text>
              <QRCode value={fiscalQrData} size={96} />
            </View>
          ) : null}
        </Card>

        <Button
          testID={testIds.receiptPrint}
          fullWidth
          disabled={!txId}
          onPress={() => void onPrint()}
          accessibilityLabel={
            Platform.OS === 'ios' ? t('receipt.airPrint') : t('receipt.print')
          }>
          {Platform.OS === 'ios' ? t('receipt.airPrint') : t('receipt.print')}
        </Button>
        {showWhatsApp ? (
          <Button
            fullWidth
            variant="secondary"
            disabled={!txId}
            onPress={() => void sendWhatsApp()}>
            {t('receiptDelivery.whatsapp')}
          </Button>
        ) : null}
        {Platform.OS === 'ios' ? (
          <Button
            fullWidth
            variant="secondary"
            disabled={!txId}
            onPress={() => void onShare()}>
            {t('receipt.shareIos')}
          </Button>
        ) : null}
        <Button
          fullWidth
          variant="ghost"
          onPress={() => navigation.goBack()}>
          {t('common.done', 'Done')}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing[4],
    gap: spacing[3],
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  details: {
    gap: spacing[2],
  },
  mono: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  qrBox: {
    marginTop: spacing[2],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    alignItems: 'center',
    gap: spacing[2],
  },
});
