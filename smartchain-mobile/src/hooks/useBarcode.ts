import {useCallback} from 'react';
import {Alert} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import type {RootState} from '../store';
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
import {loadPriceListContext} from '../pricing/priceListContext';
import {loadHardwareConfig} from '../hardware/printerConfig';
import {parsePluBarcode} from '../hardware/pluParser';
import {poleDisplayService} from '../services/printer/PoleDisplayService';

function mapCurrency(code: string): 'FRW' | 'USD' {
  const u = code?.toUpperCase() ?? 'FRW';
  return u === 'USD' ? 'USD' : 'FRW';
}

export function useBarcode() {
  const dispatch = useDispatch();
  const priceListId = useSelector(
    (s: RootState) => s.pos.selectedCustomer?.priceListId,
  );
  const locationId = useSelector(
    (s: RootState) => s.location.selectedLocationId,
  );

  const lookupAndAddProduct = useCallback(
    async (barcode: string, opts?: {serialNumber?: string}) => {
      const ctx = await loadPriceListContext(locationId);
      const cartOpts = {
        ...opts,
        priceListId,
        locationId,
        branchPriceListId: ctx.branchPriceListId,
        globalPriceListId: ctx.globalPriceListId,
      };
      const trimmed = barcode.trim();
      if (!trimmed) {
        return;
      }

      const hw = loadHardwareConfig();
      const plu = parsePluBarcode(trimmed, {
        prefixDigit: hw.pluPrefixDigit,
        valueMode: hw.pluValueMode,
      });
      const lookupCode = plu?.productLookupCode ?? trimmed;
      const scanQty = plu?.quantity;

      const local = await findVariantByBarcode(lookupCode);
      if (local) {
        await dispatchVariantToCart(dispatch, local.product, local.variant, {
          ...cartOpts,
          quantity: scanQty,
        });
        const price = local.variant.priceOverride ?? local.product.baseUnitPrice;
        void poleDisplayService.lineItem(
          local.product.name,
          String(price),
        );
        return;
      }

      try {
        const scanned = await scanCatalog(lookupCode);
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
            void dispatchVariantToCart(dispatch, product, variant, cartOpts);
          });
          return;
        }

        if (variants.length === 1) {
          await dispatchVariantToCart(dispatch, product, variants[0], {
            ...cartOpts,
            quantity: scanQty,
          });
          return;
        }

        const currency = mapCurrency(scanned.currencyCode || 'FRW');
        const unitPrice = Number(scanned.unitPrice);
        const qty = scanQty ?? 1;
        dispatch(
          addToCart({
            catalogItemId: String(scanned.catalogItemId),
            barcode: scanned.barcode,
            sku: scanned.sku ?? '',
            name: scanned.displayName,
            quantity: qty,
            unitPrice,
            costPrice: 0,
            currency,
            lineTotal: unitPrice * qty,
            margin: 0,
            serialNumber: opts?.serialNumber,
          }),
        );
      } catch (e) {
        console.error('Product lookup failed for barcode', barcode, e);
        Alert.alert('Not found', `No product for barcode ${trimmed}`);
      }
    },
    [dispatch, priceListId, locationId],
  );

  return {lookupAndAddProduct};
}
