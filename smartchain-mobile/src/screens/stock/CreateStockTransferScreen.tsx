import React, {useEffect, useState} from 'react';
import {FlatList, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import {fetchLocations, type LocationDto} from '../../api/locations';
import {createStockTransfer} from '../../api/stockTransfers';
import {listProducts} from '../../inventory/inventoryRepository';
import {database} from '../../db';
import {ProductVariant} from '../../db/models/ProductVariant';
import {Q} from '@nozbe/watermelondb';
import type {Product} from '../../db/models/Product';

type LineDraft = {product: Product; qty: string};

export default function CreateStockTransferScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const currentLocationId = useSelector(
    (s: RootState) => s.location.selectedLocationId,
  );
  const [destinations, setDestinations] = useState<LocationDto[]>([]);
  const [toLocationId, setToLocationId] = useState<string | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const locs = await fetchLocations();
      setDestinations(locs.filter(l => l.id !== currentLocationId));
      const products = await listProducts();
      setLines(products.slice(0, 20).map(p => ({product: p, qty: ''})));
    })();
  }, [currentLocationId]);

  const submit = async () => {
    if (!toLocationId) {
      Toast.show({type: 'error', text1: t('locations.selectDestination')});
      return;
    }
    const payload = [];
    for (const row of lines) {
      const qty = parseFloat(row.qty);
      if (!row.product.serverId || qty <= 0) {
        continue;
      }
      const variants = await database
        .get<ProductVariant>('product_variants')
        .query(Q.where('product_id', row.product.id))
        .fetch();
      payload.push({
        productId: row.product.serverId,
        variantId: variants[0]?.serverId,
        qty,
      });
    }
    if (payload.length === 0) {
      Toast.show({type: 'error', text1: t('locations.transferLinesRequired')});
      return;
    }
    setSaving(true);
    try {
      await createStockTransfer({toLocationId, lines: payload});
      Toast.show({type: 'success', text1: t('locations.transferCreated')});
      navigation.goBack();
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: t('locations.transferCreateFailed'),
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h}>{t('locations.createTransfer')}</Text>
      <Text style={styles.sub}>{t('locations.selectDestination')}</Text>
      <FlatList
        horizontal
        data={destinations}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Button
            mode={toLocationId === item.id ? 'contained' : 'outlined'}
            style={styles.chip}
            onPress={() => setToLocationId(item.id)}>
            {item.name}
          </Button>
        )}
      />
      {lines.map(row => (
        <View key={row.product.id} style={styles.line}>
          <Text>{row.product.name}</Text>
          <TextInput
            label={t('inventory.qty')}
            keyboardType="decimal-pad"
            value={row.qty}
            onChangeText={v =>
              setLines(prev =>
                prev.map(l =>
                  l.product.id === row.product.id ? {...l, qty: v} : l,
                ),
              )
            }
          />
        </View>
      ))}
      <Button
        mode="contained"
        loading={saving}
        disabled={saving}
        onPress={() => void submit()}>
        {t('locations.submitTransfer')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  h: {fontSize: 18, fontWeight: '600'},
  sub: {marginBottom: 8},
  chip: {marginRight: 8},
  line: {marginBottom: 12},
});
