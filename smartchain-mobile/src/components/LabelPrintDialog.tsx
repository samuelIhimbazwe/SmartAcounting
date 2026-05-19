import React, {useState} from 'react';
import {Button, Dialog, Menu, Portal, TextInput} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  labelPrinterService,
  type LabelFormat,
  type LabelType,
} from '../services/printer/LabelPrinterService';
import type {LabelPayload} from '../services/printer/LabelPrinterService';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  data: LabelPayload;
};

export function LabelPrintDialog({visible, onDismiss, data}: Props) {
  const {t} = useTranslation();
  const [labelType, setLabelType] = useState<LabelType>('price');
  const [format, setFormat] = useState<LabelFormat>('zpl');
  const [copies, setCopies] = useState('1');
  const [typeMenu, setTypeMenu] = useState(false);
  const [formatMenu, setFormatMenu] = useState(false);
  const [printing, setPrinting] = useState(false);

  const print = async () => {
    setPrinting(true);
    try {
      await labelPrinterService.printLabel({
        type: labelType,
        format,
        data,
        copies: parseInt(copies, 10) || 1,
      });
      Toast.show({type: 'success', text1: t('hardware.labelPrinted')});
      onDismiss();
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: t('hardware.labelPrintFailed'),
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{t('hardware.printLabel')}</Dialog.Title>
        <Dialog.Content>
          <Menu
            visible={typeMenu}
            onDismiss={() => setTypeMenu(false)}
            anchor={
              <Button onPress={() => setTypeMenu(true)}>
                {t(`hardware.labelType.${labelType}`)}
              </Button>
            }>
            {(['price', 'shelf', 'expiry'] as LabelType[]).map(ty => (
              <Menu.Item
                key={ty}
                title={t(`hardware.labelType.${ty}`)}
                onPress={() => {
                  setLabelType(ty);
                  setTypeMenu(false);
                }}
              />
            ))}
          </Menu>
          <Menu
            visible={formatMenu}
            onDismiss={() => setFormatMenu(false)}
            anchor={
              <Button onPress={() => setFormatMenu(true)}>
                {t(`hardware.labelFormat.${format}`)}
              </Button>
            }>
            <Menu.Item
              title={t('hardware.labelFormat.zpl')}
              onPress={() => {
                setFormat('zpl');
                setFormatMenu(false);
              }}
            />
            <Menu.Item
              title={t('hardware.labelFormat.escpos')}
              onPress={() => {
                setFormat('escpos');
                setFormatMenu(false);
              }}
            />
          </Menu>
          <TextInput
            label={t('hardware.labelCopies')}
            value={copies}
            onChangeText={setCopies}
            keyboardType="number-pad"
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button loading={printing} onPress={() => void print()}>
            {t('hardware.printLabel')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
