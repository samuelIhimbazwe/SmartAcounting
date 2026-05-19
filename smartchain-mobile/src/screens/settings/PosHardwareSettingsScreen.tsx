import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Switch, TextInput} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {
  DEFAULT_HARDWARE_CONFIG,
  loadHardwareConfig,
  saveHardwareConfig,
  type HardwareConfig,
} from '../../hardware/printerConfig';

export function PosHardwareSettingsScreen() {
  const {t} = useTranslation();
  const [cfg, setCfg] = useState<HardwareConfig>(loadHardwareConfig);

  const patch = (partial: Partial<HardwareConfig>) => {
    const next = {...cfg, ...partial};
    setCfg(next);
    saveHardwareConfig(next);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.section}>{t('hardware.cashDrawer')}</Text>
      <View style={styles.row}>
        <Text>{t('hardware.cashDrawerEnabled')}</Text>
        <Switch
          value={cfg.cashDrawerEnabled}
          onValueChange={v => patch({cashDrawerEnabled: v})}
        />
      </View>

      <Text style={styles.section}>{t('hardware.plu')}</Text>
      <TextInput
        label={t('hardware.pluPrefix')}
        value={cfg.pluPrefixDigit}
        onChangeText={v => patch({pluPrefixDigit: v.slice(0, 1) || '2'})}
        keyboardType="number-pad"
        style={styles.field}
      />
      <View style={styles.row}>
        <Text>{t('hardware.pluWeightMode')}</Text>
        <Switch
          value={cfg.pluValueMode === 'weight'}
          onValueChange={v =>
            patch({pluValueMode: v ? 'weight' : 'price'})
          }
        />
      </View>
      <Text style={styles.hint}>
        {cfg.pluValueMode === 'weight'
          ? t('hardware.pluWeightHint')
          : t('hardware.pluPriceHint')}
      </Text>

      <Text style={styles.section}>{t('hardware.scanner')}</Text>
      <View style={styles.row}>
        <Text>{t('hardware.scannerMode')}</Text>
        <Switch
          value={cfg.scannerModeEnabled}
          onValueChange={v => patch({scannerModeEnabled: v})}
        />
      </View>
      <Text style={styles.hint}>{t('hardware.scannerModeHint')}</Text>

      <Text style={styles.section}>{t('hardware.poleDisplay')}</Text>
      <View style={styles.row}>
        <Text>{t('hardware.poleEnabled')}</Text>
        <Switch
          value={cfg.poleDisplayEnabled}
          onValueChange={v => patch({poleDisplayEnabled: v})}
        />
      </View>
      <TextInput
        label={t('hardware.poleHost')}
        value={cfg.poleDisplayHost}
        onChangeText={v => patch({poleDisplayHost: v})}
        style={styles.field}
        autoCapitalize="none"
      />
      <TextInput
        label={t('hardware.polePort')}
        value={String(cfg.poleDisplayPort)}
        onChangeText={v =>
          patch({poleDisplayPort: parseInt(v, 10) || DEFAULT_HARDWARE_CONFIG.poleDisplayPort})
        }
        keyboardType="number-pad"
        style={styles.field}
      />
      <TextInput
        label={t('hardware.storeName')}
        value={cfg.storeDisplayName}
        onChangeText={v => patch({storeDisplayName: v})}
        style={styles.field}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 16, gap: 8},
  section: {fontSize: 16, fontWeight: '700', marginTop: 12},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  field: {marginVertical: 4},
  hint: {fontSize: 12, color: '#64748B', marginBottom: 8},
});
