import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, RadioButton, Text} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {
  getAppLanguage,
  setAppLanguage,
  type AppLanguage,
} from '../../i18n';

const OPTIONS: {code: AppLanguage; labelKey: string}[] = [
  {code: 'en', labelKey: 'settings.languageEn'},
  {code: 'fr', labelKey: 'settings.languageFr'},
  {code: 'rw', labelKey: 'settings.languageRw'},
];

export function LanguageSettingsScreen() {
  const {t} = useTranslation();
  const [selected, setSelected] = useState<AppLanguage>(getAppLanguage());
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setAppLanguage(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={styles.title}>
        {t('settings.language')}
      </Text>
      <RadioButton.Group
        value={selected}
        onValueChange={v => setSelected(v as AppLanguage)}>
        {OPTIONS.map(opt => (
          <RadioButton.Item
            key={opt.code}
            label={t(opt.labelKey)}
            value={opt.code}
          />
        ))}
      </RadioButton.Group>
      <Button mode="contained" loading={saving} onPress={() => void save()}>
        {t('common.submit')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 16, gap: 12},
  title: {marginBottom: 8},
});
