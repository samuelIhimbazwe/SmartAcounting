import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {database} from '../../db';
import {PromotionCache} from '../../db/models/PromotionCache';
import {fetchActivePromotions} from '../../api/customers';

export default function PromotionManageScreen() {
  const {t} = useTranslation();
  const [rows, setRows] = useState<PromotionCache[]>([]);

  const reload = async () => {
    try {
      const remote = await fetchActivePromotions();
      await database.write(async () => {
        const table = database.get<PromotionCache>('promotions_cache');
        const existing = await table.query().fetch();
        for (const e of existing) {
          await e.destroyPermanently();
        }
        for (const r of remote) {
          await table.create(p => {
            p.serverId = String(r.id ?? '');
            p.name = String(r.name ?? '');
            p.promotionType = String(r.promotionType ?? 'DISCOUNT_PCT');
            p.discountValue = Number(r.discountValue ?? 0);
            p.bundlePrice = Number(r.bundlePrice ?? 0);
            p.buyQuantity = Number(r.buyQuantity ?? 0);
            p.getQuantity = Number(r.getQuantity ?? 0);
            p.minimumPurchase = Number(r.minimumPurchase ?? 0);
            p.maximumDiscount = Number(r.maximumDiscount ?? 0);
            p.active = String(r.status ?? 'ACTIVE') === 'ACTIVE';
            p.allowStack = Boolean(r.allowStack);
          });
        }
      });
    } catch {
      /* local only */
    }
    setRows(await database.get<PromotionCache>('promotions_cache').query().fetch());
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text>{t('customers.promotionsHint')}</Text>
      {rows.map(p => (
        <Text key={p.id} style={styles.row}>
          {p.name} · {p.promotionType} · {p.active ? 'ON' : 'OFF'}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({wrap: {padding: 12, gap: 8}, row: {marginTop: 8}});
