import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {refreshReorderAlerts, type ReorderAlert} from '../../inventory/reorderCheck';

type Nav = NativeStackNavigationProp<StockStackParamList, 'Reorder'>;

export default function ReorderScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<ReorderAlert[]>([]);

  const reload = useCallback(async () => {
    setRows(await refreshReorderAlerts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={rows}
        keyExtractor={i => i.productId}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.name}>{item.productName}</Text>
              <Text>
                {item.stockQty} / {item.reorderPoint} · {t('inventory.reorderQty')}:{' '}
                {item.reorderQty}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() =>
                  navigation.navigate('CreatePo', {
                    prefillSupplierId: item.preferredSupplierId,
                    prefillProductId: item.productId,
                    prefillQty: item.reorderQty,
                  })
                }>
                {t('inventory.createPoDraft')}
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  card: {marginBottom: 8},
  name: {fontWeight: '600'},
});
