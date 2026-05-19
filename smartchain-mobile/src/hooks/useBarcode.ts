import {useCallback} from 'react';
import {Alert} from 'react-native';
import {useDispatch} from 'react-redux';
import {scanCatalog} from '../api/pos';
import {
  findVariantByBarcode,
  getProductWithVariants,
  upsertProductFromBalance,
} from '../inventory/inventoryRepository';
import {
  dispatchVariantToCart,
  showVariantPickerAlert,
} from '../inventory/variantCart';
import {addToCart} from '../store/slices/posSlice';

function mapCurrency(code: string): 'FRW' | 'USD' {
  const u = code?.toUpperCase() ?? 'FRW';
  return u === 'USD' ? 'USD' : 'FRW';
}

export function useBarcode() {
  const dispatch = useDispatch();

  const lookupAndAddProduct = useCallback(
    async (barcode: string, opts?: {serialNumber?: string}) => {
      const trimmed = barcode.trim();
      if (!trimmed) {
        return;
      }

      const local = await findVariantByBarcode(trimmed);
      if (local) {
        await dispatchVariantToCart(dispatch, local.product, local.variant, opts);
        return;
      }

      try {
        const scanned = await scanCatalog(trimmed);
        const product = await upsertProductFromBalance({
          productId: scanned.productId,
          sku: scanned.sku,
          productName: scanned.displayName,
          barcode: scanned.barcode,
          unitPrice: scanned.unitPrice,
          currencyCode: scanned.currencyCode,
          reorderPoint: scanned.reorderPoint,
        });

        const {variants} = await getProductWithVariants(product.id);
        if (variants.length > 1) {
          showVariantPickerAlert(product, variants, variant => {
            void dispatchVariantToCart(dispatch, product, variant, opts);
          });
          return;
        }

        if (variants.length === 1) {
          await dispatchVariantToCart(dispatch, product, variants[0], opts);
          return;
        }

        const currency = mapCurrency(scanned.currencyCode || 'FRW');
        const unitPrice = Number(scanned.unitPrice);
        dispatch(
          addToCart({
            catalogItemId: String(scanned.catalogItemId),
            barcode: scanned.barcode,
            sku: scanned.sku ?? '',
            name: scanned.displayName,
            quantity: 1,
            unitPrice,
            costPrice: 0,
            currency,
            lineTotal: unitPrice,
            margin: 0,
            serialNumber: opts?.serialNumber,
          }),
        );
      } catch (e) {
        console.error('Product lookup failed for barcode', barcode, e);
        Alert.alert('Not found', `No product for barcode ${trimmed}`);
      }
    },
    [dispatch],
  );

  return {lookupAndAddProduct};
}
