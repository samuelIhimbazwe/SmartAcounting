import React, {type ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing} from '../../theme/tokens';
import {textStyles} from '../../theme/typography';

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  bordered?: boolean;
}

export function PageHeader({
  title,
  onBack,
  rightAction,
  bordered = false,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {paddingTop: insets.top},
        bordered && styles.bordered,
      ]}>
      <View style={styles.bar}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Icon name="arrow-left" size={22} color={colors.gray900} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={[textStyles.screenTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{rightAction ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 44,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  right: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
