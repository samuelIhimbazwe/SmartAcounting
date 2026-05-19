import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, List} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../../store';
import type {AppRole} from '../../utils/roles';
import {canViewFiscalAudit} from '../../utils/roles';

type SettingsStackParamList = {
  SettingsHome: undefined;
  LanguageSettings: undefined;
  PrinterSettings: undefined;
  PosHardware: undefined;
  LocationSettings: undefined;
  AuditLog: undefined;
};

export function SettingsHomeScreen() {
  const {t} = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const showAudit = canViewFiscalAudit(roles);

  return (
    <View style={styles.wrap}>
      <List.Section>
        <Text style={styles.section}>{t('settings.title')}</Text>
        <List.Item
          title={t('settings.language')}
          left={props => <List.Icon {...props} icon="translate" />}
          onPress={() => navigation.navigate('LanguageSettings')}
        />
        <List.Item
          title={t('settings.printer')}
          left={props => <List.Icon {...props} icon="printer" />}
          onPress={() => navigation.navigate('PrinterSettings')}
        />
        <List.Item
          title={t('hardware.posTitle')}
          left={props => <List.Icon {...props} icon="barcode-scan" />}
          onPress={() => navigation.navigate('PosHardware')}
        />
        <List.Item
          title={t('locations.switchLocation')}
          description={t('locations.currentLocation')}
          left={props => <List.Icon {...props} icon="map-marker" />}
          onPress={() => navigation.navigate('LocationSettings')}
        />
        {showAudit ? (
          <List.Item
            title={t('audit.title')}
            left={props => <List.Icon {...props} icon="shield-check" />}
            onPress={() => navigation.navigate('AuditLog')}
          />
        ) : null}
      </List.Section>
      <Button mode="text" onPress={() => navigation.goBack()}>
        {t('common.cancel')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, paddingTop: 8},
  section: {fontSize: 14, fontWeight: '600', marginLeft: 16, marginTop: 8, color: '#666'},
});
