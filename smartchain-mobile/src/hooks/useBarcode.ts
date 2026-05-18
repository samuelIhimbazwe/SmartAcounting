import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {scanCatalog} from '../api/pos';
import {addToCart} from '../store/slices/posSlice';

function mapCurrency(code: string): 'FRW' | 'USD' {
  const u = code?.toUpperCase() ?? 'FRW';
  if (u === 'USD') {
    return 'USD';
  }
  return 'FRW';
}

export function useBarcode() {
  const dispatch = useDispatch();

  const lookupAndAddProduct = useCallback(
    async (barcode: string) => {
      try {
        const product = await scanCatalog(barcode.trim());
        const currency = mapCurrency(product.currencyCode || 'FRW');
        const unitPrice = Number(product.unitPrice);
        const qty = 1;
        dispatch(
          addToCart({
            catalogItemId: String(product.catalogItemId),
            barcode: product.barcode,
            sku: product.sku ?? '',
            name: product.displayName,
            quantity: qty,
            unitPrice,
            costPrice: 0,
            currency,
            lineTotal: unitPrice * qty,
            margin: 0,
          }),
        );
      } catch (e) {
        console.error('Product lookup failed for barcode', barcode, e);
      }
    },
    [dispatch],
  );

  return {lookupAndAddProduct};
}
