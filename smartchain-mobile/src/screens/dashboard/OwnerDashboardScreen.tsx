import React, {useCallback} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import type {AppDispatch, RootState} from '../../store';
import {
  loadOwnerKpisDone,
  loadOwnerKpisFailed,
  loadOwnerKpisPending,
} from '../../store/slices/dashboardSlice';
import {fetchDashboardKpis} from '../../api/dashboard';
import type {AppRole} from '../../utils/roles';
import {hasAnyRole, roleDashboardPath} from '../../utils/roles';
import {fetchAnalyticsDashboard, type HqDashboardDto} from '../../api/analytics';
import {ReorderSuggestionsCard} from '../../components/dashboard/ReorderSuggestionsCard';
import type {DashboardStackParamList} from '../../navigation/DashboardNavigator';
import type {AlertItem} from '../../store/slices/alertSlice';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

export default function OwnerDashboardScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const kpis = useSelector((s: RootState) => s.dashboard.ownerKpis);
  const loading = useSelector((s: RootState) => s.dashboard.loading);
  const alerts = useSelector((s: RootState) => s.alerts.items);
  const role = useSelector((s: RootState) => s.auth.role) as AppRole | null;
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const [hq, setHq] = React.useState<HqDashboardDto | null>(null);
  const showHq = hasAnyRole(roles, 'CEO', 'CFO');
  const showCashFlow = hasAnyRole(roles, 'CEO', 'CFO');

  const reload = useCallback(() => {
    if (!role) {
      return;
    }
    const path = roleDashboardPath(role);
    dispatch(loadOwnerKpisPending());
    void fetchDashboardKpis(path)
      .then(rows => dispatch(loadOwnerKpisDone(rows)))
      .catch(e => dispatch(loadOwnerKpisFailed(String(e))));
  }, [dispatch, role]);

  useFocusEffect(
    useCallback(() => {
      reload();
      if (showHq) {
        void fetchAnalyticsDashboard('all').then(setHq).catch(() => setHq(null));
      }
    }, [reload, showHq]),
  );

  const openAnomaly = (alert: AlertItem) => {
    navigation.navigate('AnomalyDetail', {alert: alert as Record<string, unknown>});
  };

  return (
    <View style={styles.wrap}>
      <ReorderSuggestionsCard />
      {showCashFlow ? (
        <Card style={styles.card}>
          <Card.Title title={t('intelligence.cashFlowTitle')} />
          <Card.Content>
            <Button onPress={() => navigation.navigate('CashFlowForecast')}>
              {t('intelligence.openCashFlow')}
            </Button>
          </Card.Content>
        </Card>
      ) : null}
      {alerts.length > 0 ? (
        <Card style={styles.card}>
          <Card.Title title={t('intelligence.recentAlerts')} />
          <Card.Content>
            {alerts.slice(0, 5).map((a, i) => (
              <TouchableOpacity key={i} onPress={() => openAnomaly(a)}>
                <Text style={styles.alertLine}>
                  {String(a.anomalyType ?? a.type)} — {String(a.message ?? '')}
                </Text>
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>
      ) : null}
      {showHq && hq ? (
        <Card style={styles.card}>
          <Card.Title title="All branches" />
          <Card.Content>
            <Text>Sales today: {String(hq.totalSalesToday ?? 0)}</Text>
            <Text>Open tills: {String(hq.openTills ?? 0)}</Text>
          </Card.Content>
        </Card>
      ) : null}
      <Text style={styles.h}>Executive KPIs ({role ?? '—'})</Text>
      <Text style={styles.sub}>{loading ? t('common.loading') : ' '}</Text>
      <FlatList
        data={kpis}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Title title={String(item.label ?? item.id ?? 'KPI')} />
            <Card.Content>
              <Text style={styles.kpi}>{String(item.value ?? '')}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h: {fontSize: 22, fontWeight: '700', marginBottom: 8},
  sub: {fontSize: 13, marginBottom: 8},
  kpi: {fontSize: 22, fontWeight: '600'},
  wrap: {flex: 1, padding: 16},
  card: {marginBottom: 12},
  alertLine: {paddingVertical: 6, color: '#1B6FDB'},
});
