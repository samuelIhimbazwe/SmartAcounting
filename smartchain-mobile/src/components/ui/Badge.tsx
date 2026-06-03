import React, {type ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSize, radius, spacing} from '../../theme/tokens';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const palette: Record<BadgeVariant, {bg: string; text: string}> = {
  success: {bg: colors.successBg, text: colors.success},
  warning: {bg: colors.warningBg, text: colors.warning},
  error: {bg: colors.errorBg, text: colors.error},
  info: {bg: colors.primaryLight, text: colors.primary},
  neutral: {bg: colors.gray100, text: colors.gray700},
};

export function Badge({variant = 'neutral', children}: BadgeProps) {
  const p = palette[variant];
  return (
    <View style={[styles.badge, {backgroundColor: p.bg}]}>
      <Text style={[styles.text, {color: p.text}]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
