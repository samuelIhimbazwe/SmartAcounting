import {Platform, StyleSheet} from 'react-native';
import {colors, fontSize} from './tokens';

export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const textStyles = StyleSheet.create({
  screenTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray900,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.65,
    color: colors.gray500,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: '400',
    color: colors.gray700,
  },
  secondary: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    color: colors.gray500,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: '400',
    color: colors.gray400,
  },
  amount: {
    fontFamily: monoFont,
    fontVariant: ['tabular-nums'],
    color: colors.gray900,
  },
  amountLg: {
    fontFamily: monoFont,
    fontVariant: ['tabular-nums'],
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
  },
});
