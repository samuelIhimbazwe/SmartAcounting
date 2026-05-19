import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {
  exportAuditCsv,
  getAllAuditEntries,
} from '../../fiscal/auditLogRepository';
import type {AuditEntry} from '../../fiscal/auditChain';

export default function AuditLogScreen() {
  const {t} = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const rows = await getAllAuditEntries({
      action: actionFilter.trim() || undefined,
      from: fromDate.trim() || undefined,
      to: toDate.trim() ? `${toDate.trim()}T23:59:59.999Z` : undefined,
    });
    setEntries(rows);
    setLoading(false);
  }, [actionFilter, fromDate, toDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => entries, [entries]);

  const onExport = async () => {
    const csv = await exportAuditCsv();
    await Share.share({
      title: t('audit.exportTitle'),
      message: csv,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('audit.title')}</Text>
      <TextInput
        label={t('audit.filterAction')}
        value={actionFilter}
        onChangeText={setActionFilter}
        style={styles.field}
      />
      <TextInput
        label={t('audit.filterFrom')}
        placeholder="YYYY-MM-DD"
        value={fromDate}
        onChangeText={setFromDate}
        style={styles.field}
      />
      <TextInput
        label={t('audit.filterTo')}
        placeholder="YYYY-MM-DD"
        value={toDate}
        onChangeText={setToDate}
        style={styles.field}
      />
      <Button mode="outlined" onPress={() => void reload()} style={styles.btn}>
        {t('audit.applyFilters')}
      </Button>
      <Button mode="contained" onPress={() => void onExport()} style={styles.btn}>
        {t('audit.exportCsv')}
      </Button>
      <FlatList
        data={filtered}
        keyExtractor={item => item.hash}
        refreshing={loading}
        onRefresh={() => void reload()}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('audit.empty')}</Text>
        }
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.ts}>{item.timestamp}</Text>
            <Text style={styles.action}>{item.action}</Text>
            <Text style={styles.meta}>
              {item.entityType} · {item.entityId}
            </Text>
            <Text style={styles.meta}>{item.actorId}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  title: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  field: {marginBottom: 6},
  btn: {marginBottom: 8},
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  ts: {fontSize: 12, color: '#64748B'},
  action: {fontSize: 15, fontWeight: '600'},
  meta: {fontSize: 12, color: '#374151'},
  empty: {textAlign: 'center', marginTop: 24, color: '#9CA3AF'},
});
