import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useTranslation} from 'react-i18next';

type Props = {
  description: string;
  impactSummary?: string;
  busy?: boolean;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  onAskMore: () => void;
};

export function ApprovalCard({
  description,
  impactSummary,
  busy,
  onApprove,
  onReject,
  onAskMore,
}: Props) {
  const {t} = useTranslation();
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('copilot.approvalWaiting')}</Text>
      <Text style={styles.body}>{description}</Text>
      {impactSummary ? (
        <Text style={styles.impact}>{impactSummary}</Text>
      ) : null}
      {rejectMode ? (
        <TextInput
          label={t('copilot.rejectReason')}
          value={reason}
          onChangeText={setReason}
          style={styles.reason}
        />
      ) : null}
      <View style={styles.row}>
        <Button
          mode="contained"
          buttonColor="#16A34A"
          disabled={busy}
          onPress={onApprove}
          style={styles.btn}>
          {t('copilot.approve')}
        </Button>
        <Button
          mode="contained"
          buttonColor="#DC2626"
          disabled={busy}
          onPress={() => {
            if (!rejectMode) {
              setRejectMode(true);
              return;
            }
            onReject(reason.trim() || undefined);
          }}
          style={styles.btn}>
          {t('copilot.reject')}
        </Button>
      </View>
      <Button mode="outlined" disabled={busy} onPress={onAskMore}>
        {t('copilot.askMore')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  title: {fontWeight: '700', marginBottom: 6, color: '#92400E'},
  body: {color: '#78350F', marginBottom: 6},
  impact: {color: '#57534E', marginBottom: 8, fontStyle: 'italic'},
  reason: {marginBottom: 8, backgroundColor: '#FFFFFF'},
  row: {flexDirection: 'row', gap: 8, marginBottom: 8},
  btn: {flex: 1},
});
