import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Card, Chip, Menu, Switch, TextInput} from 'react-native-paper';
import {useFocusEffect, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'react-redux';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {
  createVariant,
  getProductWithVariants,
  listActiveSuppliers,
  listUoms,
  updateProductSettings,
  variantLabel,
} from '../../inventory/inventoryRepository';
import type {Product} from '../../db/models/Product';
import type {ProductVariant} from '../../db/models/ProductVariant';
import type {Supplier} from '../../db/models/Supplier';
import type {Uom} from '../../db/models/Uom';
import {addToCart} from '../../store/slices/posSlice';
import {LabelPrintDialog} from '../../components/LabelPrintDialog';

type Route = RouteProp<StockStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const {t} = useTranslation();
  const route = useRoute<Route>();
  const dispatch = useDispatch();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reorderPoint, setReorderPoint] = useState('0');
  const [reorderQty, setReorderQty] = useState('0');
  const [preferredSupplierId, setPreferredSupplierId] = useState<string>('');
  const [isSerialTracked, setIsSerialTracked] = useState(false);
  const [purchaseUomId, setPurchaseUomId] = useState('');
  const [saleUomId, setSaleUomId] = useState('');
  const [uomFactor, setUomFactor] = useState('1');
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false);
  const [purchaseUomMenuOpen, setPurchaseUomMenuOpen] = useState(false);
  const [saleUomMenuOpen, setSaleUomMenuOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);

  const selectedVariant = useMemo(
    () => variants.find(v => v.id === selectedId),
    [variants, selectedId],
  );

  const labelData = useMemo(() => {
    if (!product || !selectedVariant) {
      return null;
    }
    const unitPrice = selectedVariant.priceOverride ?? product.baseUnitPrice;
    const saleUom = uoms.find(u => u.id === saleUomId);
    return {
      name: product.name,
      price: unitPrice,
      currency: product.currencyCode === 'USD' ? 'USD' : 'FRW',
      barcode: selectedVariant.barcode,
      sku: selectedVariant.sku,
      uom: saleUom?.name,
    };
  }, [product, selectedVariant, uoms, saleUomId]);

  const load = useCallback(async () => {
    const [{product: p, variants: vs}, sups, uomList] = await Promise.all([
      getProductWithVariants(route.params.productId),
      listActiveSuppliers(),
      listUoms(),
    ]);
    setProduct(p);
    setVariants(vs);
    setSuppliers(sups);
    setUoms(uomList);
    setSelectedId(vs[0]?.id ?? null);
    setReorderPoint(String(p.reorderPoint));
    setReorderQty(String(p.reorderQty));
    setPreferredSupplierId(p.preferredSupplierId ?? '');
    setIsSerialTracked(p.isSerialTracked);
    setPurchaseUomId(p.purchaseUomId ?? uomList[0]?.id ?? '');
    setSaleUomId(p.saleUomId ?? uomList[0]?.id ?? '');
    setUomFactor(String(p.uomConversionFactor || 1));
  }, [route.params.productId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const addSelectedToCart = () => {
    const variant = variants.find(v => v.id === selectedId);
    if (!product || !variant) {
      return;
    }
    const unitPrice = variant.priceOverride ?? product.baseUnitPrice;
    dispatch(
      addToCart({
        catalogItemId: variant.id,
        productId: product.id,
        variantId: variant.id,
        barcode: variant.barcode,
        sku: variant.sku,
        name: product.name,
        variantLabel: variantLabel(variant),
        quantity: 1,
        unitPrice,
        costPrice: 0,
        currency: product.currencyCode === 'USD' ? 'USD' : 'FRW',
        lineTotal: unitPrice,
        margin: 0,
        requiresSerial: product.isSerialTracked,
      }),
    );
  };

  const seedSmL = async () => {
    if (!product) {
      return;
    }
    const sizes = ['S', 'M', 'L'] as const;
    for (const size of sizes) {
      const exists = variants.some(v => v.attributes?.size === size);
      if (!exists) {
        await createVariant(product.id, {
          sku: `${product.sku}-${size}`,
          name: size,
          attributes: {size},
          barcode: `${product.sku}-${size}`,
          stockQty: 0,
        });
      }
    }
    await load();
  };

  const saveSettings = async () => {
    if (!product) {
      return;
    }
    await updateProductSettings(product.id, {
      reorderPoint: parseFloat(reorderPoint) || 0,
      reorderQty: parseFloat(reorderQty) || 0,
      preferredSupplierId: preferredSupplierId || null,
      isSerialTracked,
      purchaseUomId: purchaseUomId || null,
      saleUomId: saleUomId || null,
      uomConversionFactor: parseFloat(uomFactor) || 1,
    });
    await load();
  };

  if (!product) {
    return (
      <View style={styles.wrap}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  const preferredSupplier = suppliers.find(s => s.id === preferredSupplierId);
  const purchaseUom = uoms.find(u => u.id === purchaseUomId);
  const saleUom = uoms.find(u => u.id === saleUomId);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.sub}>{product.sku}</Text>

      <Text style={styles.section}>{t('inventory.selectVariant')}</Text>
      <View style={styles.chips}>
        {variants.map(v => (
          <Chip
            key={v.id}
            selected={selectedId === v.id}
            onPress={() => setSelectedId(v.id)}
            style={styles.chip}>
            {variantLabel(v)} · {v.stockQty}
          </Chip>
        ))}
      </View>

      <Button mode="contained" onPress={addSelectedToCart}>
        {t('inventory.addToCart')}
      </Button>
      {labelData ? (
        <Button mode="outlined" onPress={() => setLabelDialogOpen(true)}>
          {t('hardware.printLabel')}
        </Button>
      ) : null}
      {labelData ? (
        <LabelPrintDialog
          visible={labelDialogOpen}
          onDismiss={() => setLabelDialogOpen(false)}
          data={labelData}
        />
      ) : null}
      {variants.length < 3 ? (
        <Button mode="outlined" onPress={() => void seedSmL()}>
          {t('inventory.seedVariants')}
        </Button>
      ) : null}

      <Card style={styles.card}>
        <Card.Title title={t('inventory.productSettings')} />
        <Card.Content>
          <View style={styles.row}>
            <Text>{t('inventory.serialTracking')}</Text>
            <Switch value={isSerialTracked} onValueChange={setIsSerialTracked} />
          </View>

          <Menu
            visible={supplierMenuOpen}
            onDismiss={() => setSupplierMenuOpen(false)}
            anchor={
              <Button onPress={() => setSupplierMenuOpen(true)} style={styles.field}>
                {t('inventory.preferredSupplier')}:{' '}
                {preferredSupplier?.name ?? t('inventory.selectSupplier')}
              </Button>
            }>
            <Menu.Item
              onPress={() => {
                setPreferredSupplierId('');
                setSupplierMenuOpen(false);
              }}
              title="—"
            />
            {suppliers.map(s => (
              <Menu.Item
                key={s.id}
                onPress={() => {
                  setPreferredSupplierId(s.id);
                  setSupplierMenuOpen(false);
                }}
                title={s.name}
              />
            ))}
          </Menu>

          <Menu
            visible={purchaseUomMenuOpen}
            onDismiss={() => setPurchaseUomMenuOpen(false)}
            anchor={
              <Button onPress={() => setPurchaseUomMenuOpen(true)} style={styles.field}>
                {t('inventory.purchaseUom')}: {purchaseUom?.name ?? '—'}
              </Button>
            }>
            {uoms.map(u => (
              <Menu.Item
                key={u.id}
                onPress={() => {
                  setPurchaseUomId(u.id);
                  setPurchaseUomMenuOpen(false);
                }}
                title={u.name}
              />
            ))}
          </Menu>

          <Menu
            visible={saleUomMenuOpen}
            onDismiss={() => setSaleUomMenuOpen(false)}
            anchor={
              <Button onPress={() => setSaleUomMenuOpen(true)} style={styles.field}>
                {t('inventory.saleUom')}: {saleUom?.name ?? '—'}
              </Button>
            }>
            {uoms.map(u => (
              <Menu.Item
                key={u.id}
                onPress={() => {
                  setSaleUomId(u.id);
                  setSaleUomMenuOpen(false);
                }}
                title={u.name}
              />
            ))}
          </Menu>

          <TextInput
            label={t('inventory.uomConversion')}
            value={uomFactor}
            onChangeText={setUomFactor}
            keyboardType="decimal-pad"
            style={styles.field}
          />

          <TextInput
            label={t('inventory.reorderPoint')}
            value={reorderPoint}
            onChangeText={setReorderPoint}
            keyboardType="decimal-pad"
          />
          <TextInput
            label={t('inventory.reorderQty')}
            value={reorderQty}
            onChangeText={setReorderQty}
            keyboardType="decimal-pad"
          />
          <Button mode="outlined" onPress={() => void saveSettings()}>
            {t('common.submit')}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 12},
  title: {fontSize: 20, fontWeight: '700'},
  sub: {color: '#666'},
  section: {fontWeight: '600', marginTop: 8},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {marginBottom: 4},
  card: {marginTop: 8},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  field: {marginVertical: 4},
});
