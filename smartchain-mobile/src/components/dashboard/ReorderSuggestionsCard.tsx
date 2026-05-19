import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSelector, useDispatch} from 'react-redux';
import type {RootState, AppDispatch} from '../../store';
import {fetchReorderSuggestions} from '../../api/aiAnalytics';
import {dismissReorderSuggestion} from '../../store/slices/intelligenceSlice';
import Toast from 'react-native-toast-message';

export function ReorderSuggestionsCard() {
  const {t} = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const count = useSelector((s: RootState) => s.intelligence.reorderCount);
  const [reviewing, setReviewing] = useState(false);
  const navigation = useNavigation();

  if (count <= 0) {
    return null;
  }

  const approveAll = async () => {
    try {
      const res = await fetchReorderSuggestions();
      Toast.show({
        type: 'success',
        text1: t('intelligence.reorderApproved', {count: res.count}),
      });
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : t('common.error'),
      });
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Title
        title={t('intelligence.reorderCardTitle', {count})}
        subtitle={t('intelligence.reorderCardSub')}
      />
      <Card.Content>
        {reviewing ? (
          <Text>{t('intelligence.reorderReviewHint')}</Text>
        ) : null}
        <View style={styles.row}>
          <Button mode="contained" onPress={() => void approveAll()}>
            {t('intelligence.approveAll')}
          </Button>
          <Button mode="outlined" onPress={() => setReviewing(v => !v)}>
            {t('intelligence.reviewEach')}
          </Button>
        </View>
        {reviewing ? (
          <Button
            mode="text"
            onPress={() =>
              navigation.navigate('Stock' as never, {screen: 'Reorder'} as never)
            }>
            {t('intelligence.openReorder')}
          </Button>
        ) : null}
        <Button
          mode="text"
          onPress={() => dispatch(dismissReorderSuggestion('all'))}>
          {t('intelligence.dismiss7d')}
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: 12},
  row: {flexDirection: 'row', gap: 8, marginTop: 8},
});
