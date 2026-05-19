import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {fetchZReportPreview} from '../../api/reports';
import type {TillStackParamList} from '../../navigation/TillNavigator';

type Route = RouteProp<TillStackParamList, 'FiscalReport'>;

function formatReport(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const add = (label: string, key: string) => {
    const v = data[key];
    if (v != null && v !== '') {
      lines.push(`${label}: ${String(v)}`);
    }
  };
  add('Opening float', 'openingFloat');
  add('Cash sales', 'totalSalesCash');
  add('MoMo sales', 'totalSalesMomo');
  add('Airtel sales', 'totalSalesAirtel');
  add('Card sales', 'totalSalesCard');
  add('On account', 'totalSalesOnAccount');
  add('Returns', 'totalReturns');
  add('Discounts', 'totalDiscounts');
  add('VAT collected', 'totalVatCollected');
  add('Closing cash', 'closingCash');
  add('Variance', 'variance');
  add('Cashier', 'cashierName');
  add('Register', 'registerName');
  return lines.join('\n');
}

export default function FiscalReportScreen() {
  const {t} = useTranslation();
  const route = useRoute<Route>();
  const {reportType, tillSessionId} = route.params;
  const cashierName = useSelector((s: RootState) => s.pos.cashierName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState<string>('');

  const title =
    reportType === 'X'
      ? t('fiscal.xReportTitle')
      : t('fiscal.zReportTitle');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const data = await fetchZReportPreview(
          tillSessionId,
          reportType,
          undefined,
          cashierName ?? undefined,
        );
        if (!cancelled) {
          setBody(formatReport(data));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('common.error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tillSessionId, reportType, cashierName, t]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {reportType === 'X' ? (
        <Text style={styles.hint}>{t('fiscal.xReportHint')}</Text>
      ) : null}
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? (
        <Text selectable style={styles.mono}>
          {body || '—'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 16, gap: 12},
  title: {fontSize: 20, fontWeight: '700'},
  hint: {fontSize: 14, color: '#64748B'},
  mono: {fontFamily: 'monospace', fontSize: 13, lineHeight: 20},
  error: {color: '#DC2626'},
  spinner: {marginVertical: 24},
});
