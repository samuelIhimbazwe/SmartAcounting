import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import {Share} from 'react-native';
import type {RootState} from '../../store';
import {createQuote} from '../../customers/quoteRepository';

export default function QuoteBuilderScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const cart = useSelector((s: RootState) => s.pos.cart);
  const customerId = useSelector((s: RootState) => s.pos.customerId);
  const sessionCurrency = useSelector((s: RootState) => s.pos.sessionCurrency);
  const [expiry, setExpiry] = useState('');

  const total = cart.reduce((a, l) => a + l.lineTotal, 0);

  const save = async () => {
    await createQuote({
      customerId: customerId ?? undefined,
      currencyCode: sessionCurrency,
      cartJson: JSON.stringify(cart),
      totalAmount: total,
      expiryDate: expiry || undefined,
    });
    navigation.goBack();
  };

  const shareQuote = async () => {
    await Share.share({
      title: t('customers.quoteTitle'),
      message: `${t('customers.quoteTitle')}\n${total} ${sessionCurrency}\n${expiry ? `Expiry: ${expiry}` : ''}`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text>{t('customers.quoteLines')}: {cart.length}</Text>
      <Text>
        {t('pos.total')}: {total}
      </Text>
      <TextInput label={t('customers.expiryDate')} value={expiry} onChangeText={setExpiry} placeholder="YYYY-MM-DD" />
      <Button mode="contained" onPress={() => void save()}>
        {t('customers.saveQuote')}
      </Button>
      <Button mode="outlined" onPress={() => void shareQuote()}>
        {t('customers.shareQuote')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({wrap: {padding: 12, gap: 8}});
