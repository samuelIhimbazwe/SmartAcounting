import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Button, Card} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {fetchLocations} from '../../api/locations';
import {
  selectLocation,
  setAccessibleLocations,
  type LocationSummary,
} from '../../store/slices/locationSlice';
import type {AppDispatch} from '../../store';

type Props = {
  onDone: () => void;
};

export default function LocationPickerScreen({onDone}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [rows, setRows] = useState<LocationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const remote = await fetchLocations();
        const mapped: LocationSummary[] = remote.map(l => ({
          id: l.id,
          name: l.name,
          locationCode: l.locationCode,
          currencyDefault: l.currencyDefault,
        }));
        dispatch(setAccessibleLocations(mapped));
        setRows(mapped);
        if (mapped.length === 1) {
          dispatch(selectLocation(mapped[0]));
          onDone();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [dispatch, onDone]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('locations.pickTitle')}</Text>
      {loading ? <Text>{t('common.loading')}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Card
            style={styles.card}
            onPress={() => {
              dispatch(selectLocation(item));
              onDone();
            }}>
            <Card.Content>
              <Text style={styles.name}>{item.name}</Text>
              {item.locationCode ? (
                <Text style={styles.sub}>{item.locationCode}</Text>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />
      <Button mode="outlined" disabled={rows.length === 0} onPress={onDone}>
        {t('common.continue')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 16},
  title: {fontSize: 20, fontWeight: '700', marginBottom: 12},
  card: {marginBottom: 8},
  name: {fontSize: 16, fontWeight: '600'},
  sub: {fontSize: 13, color: '#666'},
});
