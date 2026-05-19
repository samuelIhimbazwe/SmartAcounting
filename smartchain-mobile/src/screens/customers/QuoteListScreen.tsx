import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'react-redux';
import {listQuotes} from '../../customers/quoteRepository';
import {convertQuoteToCheckoutPayload} from '../../customers/quoteConvert';
import {loadCartFromQuote} from '../../store/slices/posSlice';
import type {CustomerStackParamList} from '../../navigation/CustomerNavigator';
import type {SalesQuote} from '../../db/models/SalesQuote';
import type {AppDispatch} from '../../store';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CustomerStackParamList, 'QuoteList'>,
  BottomTabNavigationProp<{POS: undefined; Customers: undefined}>
>;

export default function QuoteListScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const [rows, setRows] = useState<SalesQuote[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listQuotes().then(setRows);
    }, []),
  );

  const convertToSale = async (quoteId: string) => {
    const payload = await convertQuoteToCheckoutPayload(quoteId);
    if (!payload) {
      Toast.show({type: 'error', text1: t('customers.convertQuoteFailed')});
      return;
    }
    dispatch(
      loadCartFromQuote({
        cart: payload.cart,
        customer: payload.customer,
        currency: payload.currency,
      }),
    );
    navigation.navigate('POS');
    Toast.show({type: 'success', text1: t('customers.convertQuoteSuccess')});
  };

  return (
    <View style={styles.wrap}>
      <Button mode="contained" onPress={() => navigation.navigate('QuoteBuilder', {})}>
        {t('customers.newQuote')}
      </Button>
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text>
                {item.status} · {item.totalAmount} {item.currencyCode}
              </Text>
              <Text>{item.expiryDate ?? '—'}</Text>
              {item.status === 'OPEN' ? (
                <View style={styles.actions}>
                  <Button
                    compact
                    mode="outlined"
                    onPress={() => navigation.navigate('QuoteBuilder', {quoteId: item.id})}>
                    {t('customers.viewQuote')}
                  </Button>
                  <Button
                    compact
                    mode="contained"
                    onPress={() => void convertToSale(item.id)}>
                    {t('customers.convertToSale')}
                  </Button>
                </View>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12, gap: 8},
  card: {marginBottom: 8},
  actions: {flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap'},
});
