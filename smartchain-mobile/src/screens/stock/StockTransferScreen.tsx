import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {useTranslation} from 'react-i18next';
import {
  fetchIncomingTransfers,
  receiveStockTransfer,
  type StockTransferDto,
} from '../../api/stockTransfers';

type Nav = NativeStackNavigationProp<StockStackParamList, 'StockTransfer'>;

export default function StockTransferScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const [incoming, setIncoming] = useState<StockTransferDto[]>([]);

  const reload = useCallback(() => {
    void fetchIncomingTransfers().then(setIncoming).catch(() => setIncoming([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const receiveAll = async (transfer: StockTransferDto) => {
    await receiveStockTransfer(
      transfer.id,
      transfer.lines.map(l => ({
        lineId: l.id,
        productId: l.productId,
        variantId: l.variantId,
        qtyReceived: l.qty,
      })),
    );
    reload();
  };

  return (
    <View style={styles.wrap}>
      <Button
        mode="contained"
        style={styles.createBtn}
        onPress={() => navigation.navigate('CreateStockTransfer')}>
        {t('locations.createTransfer')}
      </Button>
      <Text style={styles.h}>{t('locations.incomingTransfers')}</Text>
      <FlatList
        data={incoming}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text>{t('locations.noTransfers')}</Text>}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text>{item.status}</Text>
              <Text>
                {t('locations.lines')}: {item.lines.length}
              </Text>
              <Button mode="contained" onPress={() => void receiveAll(item)}>
                {t('locations.receiveTransfer')}
              </Button>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  createBtn: {marginBottom: 12},
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  card: {marginBottom: 8},
});
