import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Searchbar} from 'react-native-paper';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useBarcode} from '../../hooks/useBarcode';
import type {PosStackParamList} from '../../navigation/PosNavigator';
import {
  downloadProductModelIfNeeded,
  isProductModelReady,
  suggestProductsByVisualOrSearch,
} from '../../services/productRecognition';
import type {CatalogSearchHit} from '../../services/productSearchIndex';

type Nav = NativeStackNavigationProp<PosStackParamList, 'Barcode'>;

export default function BarcodeScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const {lookupAndAddProduct} = useBarcode();
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [scanMisses, setScanMisses] = useState(0);
  const [identifyMode, setIdentifyMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CatalogSearchHit[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const lastScanRef = useRef(0);

  useEffect(() => {
    void Camera.requestCameraPermission().then(s => setHasPermission(s === 'granted'));
    void downloadProductModelIfNeeded().then(() =>
      isProductModelReady().then(setModelReady),
    );
  }, []);

  const onCode = useCallback(
    async (code: string) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1500) {
        return;
      }
      lastScanRef.current = now;
      try {
        await lookupAndAddProduct(code);
        navigation.goBack();
      } catch {
        setScanMisses(m => m + 1);
      }
    },
    [lookupAndAddProduct, navigation],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'code-128', 'code-39', 'qr'],
    onCodeScanned: codes => {
      const v = codes[0]?.value;
      if (v && !identifyMode) {
        void onCode(v);
      }
    },
  });

  const runIdentify = async () => {
    setIdentifyMode(true);
    const hits = await suggestProductsByVisualOrSearch(null, searchQuery);
    setSuggestions(hits);
  };

  const pickSuggestion = async (hit: CatalogSearchHit) => {
    await lookupAndAddProduct(hit.barcode);
    navigation.goBack();
  };

  if (!device || !hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Camera permission required for barcode scanning.</Text>
        <Button onPress={() => navigation.goBack()} style={styles.btn} contentStyle={styles.btnInner}>
          Back
        </Button>
      </View>
    );
  }

  if (identifyMode && !modelReady) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          {t('pos.identifySearchFallback', 'Model not downloaded — search by name or SKU')}
        </Text>
        <Searchbar
          placeholder={t('pos.searchCatalog', 'Search catalog')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => void runIdentify()}
        />
        {suggestions.map(hit => (
          <Button key={hit.barcode} onPress={() => void pickSuggestion(hit)}>
            {hit.name}
          </Button>
        ))}
        <Button onPress={() => navigation.goBack()}>{t('common.cancel')}</Button>
      </View>
    );
  }

  if (identifyMode) {
    return (
      <View style={styles.center}>
        <Text>{t('pos.identifyTop3', 'Top matches')}</Text>
        {suggestions.map(hit => (
          <Button key={hit.barcode} mode="contained-tonal" onPress={() => void pickSuggestion(hit)}>
            {hit.name}
          </Button>
        ))}
        <Button onPress={() => setIdentifyMode(false)}>{t('common.back', 'Back')}</Button>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        {scanMisses > 0 ? (
          <Button
            mode="contained-tonal"
            onPress={() => void runIdentify()}
            contentStyle={styles.btnInner}>
            {t('pos.identifyByCamera', 'Identify by camera')}
          </Button>
        ) : null}
        <Button mode="outlined" onPress={() => navigation.navigate('CatalogSearch')}>
          {t('pos.searchCatalog', 'Search catalog')}
        </Button>
        <Button mode="contained" onPress={() => navigation.goBack()} contentStyle={styles.btnInner}>
          {t('common.cancel')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  center: {flex: 1, justifyContent: 'center', padding: 16, gap: 8},
  hint: {marginBottom: 8, textAlign: 'center'},
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    gap: 8,
  },
  btn: {marginTop: 16},
  btnInner: {minHeight: 48},
});
