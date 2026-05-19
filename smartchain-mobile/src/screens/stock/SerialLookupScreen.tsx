import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card, TextInput} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {findSerial} from '../../inventory/inventoryRepository';
import {database} from '../../db';
import {ProductVariant} from '../../db/models/ProductVariant';
import {Product} from '../../db/models/Product';

export default function SerialLookupScreen() {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const search = async () => {
    const row = await findSerial(query.trim());
    if (!row) {
      setResult(t('inventory.serialNotFound'));
      return;
    }
    const variant = await database
      .get<ProductVariant>('product_variants')
      .find(row.variantId);
    const product = await database.get<Product>('products').find(row.productId);
    if (row.status === 'SOLD') {
      setResult(
        `${product.name} · ${variant.sku}\n${t('inventory.serialSold')}: ${row.saleId ?? '—'}`,
      );
    } else {
      setResult(
        `${product.name} · ${variant.sku}\n${t('inventory.serialInStock')}: ${row.serial}`,
      );
    }
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        label={t('inventory.serialSearch')}
        value={query}
        onChangeText={setQuery}
      />
      <Button mode="contained" onPress={() => void search()}>
        {t('inventory.search')}
      </Button>
      {result ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text>{result}</Text>
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12, gap: 8},
  card: {marginTop: 12},
});
