import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-paper';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useBarcode} from '../../hooks/useBarcode';
import type {PosStackParamList} from '../../navigation/PosNavigator';

type Nav = NativeStackNavigationProp<PosStackParamList, 'Barcode'>;

export default function BarcodeScreen() {
  const navigation = useNavigation<Nav>();
  const {lookupAndAddProduct} = useBarcode();
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    void Camera.requestCameraPermission().then(s => setHasPermission(s === 'granted'));
  }, []);

  const onCode = useCallback(
    async (code: string) => {
      await lookupAndAddProduct(code);
      navigation.goBack();
    },
    [lookupAndAddProduct, navigation],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'code-128', 'code-39', 'qr'],
    onCodeScanned: codes => {
      const v = codes[0]?.value;
      if (v) {
        void onCode(v);
      }
    },
  });

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

  return (
    <View style={styles.fill}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <Button mode="contained" onPress={() => navigation.goBack()} contentStyle={styles.btnInner}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  center: {flex: 1, justifyContent: 'center', padding: 16},
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  btn: {marginTop: 16},
  btnInner: {minHeight: 48},
});
