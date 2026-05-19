import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Card, Menu, TextInput} from 'react-native-paper';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {
  createDraftPo,
  ensureDefaultUoms,
  listActiveSuppliers,
  listProducts,
} from '../../inventory/inventoryRepository';
import type {POLineRequest} from '../../utils/procurementPayload';
import {queueOfflinePoCreate} from '../../services/offlineQueue';
import {syncPoCreateToServer} from '../../inventory/poSync';
import type {Supplier} from '../../db/models/Supplier';
import {database} from '../../db';
import {ProductVariant} from '../../db/models/ProductVariant';
import {Uom} from '../../db/models/Uom';
import {Q} from '@nozbe/watermelondb';
import type {Product} from '../../db/models/Product';

type Route = RouteProp<StockStackParamList, 'CreatePo'>;

type POLineDraft = {
  id: string;
  productId: string;
  qty: string;
  cost: string;
};

function newLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CreatePoScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const online = useSelector((s: RootState) => s.network.online);
  const userId = useSelector((s: RootState) => s.auth.userId);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<POLineDraft[]>([]);
  const [addProductId, setAddProductId] = useState('');
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);

  useEffect(() => {
    void listActiveSuppliers().then(s => {
      setSuppliers(s);
      const prefill = route.params?.prefillSupplierId;
      if (prefill) {
        setSupplierId(prefill);
      } else if (s[0]) {
        setSupplierId(s[0].id);
      }
    });
    void listProducts().then(p => {
      setProducts(p);
      if (route.params?.prefillProductId) {
        setLines([
          {
            id: newLineId(),
            productId: route.params.prefillProductId,
            qty: String(route.params.prefillQty ?? 1),
            cost: '0',
          },
        ]);
        setAddProductId(route.params.prefillProductId);
      } else if (p[0]) {
        setAddProductId(p[0].id);
      }
    });
  }, [route.params]);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const addLine = () => {
    if (!addProductId) {
      return;
    }
    setLines(prev => [
      ...prev,
      {id: newLineId(), productId: addProductId, qty: '1', cost: '0'},
    ]);
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const save = async (sendAfter: boolean) => {
    if (!selectedSupplier || lines.length === 0) {
      return;
    }

    const resolvedLines: {
      productId: string;
      variantId?: string;
      serverProductId?: string;
      orderedQty: number;
      unitCost: number;
      sku: string;
      productName: string;
      uomId?: string;
    }[] = [];
    const apiLines: POLineRequest[] = [];

    await ensureDefaultUoms();
    const uoms = await database.get<Uom>('uoms').query().fetch();
    const defaultUom = uoms.find(u => u.name === 'unit') ?? uoms[0];

    for (const draft of lines) {
      const product = products.find(p => p.id === draft.productId);
      if (!product) {
        continue;
      }
      const variants = await database
        .get<ProductVariant>('product_variants')
        .query(Q.where('product_id', product.id))
        .fetch();
      const variant = variants[0];
      const orderedQty = parseFloat(draft.qty) || 1;
      const unitCost = parseFloat(draft.cost) || 0;
      const uomId =
        product.purchaseUomId ?? product.saleUomId ?? defaultUom?.id ?? '';

      resolvedLines.push({
        productId: product.id,
        variantId: variant?.id,
        serverProductId: product.serverId,
        orderedQty,
        unitCost,
        sku: product.sku,
        productName: product.name,
        uomId,
      });
      apiLines.push({
        productId: product.serverId ?? product.id,
        variantId: variant?.serverId ?? variant?.id,
        orderedQty,
        uomId,
        unitCost,
      });
    }

    if (resolvedLines.length === 0) {
      return;
    }

    const po = await createDraftPo({
      supplierId,
      notes,
      createdBy: userId ?? undefined,
      lines: resolvedLines,
      needsSync: !online,
    });

    if (online) {
      await syncPoCreateToServer({
        supplier: selectedSupplier,
        lines: apiLines,
        notes,
        localPoId: po.id,
        sendAfter,
      });
    } else {
      await queueOfflinePoCreate({
        localPoId: po.id,
        supplierLocalId: selectedSupplier.id,
        lines: apiLines,
        notes,
        sendAfter,
      });
    }
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Menu
        visible={supplierMenuOpen}
        onDismiss={() => setSupplierMenuOpen(false)}
        anchor={
          <Button onPress={() => setSupplierMenuOpen(true)}>
            {selectedSupplier?.name ?? t('inventory.selectSupplier')}
          </Button>
        }>
        {suppliers.map(s => (
          <Menu.Item
            key={s.id}
            onPress={() => {
              setSupplierId(s.id);
              setSupplierMenuOpen(false);
            }}
            title={s.name}
          />
        ))}
      </Menu>

      <Text style={styles.section}>{t('inventory.poLines')}</Text>
      {lines.map((line, idx) => {
        const product = products.find(p => p.id === line.productId);
        return (
          <Card key={line.id} style={styles.card}>
            <Card.Content>
              <Text style={styles.lineTitle}>
                {product?.name ?? t('inventory.selectProduct')}
              </Text>
              <TextInput
                label={t('inventory.orderedQty')}
                value={line.qty}
                onChangeText={v => {
                  const next = [...lines];
                  next[idx] = {...line, qty: v};
                  setLines(next);
                }}
                keyboardType="decimal-pad"
              />
              <TextInput
                label={t('inventory.unitCost')}
                value={line.cost}
                onChangeText={v => {
                  const next = [...lines];
                  next[idx] = {...line, cost: v};
                  setLines(next);
                }}
                keyboardType="decimal-pad"
              />
              <Button mode="text" textColor="#DC2626" onPress={() => removeLine(line.id)}>
                {t('inventory.removePoLine')}
              </Button>
            </Card.Content>
          </Card>
        );
      })}

      <Menu
        visible={productMenuOpen}
        onDismiss={() => setProductMenuOpen(false)}
        anchor={
          <Button onPress={() => setProductMenuOpen(true)} mode="outlined">
            {t('inventory.addPoLine')}
          </Button>
        }>
        {products.map(p => (
          <Menu.Item
            key={p.id}
            onPress={() => {
              setAddProductId(p.id);
              setProductMenuOpen(false);
            }}
            title={p.name}
          />
        ))}
      </Menu>
      <Button mode="outlined" onPress={addLine} disabled={!addProductId}>
        {t('inventory.addPoLineConfirm')}
      </Button>

      <TextInput label={t('inventory.notes')} value={notes} onChangeText={setNotes} />
      <Button mode="outlined" onPress={() => void save(false)} disabled={lines.length === 0}>
        {t('inventory.saveDraft')}
      </Button>
      <Button mode="contained" onPress={() => void save(true)} disabled={lines.length === 0}>
        {t('inventory.sendPo')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  section: {fontWeight: '600', marginTop: 8},
  card: {marginBottom: 8},
  lineTitle: {fontWeight: '600', marginBottom: 4},
});
