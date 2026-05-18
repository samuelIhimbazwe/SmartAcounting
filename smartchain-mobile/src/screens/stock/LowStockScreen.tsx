import React, {useCallback} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {loadLowStockDone} from '../../store/slices/inventorySlice';
import {fetchLowStock} from '../../api/inventory';

export default function LowStockScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const rows = useSelector((s: RootState) => s.inventory.lowStock);

  const reload = useCallback(() => {
    void fetchLowStock()
      .then(r => dispatch(loadLowStockDone(r)))
      .catch(() => {});
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Low stock</Text>
      <Button mode="outlined" onPress={reload} contentStyle={styles.btnInner}>
        Refresh
      </Button>
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.mono}>{JSON.stringify(item)}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  mono: {fontSize: 13},
  wrap: {flex: 1, padding: 12, gap: 8},
  card: {marginBottom: 8},
  btnInner: {minHeight: 48},
});
