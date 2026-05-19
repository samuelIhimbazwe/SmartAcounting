import React, {useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Card} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import type {AppDispatch, RootState} from '../../store';
import {clearTillSession} from '../../store/slices/tillSlice';
import {clearCart} from '../../store/slices/posSlice';
import {runInventorySync} from '../../inventory/inventorySync';
import {
  selectLocation,
  type LocationSummary,
} from '../../store/slices/locationSlice';

export function LocationSettingsScreen() {
  const {t} = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const currentId = useSelector((s: RootState) => s.location.selectedLocationId);
  const currentName = useSelector((s: RootState) => s.location.selectedLocationName);
  const locations = useSelector((s: RootState) => s.location.accessibleLocations);
  const [switching, setSwitching] = useState(false);

  const switchTo = (loc: LocationSummary) => {
    if (loc.id === currentId || switching) {
      return;
    }
    setSwitching(true);
    dispatch(selectLocation(loc));
    dispatch(clearTillSession());
    dispatch(clearCart());
    void runInventorySync();
    setSwitching(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.current}>
        {t('locations.currentLocation')}: {currentName ?? '—'}
      </Text>
      <FlatList
        data={locations}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <Card
            style={styles.card}
            onPress={() => switchTo(item)}
            disabled={switching}>
            <Card.Content>
              <Text>{item.name}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  current: {fontSize: 16, fontWeight: '600', marginBottom: 12},
  card: {marginBottom: 8},
});
