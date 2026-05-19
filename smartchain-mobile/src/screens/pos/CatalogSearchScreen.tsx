import React, {useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, List, Searchbar} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useDebouncedCatalogSearch} from '../../hooks/useDebouncedCatalogSearch';
import {useBarcode} from '../../hooks/useBarcode';
import type {PosStackParamList} from '../../navigation/PosNavigator';

type Nav = NativeStackNavigationProp<PosStackParamList, 'CatalogSearch'>;

export default function CatalogSearchScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const {lookupAndAddProduct} = useBarcode();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const {results, loading} = useDebouncedCatalogSearch(query, page);

  const pick = async (barcode: string) => {
    await lookupAndAddProduct(barcode);
    navigation.goBack();
  };

  return (
    <View style={styles.wrap}>
      <Searchbar
        placeholder={t('pos.searchCatalog', 'Search catalog')}
        value={query}
        onChangeText={v => {
          setQuery(v);
          setPage(0);
        }}
        autoFocus
      />
      <FlatList
        data={results}
        keyExtractor={item => `${item.productId}-${item.variantId ?? 'p'}`}
        renderItem={({item}) => (
          <List.Item
            title={item.name}
            description={`${item.sku} · ${item.barcode}`}
            onPress={() => void pick(item.barcode)}
          />
        )}
        ListFooterComponent={
          results.length >= 20 ? (
            <Button onPress={() => setPage(p => p + 1)}>
              {t('common.loadMore', 'Load more')}
            </Button>
          ) : null
        }
        ListEmptyComponent={
          !loading && query.trim() ? (
            <Text style={styles.empty}>{t('common.noResults', 'No results')}</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1},
  empty: {padding: 16, textAlign: 'center', color: '#6B7280'},
});
