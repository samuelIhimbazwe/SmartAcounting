import {Alert} from 'react-native';
import type {AppDispatch} from '../store';
import {addToCart, type CartItem} from '../store/slices/posSlice';
import type {Product} from '../db/models/Product';
import type {ProductVariant} from '../db/models/ProductVariant';
import {
  getSaleUomLabel,
  pickCheckoutBatch,
  variantLabel,
} from './inventoryRepository';
import {resolveCheckoutUnitPrice} from '../pricing/resolveCheckoutPrice';
import {hapticLight} from '../utils/haptics';

function mapCurrency(code: string): 'FRW' | 'USD' {
  const u = code?.toUpperCase() ?? 'FRW';
  return u === 'USD' ? 'USD' : 'FRW';
}

export function buildCartItemFromVariant(
  product: Product,
  variant: ProductVariant,
  opts?: {serialNumber?: string; quantity?: number},
): Omit<CartItem, 'lineTotal' | 'margin' | 'costPrice'> & {
  unitPrice: number;
  quantity: number;
} {
  const unitPrice = variant.priceOverride ?? product.baseUnitPrice ?? 0;
  const qty = opts?.quantity ?? 1;
  return {
    catalogItemId: variant.id,
    productId: product.id,
    variantId: variant.id,
    barcode: variant.barcode,
    sku: variant.sku,
    name: product.name,
    variantLabel: variantLabel(variant),
    quantity: qty,
    unitPrice,
    currency: mapCurrency(product.currencyCode || 'FRW'),
    requiresSerial: product.isSerialTracked,
    serialNumber: opts?.serialNumber,
  };
}

export async function dispatchVariantToCart(
  dispatch: AppDispatch,
  product: Product,
  variant: ProductVariant,
  opts?: {
    serialNumber?: string;
    quantity?: number;
    priceListId?: string | null;
    locationId?: string | null;
    branchPriceListId?: string | null;
    globalPriceListId?: string | null;
  },
): Promise<void> {
  const base = buildCartItemFromVariant(product, variant, opts);
  const unitPrice = await resolveCheckoutUnitPrice({
    locationId: opts?.locationId,
    branchPriceListId: opts?.branchPriceListId,
    customerPriceListId: opts?.priceListId,
    globalPriceListId: opts?.globalPriceListId,
    productId: product.id,
    variantId: variant.id,
    fallback: base.unitPrice,
  });
  base.unitPrice = unitPrice;
  const uomLabel = await getSaleUomLabel(product.id);
  const batch = await pickCheckoutBatch(variant.id, base.quantity);
  dispatch(
    addToCart({
      ...base,
      uomLabel,
      costPrice: 0,
      lineTotal: unitPrice * base.quantity,
      margin: 0,
      batchNumber: batch?.batchNumber,
      batchExpiry: batch?.expiryDate,
    }),
  );
  hapticLight();
}

export function showVariantPickerAlert(
  product: Product,
  variants: ProductVariant[],
  onPick: (variant: ProductVariant) => void,
): void {
  Alert.alert(
    product.name,
    'Select variant',
    [
      ...variants.map(v => ({
        text: `${variantLabel(v)} (${v.stockQty})`,
        onPress: () => onPick(v),
      })),
      {text: 'Cancel', style: 'cancel'},
    ],
    {cancelable: true},
  );
}
