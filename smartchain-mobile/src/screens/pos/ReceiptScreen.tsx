import React from 'react';
import {Platform, Share, StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {printReceiptWithAlert} from '../../services/printing';
import {testIds} from '../../e2e/testIds';

export default function ReceiptScreen() {
  const {t} = useTranslation();
  const txId = useSelector((s: RootState) => s.pos.lastTransactionId);
  const receiptLines = useSelector((s: RootState) => s.pos.lastReceiptLines);

  const onPrint = async () => {
    if (!txId) {
      return;
    }
    await printReceiptWithAlert(txId, receiptLines);
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('receipt.title')}</Text>
      <Text selectable style={styles.mono}>
        {txId ?? '—'}
      </Text>
      <Button
        testID={testIds.receiptPrint}
        mode="contained"
        disabled={!txId}
        onPress={() => void onPrint()}
        contentStyle={styles.btnInner}
        accessibilityLabel={t('receipt.print')}>
        {t('receipt.print')}
      </Button>
      {Platform.OS === 'ios' ? (
        <Button
          mode="outlined"
          disabled={!txId}
          onPress={() => void onShare()}
          contentStyle={styles.btnInner}>
          {t('receipt.shareIos')}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  wrap: {flex: 1, padding: 16, gap: 12},
  mono: {fontFamily: 'monospace'},
  btnInner: {minHeight: 48},
});
