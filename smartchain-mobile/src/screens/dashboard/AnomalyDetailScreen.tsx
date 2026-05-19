import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import type {DashboardStackParamList} from '../../navigation/DashboardNavigator';
import {escalateAnomalyAlert, reviewAnomalyAlert} from '../../api/anomaly';

type Route = RouteProp<DashboardStackParamList, 'AnomalyDetail'>;

const ANOMALY_COPY: Record<string, {title: string; detail: string; action: string}> = {
  void_spike: {
    title: 'Void spike',
    detail: 'Void transactions exceeded the rolling baseline for this register.',
    action: 'Review voided tickets and confirm manager authorisation.',
  },
  discount_abuse: {
    title: 'Discount abuse',
    detail: 'Discount rate on this shift is above policy threshold.',
    action: 'Audit discount lines and retrain cashier if needed.',
  },
  unusual_return: {
    title: 'Unusual return',
    detail: 'Return volume is higher than expected for the period.',
    action: 'Inspect return reasons and linked original sales.',
  },
  stock_discrepancy: {
    title: 'Stock discrepancy',
    detail: 'Physical count differs from system on-hand for one or more SKUs.',
    action: 'Schedule a stock count and post adjustments.',
  },
  cashier_performance: {
    title: 'Cashier performance',
    detail: 'Sales velocity or tender mix deviates from peer baseline.',
    action: 'Review shift summary with the cashier.',
  },
  revenue_drop: {
    title: 'Revenue drop',
    detail: 'Revenue for the window is below forecast.',
    action: 'Check foot traffic, pricing, and stock availability.',
  },
};

export default function AnomalyDetailScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const alert = route.params.alert;
  const [busy, setBusy] = useState(false);
  const type = String(alert.anomalyType ?? alert.type ?? 'unknown').toLowerCase();
  const copy = ANOMALY_COPY[type] ?? {
    title: type,
    detail: String(alert.message ?? alert.summary ?? ''),
    action: t('intelligence.reviewTransactions'),
  };
  const txs = (alert.affectedTransactions as unknown[]) ?? alert.transactions ?? [];

  const markReviewed = async () => {
    setBusy(true);
    try {
      const res = await reviewAnomalyAlert(alert);
      Toast.show({
        type: 'success',
        text1: t('intelligence.markReviewed'),
        text2: res.anomalyCaseId,
      });
      navigation.goBack();
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : t('common.error'),
      });
    } finally {
      setBusy(false);
    }
  };

  const escalate = async () => {
    setBusy(true);
    try {
      const res = await escalateAnomalyAlert(alert, copy.action);
      Toast.show({
        type: 'success',
        text1: t('intelligence.escalate'),
        text2: res.actionId,
      });
      navigation.goBack();
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : t('common.error'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card style={styles.card}>
        <Card.Title title={copy.title} />
        <Card.Content>
          <Text>{copy.detail}</Text>
          <Text style={styles.action}>{copy.action}</Text>
        </Card.Content>
      </Card>
      {(Array.isArray(txs) ? txs : []).slice(0, 20).map((tx, i) => (
        <Card key={i} style={styles.card}>
          <Card.Content>
            <Text selectable>{JSON.stringify(tx)}</Text>
          </Card.Content>
        </Card>
      ))}
      <Button mode="contained" loading={busy} disabled={busy} onPress={() => void markReviewed()}>
        {t('intelligence.markReviewed')}
      </Button>
      <Button mode="outlined" loading={busy} disabled={busy} onPress={() => void escalate()}>
        {t('intelligence.escalate')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  card: {marginBottom: 8},
  action: {marginTop: 12, fontWeight: '600'},
});
