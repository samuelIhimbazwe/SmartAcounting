import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Card} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {fetchCashFlowForecast} from '../../api/aiAnalytics';
import {SimpleBarChart} from '../../components/charts/SimpleBarChart';
import {formatMoney} from '../../utils/currency';

export default function CashFlowForecastScreen() {
  const {t} = useTranslation();
  const [series, setSeries] = useState<
    Array<{date: string; cashIn: number; cashOut: number; balance: number}>
  >([]);
  const [negative, setNegative] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    void fetchCashFlowForecast().then(r => {
      setSeries(r.series ?? []);
      setNegative(Boolean(r.negativeWithinWindow));
      setBalance(Number(r.projectedBalance ?? 0));
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card style={styles.card}>
        <Card.Title title={t('intelligence.cashFlowTitle')} />
        <Card.Content>
          <Text>
            {t('intelligence.projectedBalance')}: {formatMoney(balance, 'FRW')}
          </Text>
          {negative ? (
            <Text style={styles.warn}>{t('intelligence.cashFlowNegative')}</Text>
          ) : null}
        </Card.Content>
      </Card>
      <SimpleBarChart
        data={series.slice(0, 14).map(p => ({
          label: p.date,
          value: p.balance,
        }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12},
  card: {marginBottom: 12},
  warn: {color: '#DC2626', marginTop: 8, fontWeight: '600'},
});
