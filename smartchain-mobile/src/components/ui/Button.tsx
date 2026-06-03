import React, {type ReactNode} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {colors, radius, spacing} from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<
  ButtonVariant,
  {bg: string; text: string; border?: string}
> = {
  primary: {bg: colors.primary, text: colors.white},
  secondary: {bg: colors.white, text: colors.gray700, border: colors.gray200},
  ghost: {bg: 'transparent', text: colors.gray700},
  danger: {bg: colors.error, text: colors.white},
};

export function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({pressed}) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled ? 0.55 : 1,
          transform: [{scale: pressed && !isDisabled ? 0.97 : 1}],
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : typeof children === 'string' ? (
        <Text style={[styles.label, {color: v.text}]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
