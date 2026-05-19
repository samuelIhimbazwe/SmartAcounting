import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, RefreshControl} from 'react-native';
import {apiClient, isApiError} from '../../api/client';

interface ShiftRow {
  id: string;
  name?: string;
  startTime?: string;
  endTime?: string;
}

export default function ShiftManagementScreen() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const {data} = await apiClient.get<ShiftRow[]>('/hr/shifts');
      setShifts(data);
    } catch (e) {
      setError(
        isApiError(e)
          ? e.status === 403
            ? 'Shift list requires HR or manager role.'
            : e.message
          : 'Failed to load shifts',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shift schedule</Text>
      <Text style={styles.subtitle}>
        View assigned shifts. Cashiers start shifts from Till Open.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={shifts}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} />
        }
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name ?? 'Shift'}</Text>
            <Text style={styles.meta}>
              {item.startTime ?? '—'} – {item.endTime ?? '—'}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No shifts configured for this tenant.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#F8FAFC'},
  title: {fontSize: 22, fontWeight: '700', color: '#0F172A'},
  subtitle: {fontSize: 14, color: '#64748B', marginBottom: 12},
  error: {color: '#DC2626', marginBottom: 8},
  row: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  name: {fontSize: 16, fontWeight: '600', color: '#0F172A'},
  meta: {fontSize: 13, color: '#64748B', marginTop: 4},
  empty: {textAlign: 'center', color: '#94A3B8', marginTop: 24},
});
