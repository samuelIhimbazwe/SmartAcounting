import React, {useCallback, useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Card, Menu, TextInput} from 'react-native-paper';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import type {StockStackParamList} from '../../navigation/StockNavigator';
import {
  createGrn,
  findVariantByBarcode,
  getPoWithLines,
  getProductWithVariants,
  listActiveSuppliers,
  listProducts,
  postGrnLocally,
} from '../../inventory/inventoryRepository';
import {getSyncLocationCode} from '../../inventory/syncLocation';
import {createGrnForPo, confirmGrn} from '../../api/procurement';
import {receiveStock} from '../../api/inventory';
import {queueOfflineGrnPost} from '../../services/offlineQueue';
import type {Supplier} from '../../db/models/Supplier';
import type {Product} from '../../db/models/Product';
import {
  labelPrinterService,
  type LabelFormat,
  type LabelType,
} from '../../services/printer/LabelPrinterService';

type Route = RouteProp<StockStackParamList, 'ReceiveGrn'>;

type LineDraft = {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  productName: string;
  unitCost: number;
  receivedInput: string;
  batch: string;
  expiry: string;
  serials: string;
};

function newLineId(): string {
  return `grn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ReceiveGrnScreen() {
  const {t} = useTranslation();
  const route = useRoute<Route>();
  const online = useSelector((s: RootState) => s.network.online);
  const userId = useSelector((s: RootState) => s.auth.userId);
  const isPoLinked = Boolean(route.params?.poId);

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState(route.params?.supplierId ?? '');
  const [poServerId, setPoServerId] = useState<string | undefined>();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [addProductId, setAddProductId] = useState('');

  const loadPo = useCallback(async () => {
    if (!route.params?.poId) {
      return;
    }
    const {po, lines: ls, supplier} = await getPoWithLines(route.params.poId);
    setSupplierId(supplier.id);
    setPoServerId(po.serverId);
    setLines(
      ls.map(l => ({
        id: l.id,
        productId: l.productId,
        variantId: l.variantId,
        sku: l.sku,
        productName: l.productName,
        unitCost: l.unitCost,
        receivedInput: String(Math.max(0, l.orderedQty - l.receivedQty)),
        batch: '',
        expiry: '',
        serials: '',
      })),
    );
  }, [route.params?.poId]);

  const loadFreeForm = useCallback(async () => {
    const [sups, prods] = await Promise.all([
      listActiveSuppliers(),
      listProducts(),
    ]);
    setSuppliers(sups);
    setProducts(prods);
    setSupplierId(prev => prev || route.params?.supplierId || sups[0]?.id || '');
    setAddProductId(prev => prev || prods[0]?.id || '');
  }, [route.params?.supplierId]);

  useEffect(() => {
    if (isPoLinked) {
      void loadPo();
    } else {
      void loadFreeForm();
    }
  }, [isPoLinked, loadPo, loadFreeForm]);

  const addProductLine = async (productId: string) => {
    const {product, variants} = await getProductWithVariants(productId);
    const variant = variants[0];
    setLines(prev => [
      ...prev,
      {
        id: newLineId(),
        productId: product.id,
        variantId: variant?.id,
        sku: product.sku,
        productName: product.name,
        unitCost: 0,
        receivedInput: '1',
        batch: '',
        expiry: '',
        serials: '',
      },
    ]);
  };

  const scanBarcode = async () => {
    const hit = await findVariantByBarcode(barcodeInput);
    if (!hit) {
      return;
    }
    setLines(prev => [
      ...prev,
      {
        id: newLineId(),
        productId: hit.product.id,
        variantId: hit.variant.id,
        sku: hit.variant.sku,
        productName: hit.product.name,
        unitCost: 0,
        receivedInput: '1',
        batch: '',
        expiry: '',
        serials: '',
      },
    ]);
    setBarcodeInput('');
  };

  const promptPrintLabels = (
    grnLines: Array<{
      productName: string;
      sku: string;
      qtyReceived: number;
      unitCost: number;
      productId: string;
      expiryDate?: string;
      batchNumber?: string;
    }>,
  ) => {
    Alert.alert(t('hardware.printLabelsPrompt'), undefined, [
      {text: t('hardware.printLabelsNo'), style: 'cancel'},
      {
        text: t('hardware.printLabelsYes'),
        onPress: () => {
          void (async () => {
            const bulk = grnLines.map(line => {
              const product = products.find(p => p.id === line.productId);
              const currency =
                product?.currencyCode === 'USD' ? 'USD' : 'FRW';
              return {
                type: 'price' as LabelType,
                format: 'zpl' as LabelFormat,
                data: {
                  name: line.productName,
                  price: line.unitCost,
                  currency,
                  barcode: line.sku,
                  sku: line.sku,
                  batch: line.batchNumber,
                  expiryDate: line.expiryDate,
                },
                copies: Math.max(1, Math.round(line.qtyReceived)),
              };
            });
            try {
              await labelPrinterService.printBulk(bulk);
            } catch {
              /* optional hardware */
            }
          })();
        },
      },
    ]);
  };

  const post = async () => {
    if (!supplierId) {
      return;
    }

    const grnLines = lines
      .filter(l => parseFloat(l.receivedInput) > 0)
      .map(l => ({
        productId: l.productId,
        variantId: l.variantId,
        qtyReceived: parseFloat(l.receivedInput),
        unitCost: l.unitCost,
        expiryDate: l.expiry || undefined,
        batchNumber: l.batch || undefined,
        serialNumbers: l.serials
          ? l.serials.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        sku: l.sku,
        productName: l.productName,
      }));

    if (grnLines.length === 0) {
      return;
    }

    const grn = await createGrn({
      poId: route.params?.poId,
      supplierId,
      receivedBy: userId ?? undefined,
      lines: grnLines,
      needsSync: !online,
    });

    if (online && poServerId) {
      const grnBody = {
        lines: grnLines.map(l => ({
          productId: l.productId,
          sku: l.sku,
          productName: l.productName,
          receivedQuantity: l.qtyReceived,
          unitCost: l.unitCost,
          lotCode: l.batchNumber,
          expiryDate: l.expiryDate,
          location: getSyncLocationCode(),
        })),
      };
      const created = await createGrnForPo(poServerId, grnBody);
      const serverGrnId = String((created as {id?: string}).id ?? '');
      if (serverGrnId) {
        await confirmGrn(serverGrnId);
      }
      await postGrnLocally(grn.id);
    } else if (online) {
      for (const l of grnLines) {
        const product = products.find(p => p.id === l.productId);
        await receiveStock({
          productId: product?.serverId ?? l.productId,
          location: getSyncLocationCode(),
          quantity: l.qtyReceived,
          costPrice: l.unitCost,
          supplierRef: supplierId,
          lotCode: l.batchNumber,
          expiryDate: l.expiryDate,
        });
      }
      await postGrnLocally(grn.id);
    } else {
      await queueOfflineGrnPost({
        localGrnId: grn.id,
        poServerId,
        grnBody: poServerId
          ? {
              lines: grnLines.map(l => ({
                productId: l.productId,
                sku: l.sku,
                productName: l.productName,
                receivedQuantity: l.qtyReceived,
                unitCost: l.unitCost,
                lotCode: l.batchNumber,
                expiryDate: l.expiryDate,
                location: getSyncLocationCode(),
              })),
            }
          : undefined,
        receiveBodies: !poServerId
          ? grnLines.map(l => {
              const product = products.find(p => p.id === l.productId);
              return {
                productId: product?.serverId ?? l.productId,
                location: getSyncLocationCode(),
                quantity: l.qtyReceived,
                costPrice: l.unitCost,
                supplierRef: supplierId,
                lotCode: l.batchNumber,
                expiryDate: l.expiryDate,
              };
            })
          : undefined,
      });
    }
    promptPrintLabels(grnLines);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>
        {isPoLinked ? t('inventory.receiveGrn') : t('inventory.receiveWithoutPo')}
      </Text>

      {!isPoLinked ? (
        <>
          <Menu
            visible={supplierMenuOpen}
            onDismiss={() => setSupplierMenuOpen(false)}
            anchor={
              <Button onPress={() => setSupplierMenuOpen(true)}>
                {t('inventory.selectSupplier')}:{' '}
                {selectedSupplier?.name ?? '—'}
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

          <View style={styles.row}>
            <TextInput
              label={t('inventory.scanBarcode')}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              style={styles.flex}
            />
            <Button mode="contained" onPress={() => void scanBarcode()}>
              {t('inventory.addGrnLine')}
            </Button>
          </View>

          <Menu
            visible={productMenuOpen}
            onDismiss={() => setProductMenuOpen(false)}
            anchor={
              <Button mode="outlined" onPress={() => setProductMenuOpen(true)}>
                {t('inventory.selectProduct')}
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
          <Button
            mode="outlined"
            onPress={() => void addProductLine(addProductId)}
            disabled={!addProductId}>
            {t('inventory.addGrnLine')}
          </Button>
        </>
      ) : null}

      {lines.map((l, idx) => (
        <Card key={l.id} style={styles.card}>
          <Card.Content>
            <Text>{l.productName}</Text>
            {!isPoLinked ? (
              <Button mode="text" textColor="#DC2626" onPress={() => setLines(prev => prev.filter(x => x.id !== l.id))}>
                {t('inventory.removeGrnLine')}
              </Button>
            ) : null}
            <TextInput
              label={t('inventory.receivedQty')}
              value={l.receivedInput}
              onChangeText={v => {
                const next = [...lines];
                next[idx] = {...l, receivedInput: v};
                setLines(next);
              }}
              keyboardType="decimal-pad"
            />
            <TextInput
              label={t('inventory.batchNumber')}
              value={l.batch}
              onChangeText={v => {
                const next = [...lines];
                next[idx] = {...l, batch: v};
                setLines(next);
              }}
            />
            <TextInput
              label={t('inventory.expiryDate')}
              value={l.expiry}
              onChangeText={v => {
                const next = [...lines];
                next[idx] = {...l, expiry: v};
                setLines(next);
              }}
              placeholder="YYYY-MM-DD"
            />
            <TextInput
              label={t('inventory.serialNumbers')}
              value={l.serials}
              onChangeText={v => {
                const next = [...lines];
                next[idx] = {...l, serials: v};
                setLines(next);
              }}
              placeholder="IMEI1, IMEI2"
            />
          </Card.Content>
        </Card>
      ))}
      <Button mode="contained" onPress={() => void post()} disabled={lines.length === 0}>
        {t('inventory.postGrn')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 12, gap: 8},
  title: {fontSize: 18, fontWeight: '600'},
  card: {marginBottom: 8},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  flex: {flex: 1},
});
