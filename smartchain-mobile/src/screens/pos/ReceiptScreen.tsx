import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-paper';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {printReceiptWithAlert} from '../../services/printing';

export default function ReceiptScreen() {
  const txId = useSelector((s: RootState) => s.pos.lastTransactionId);

  const onPrint = async () => {
    if (!txId) {
      return;
    }
    await printReceiptWithAlert(txId);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Last transaction</Text>
      <Text selectable style={styles.mono}>
        {txId ?? '—'}
      </Text>
      <Button
        mode="contained"
        disabled={!txId}
        onPress={() => void onPrint()}
        contentStyle={styles.btnInner}>
        Print receipt
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  wrap: {flex: 1, padding: 16, gap: 12},
  mono: {fontFamily: 'monospace'},
  btnInner: {minHeight: 48},
});
