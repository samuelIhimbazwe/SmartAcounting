import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import type {DashboardStackParamList} from '../../navigation/DashboardNavigator';
import {
  fetchDemandForecast,
  type DemandForecastItem,
} from '../../api/aiAnalytics';

type Route = RouteProp<DashboardStackParamList, 'DemandForecast'>;
type Nav = NativeStackNavigationProp<DashboardStackParamList>;

export default function DemandForecastScreen() {
  const {t} = useTranslation();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<DemandForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDemandForecast(route.params?.horizonDays ?? 7)
      .then(r => setItems(r.items ?? []))
      .finally(() => setLoading(false));
  }, [route.params?.horizonDays]);

  const createPoForGaps = () => {
    const gaps = items.filter(i => i.willRunOutBeforeDelivery && i.gapQuantity > 0);
    if (gaps.length === 0) {
      Toast.show({type: 'info', text1: t('intelligence.noGaps')});
      return;
    }
    Toast.show({type: 'success', text1: t('intelligence.draftPoCreated')});
    navigation.getParent()?.navigate('Stock' as never, {screen: 'Reorder'} as never);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>{loading ? t('common.loading') : t('intelligence.forecastTitle')}</Text>
      <Button mode="contained" onPress={() => void createPoForGaps()}>
        {t('intelligence.createPoFromForecast')}
      </Button>
      <FlatList
        data={items}
        keyExtractor={i => i.productId}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Title title={item.name} subtitle={item.sku} />
            <Card.Content>
              <Text>
                {t('intelligence.stock')}: {item.currentStock} · {t('intelligence.predicted')}:{' '}
                {item.predictedDemand}
              </Text>
              {item.willRunOutBeforeDelivery ? (
                <Text style={styles.warn}>{t('intelligence.willRunOut')}</Text>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  h: {fontSize: 16, fontWeight: '700', marginBottom: 8},
  card: {marginBottom: 8},
  warn: {color: '#DC2626', marginTop: 4, fontWeight: '600'},
});
