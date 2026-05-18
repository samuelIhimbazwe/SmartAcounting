import React, {useCallback} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  loadBalancesDone,
  loadBalancesFailed,
  loadBalancesPending,
} from '../../store/slices/inventorySlice';
import {fetchBalances} from '../../api/inventory';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import type {AppRole} from '../../utils/roles';
import {hasAnyRole} from '../../utils/roles';

type Nav = NativeStackNavigationProp<StockStackParamList, 'StockList'>;

export default function StockScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const rows = useSelector((s: RootState) => s.inventory.balances);
  const loading = useSelector((s: RootState) => s.inventory.loading);
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const showLowStock = hasAnyRole(roles, 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER');

  const reload = useCallback(() => {
    dispatch(loadBalancesPending());
    void fetchBalances()
      .then(r => dispatch(loadBalancesDone(r)))
      .catch(e => dispatch(loadBalancesFailed(String(e))));
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Inventory balances</Text>
      <Button mode="outlined" loading={loading} onPress={reload} contentStyle={styles.btnInner}>
        Refresh
      </Button>
      {showLowStock ? (
        <Button
          mode="contained-tonal"
          onPress={() => navigation.navigate('LowStock')}
          contentStyle={styles.btnInner}>
          Low stock report
        </Button>
      ) : null}
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
