import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {
  addTenderLine,
  removeTenderLine,
  setTenderLineReference,
  setTenderLineType,
  updateTenderLine,
} from '../../store/slices/posSlice';
import {verifyMomoTransaction} from '../../api/payments';
import {formatMoney, type CurrencyCode} from '../../utils/currency';
import type {AppRole} from '../../utils/roles';
import {canUseOnAccountTender} from '../../utils/roles';
import {
  sumTenderLines,
  type TenderType,
} from '../../utils/tenderValidation';
import {Badge, BottomSheet, Button, Input} from '../../components/ui';
import {colors, spacing} from '../../theme/tokens';
import {textStyles} from '../../theme/typography';

const BASE_TENDERS: TenderType[] = ['CASH', 'MOMO', 'AIRTEL_MONEY', 'CARD'];

type MomoVerifyState = {
  status: 'idle' | 'pending' | 'ok' | 'fail';
  message?: string;
};

export interface PaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  total: number;
  sessionCurrency: CurrencyCode;
  processing: boolean;
  onComplete: () => void;
  onLayaway?: () => void;
  showLayaway?: boolean;
  completeLabel: string;
  momoVerify: Record<number, MomoVerifyState>;
  setMomoVerify: React.Dispatch<
    React.SetStateAction<Record<number, MomoVerifyState>>
  >;
  ussdSecondsLeft: number;
}

export function PaymentBottomSheet({
  visible,
  onClose,
  total,
  sessionCurrency,
  processing,
  onComplete,
  onLayaway,
  showLayaway,
  completeLabel,
  momoVerify,
  setMomoVerify,
  ussdSecondsLeft,
}: PaymentBottomSheetProps) {
  const {t} = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const tenderLines = useSelector((s: RootState) => s.pos.tenderLines);
  const selectedCustomer = useSelector((s: RootState) => s.pos.selectedCustomer);
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];

  const isMomoTender = (tt: TenderType) =>
    tt === 'MOMO' || tt === 'AIRTEL_MONEY';

  const showOnAccount =
    canUseOnAccountTender(roles) && (selectedCustomer?.creditLimit ?? 0) > 0;
  const tenderOptions = showOnAccount
    ? [...BASE_TENDERS, 'ON_ACCOUNT' as TenderType]
    : BASE_TENDERS;

  const tenderSum = useMemo(() => sumTenderLines(tenderLines), [tenderLines]);

  const tenderLabel = (type: TenderType) => {
    const map: Record<TenderType, string> = {
      CASH: t('pos.tenderCash'),
      MOMO: t('pos.tenderMomo'),
      AIRTEL_MONEY: t('pos.tenderAirtel'),
      CARD: t('pos.tenderCard'),
      ON_ACCOUNT: t('pos.tenderOnAccount'),
    };
    return map[type];
  };

  const verifyMomoLine = async (index: number) => {
    const line = tenderLines[index];
    if (!line || !isMomoTender(line.tenderType)) {
      return;
    }
    const code = line.reference?.trim();
    if (!code) {
      Toast.show({type: 'error', text1: t('payments.ussdCode')});
      return;
    }
    setMomoVerify(v => ({...v, [index]: {status: 'pending'}}));
    const provider = line.tenderType === 'AIRTEL_MONEY' ? 'AIRTEL_MONEY' : 'MTN';
    try {
      const res = await Promise.race([
        verifyMomoTransaction({
          transactionCode: code,
          provider,
          amount: line.amount || total,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 90_000),
        ),
      ]);
      if (res.status === 'CONFIRMED') {
        setMomoVerify(v => ({
          ...v,
          [index]: {status: 'ok', message: t('payments.verified')},
        }));
      } else {
        setMomoVerify(v => ({
          ...v,
          [index]: {status: 'fail', message: res.message ?? t('payments.verifyFailed')},
        }));
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message === 'timeout'
          ? t('payments.verifyTimeout')
          : t('payments.verifyFailed');
      setMomoVerify(v => ({...v, [index]: {status: 'fail', message: msg}}));
    }
  };

  return (
    <BottomSheet visible={visible} title={t('pos.paymentMethod')} onClose={onClose}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {tenderLines.map((line, index) => (
          <View key={`${line.tenderType}-${index}`} style={styles.tenderBlock}>
            <Text style={textStyles.sectionHeader}>{t('pos.paymentMethod')}</Text>
            <View style={styles.chipRow}>
              {tenderOptions.map(tt => (
                <Button
                  key={tt}
                  variant={line.tenderType === tt ? 'primary' : 'secondary'}
                  onPress={() =>
                    dispatch(setTenderLineType({index, tenderType: tt}))
                  }
                  style={styles.chip}>
                  {tenderLabel(tt)}
                </Button>
              ))}
            </View>
            <Input
              label={t('pos.tenderAmount')}
              keyboardType="decimal-pad"
              value={line.amount ? String(line.amount) : ''}
              onChangeText={v =>
                dispatch(
                  updateTenderLine({
                    index,
                    amount: parseFloat(v) || 0,
                  }),
                )
              }
            />
            {isMomoTender(line.tenderType) && line.amount > 0 ? (
              <>
                <Text style={textStyles.secondary}>
                  {t('payments.ussdPrompt')}{' '}
                  {ussdSecondsLeft > 0
                    ? t('payments.ussdCountdown', {seconds: ussdSecondsLeft})
                    : t('payments.ussdExpired')}
                </Text>
                <Input
                  label={t('payments.ussdCode')}
                  value={line.reference ?? ''}
                  onChangeText={v => {
                    dispatch(setTenderLineReference({index, reference: v}));
                    setMomoVerify(m => ({...m, [index]: {status: 'idle'}}));
                  }}
                />
                <Button
                  variant="secondary"
                  loading={momoVerify[index]?.status === 'pending'}
                  onPress={() => void verifyMomoLine(index)}>
                  {momoVerify[index]?.status === 'pending'
                    ? t('payments.verifying')
                    : t('payments.verifyMomo')}
                </Button>
                {momoVerify[index]?.message ? (
                  <Badge
                    variant={
                      momoVerify[index]?.status === 'ok' ? 'success' : 'error'
                    }>
                    {momoVerify[index]?.message}
                  </Badge>
                ) : null}
              </>
            ) : null}
            {tenderLines.length > 1 ? (
              <Button variant="ghost" onPress={() => dispatch(removeTenderLine(index))}>
                {t('pos.removeTenderLine')}
              </Button>
            ) : null}
          </View>
        ))}

        <View style={styles.chipRow}>
          {tenderOptions.map(tt => {
            if (tenderLines.some(l => l.tenderType === tt)) {
              return null;
            }
            return (
              <Button
                key={tt}
                variant="secondary"
                onPress={() => dispatch(addTenderLine(tt))}
                style={styles.chip}>
                + {tenderLabel(tt)}
              </Button>
            );
          })}
        </View>

        <Text style={textStyles.body}>
          {t('pos.tenderTotal')}:{' '}
          <Text style={textStyles.amount}>
            {formatMoney(tenderSum, sessionCurrency)}
          </Text>{' '}
          / {t('pos.saleTotal')}:{' '}
          <Text style={textStyles.amount}>
            {formatMoney(total, sessionCurrency)}
          </Text>
        </Text>
      </ScrollView>

      <Button
        fullWidth
        loading={processing}
        disabled={processing || tenderSum + 0.001 < total}
        onPress={onComplete}>
        {completeLabel}
      </Button>
      {showLayaway && onLayaway ? (
        <Button
          fullWidth
          variant="secondary"
          loading={processing}
          disabled={processing}
          onPress={onLayaway}>
          {t('customers.createLayaway')}
        </Button>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 420,
  },
  tenderBlock: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
  },
});
