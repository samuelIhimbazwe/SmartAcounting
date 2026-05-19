import NetInfo from '@react-native-community/netinfo';
import {getItem, setItem} from '../utils/storage';
import {
  searchCatalogLocal,
  type CatalogSearchHit,
} from './productSearchIndex';

const MODEL_KEY = 'tflite_product_model_v1';
const MODEL_VERSION_KEY = 'tflite_product_model_version';

/** Lightweight on-device recognition — TFLite via react-native-fast-tflite when native module is linked. */
let modelReady = false;

export async function isProductModelReady(): Promise<boolean> {
  return modelReady || getItem(MODEL_KEY) === 'downloaded';
}

export async function downloadProductModelIfNeeded(): Promise<void> {
  if (await isProductModelReady()) {
    modelReady = true;
    return;
  }
  const net = await NetInfo.fetch();
  if (net.type !== 'wifi') {
    return;
  }
  // WHATSAPP_API_TODO-style placeholder: weekly model URL would be fetched here.
  setItem(MODEL_KEY, 'downloaded');
  setItem(MODEL_VERSION_KEY, String(Date.now()));
  modelReady = true;
}

/**
 * On-device inference stub — returns empty until TFLite weights are bundled.
 * Callers should fall back to catalog text search.
 */
export async function identifyProductsFromImage(
  _imageUri: string,
): Promise<CatalogSearchHit[]> {
  if (!(await isProductModelReady())) {
    return [];
  }
  return [];
}

export async function suggestProductsByVisualOrSearch(
  imageUri: string | null,
  textQuery: string,
): Promise<CatalogSearchHit[]> {
  if (imageUri) {
    const visual = await identifyProductsFromImage(imageUri);
    if (visual.length > 0) {
      return visual.slice(0, 3);
    }
  }
  if (textQuery.trim()) {
    return searchCatalogLocal(textQuery, 0).then(h => h.slice(0, 3));
  }
  return [];
}
