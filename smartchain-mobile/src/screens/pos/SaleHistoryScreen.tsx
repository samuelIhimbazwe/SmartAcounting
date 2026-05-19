import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {
  fetchSaleHistoryPage,
  type SaleHistoryRow,
} from '../../repositories/saleHistoryRepository';

export default function SaleHistoryScreen() {
  const {t} = useTranslation();
  const [rows, setRows] = useState<SaleHistoryRow[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchSaleHistoryPage();
      setRows(page.rows);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await fetchSaleHistoryPage(cursor);
      setRows(prev => {
        const merged = [...prev, ...page.rows];
        return merged.slice(-50);
      });
      setCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst]),
  );

  return (
    <View style={styles.wrap}>
      {loading ? <ActivityIndicator style={styles.pad} /> : null}
      <FlatList
        data={rows}
        keyExtractor={item => `${item.salesOrderId}-${item.timestamp}`}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={7}
        removeClippedSubviews
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.id}>{item.salesOrderId}</Text>
            <Text style={styles.meta}>
              {new Date(item.timestamp).toLocaleString()} · {item.actorId}
            </Text>
          </View>
        )}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.pad} /> : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {t('pos.noSaleHistory', 'No completed sales yet')}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1},
  pad: {padding: 16},
  row: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  id: {fontWeight: '600', fontFamily: 'monospace', fontSize: 13},
  meta: {fontSize: 12, color: '#6B7280', marginTop: 4},
  empty: {padding: 24, textAlign: 'center', color: '#6B7280'},
});
