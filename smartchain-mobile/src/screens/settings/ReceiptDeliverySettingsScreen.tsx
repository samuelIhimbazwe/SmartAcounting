import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, List, Switch} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {
  loadReceiptDeliveryConfig,
  saveReceiptDeliveryConfig,
  type ReceiptDeliveryMode,
} from '../../services/receiptDeliveryConfig';

export function ReceiptDeliverySettingsScreen() {
  const {t} = useTranslation();
  const [cfg, setCfg] = useState(loadReceiptDeliveryConfig);

  const setMode = (mode: ReceiptDeliveryMode) => {
    const next = {...cfg, mode};
    setCfg(next);
    saveReceiptDeliveryConfig(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>{t('receiptDelivery.settingsTitle')}</Text>
      <List.Item
        title={t('receiptDelivery.whatsapp')}
        right={() => (
          <Switch
            value={cfg.whatsappEnabled}
            onValueChange={v => {
              const next = {...cfg, whatsappEnabled: v};
              setCfg(next);
              saveReceiptDeliveryConfig(next);
            }}
          />
        )}
      />
      <List.Item
        title={t('receiptDelivery.modeAsk')}
        onPress={() => setMode('ask')}
        right={() => (cfg.mode === 'ask' ? <List.Icon icon="check" /> : null)}
      />
      <List.Item
        title={t('receiptDelivery.modeAlways')}
        onPress={() => setMode('always')}
        right={() => (cfg.mode === 'always' ? <List.Icon icon="check" /> : null)}
      />
      <List.Item
        title={t('receiptDelivery.modeNever')}
        onPress={() => setMode('never')}
        right={() => (cfg.mode === 'never' ? <List.Icon icon="check" /> : null)}
      />
      <Button mode="contained" style={styles.btn} onPress={() => saveReceiptDeliveryConfig(cfg)}>
        {t('common.save', 'Save')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, paddingTop: 8},
  section: {fontSize: 14, fontWeight: '600', marginLeft: 16, marginTop: 8, color: '#666'},
  btn: {margin: 16},
});
