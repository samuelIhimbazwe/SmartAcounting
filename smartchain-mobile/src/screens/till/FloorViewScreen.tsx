import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {Card} from 'react-native-paper';
import {useTranslation} from 'react-i18next';
import {fetchFloorSessions, type TillSessionDto} from '../../api/tillSessions';

const POLL_MS = 60_000;

export default function FloorViewScreen() {
  const {t} = useTranslation();
  const [rows, setRows] = useState<TillSessionDto[]>([]);

  const reload = useCallback(() => {
    void fetchFloorSessions()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, POLL_MS);
    return () => clearInterval(id);
  }, [reload]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>{t('locations.floorView')}</Text>
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text>{t('locations.noOpenTills')}</Text>}
        renderItem={({item}) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.reg}>{item.posRegisterCode}</Text>
              <Text>
                {t('locations.status')}: {item.status}
              </Text>
              <Text>
                {t('locations.float')}: {item.openingFloat}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1, padding: 12},
  h: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  card: {marginBottom: 8},
  reg: {fontSize: 16, fontWeight: '700'},
});
