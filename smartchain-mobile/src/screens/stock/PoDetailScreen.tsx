import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {getPoWithLines, updatePoStatus} from '../../inventory/inventoryRepository';
import {sendPurchaseOrder} from '../../api/procurement';
import type {PurchaseOrder} from '../../db/models/PurchaseOrder';
import type {PurchaseOrderLine} from '../../db/models/PurchaseOrderLine';

type Route = RouteProp<StockStackParamList, 'PoDetail'>;
type Nav = NativeStackNavigationProp<StockStackParamList, 'PoDetail'>;

export default function PoDetailScreen() {
  const {t} = useTranslation();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const online = useSelector((s: RootState) => s.network.online);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);

  const load = useCallback(async () => {
    const data = await getPoWithLines(route.params.poId);
    setPo(data.po);
    setLines(data.lines);
  }, [route.params.poId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const send = async () => {
    if (!po?.serverId || !online) {
      return;
    }
    await sendPurchaseOrder(po.serverId);
    await updatePoStatus(po.id, 'SENT', po.serverId);
    await load();
  };

  if (!po) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{po.status}</Text>
      {lines.map(l => (
        <Card key={l.id} style={styles.card}>
          <Card.Content>
            <Text>{l.productName}</Text>
            <Text>
              {t('inventory.orderedQty')}: {l.orderedQty} · {t('inventory.receivedQty')}:{' '}
              {l.receivedQty}
            </Text>
          </Card.Content>
        </Card>
      ))}
      {po.status === 'DRAFT' && po.serverId ? (
        <Button mode="contained" onPress={() => void send()}>
          {t('inventory.sendPo')}
        </Button>
      ) : null}
      <Button
        mode="contained-tonal"
        onPress={() => navigation.navigate('ReceiveGrn', {poId: po.id})}>
        {t('inventory.receivePo')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  title: {fontSize: 18, fontWeight: '600'},
  card: {marginBottom: 8},
});
