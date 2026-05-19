import React, {useCallback} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Card} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
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

export default function OwnerDashboardScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const kpis = useSelector((s: RootState) => s.dashboard.ownerKpis);
  const loading = useSelector((s: RootState) => s.dashboard.loading);
  const role = useSelector((s: RootState) => s.auth.role) as AppRole | null;
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const [hq, setHq] = React.useState<HqDashboardDto | null>(null);
  const showHq = hasAnyRole(roles, 'CEO', 'CFO');

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

  return (
    <View style={styles.wrap}>
      {showHq && hq ? (
        <Card style={styles.card}>
          <Card.Title title="All branches" />
          <Card.Content>
            <Text>Sales today: {String(hq.totalSalesToday ?? 0)}</Text>
            <Text>Open tills: {String(hq.openTills ?? 0)}</Text>
            {(hq.locations ?? []).map(loc => (
              <Text key={String(loc.locationId)}>
                {loc.name}: {String(loc.salesToday ?? 0)}
              </Text>
            ))}
          </Card.Content>
        </Card>
      ) : null}
      <Text style={styles.h}>Executive KPIs ({role ?? '—'})</Text>
      <Text style={styles.sub}>{loading ? 'Loading…' : ' '}</Text>
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
});
