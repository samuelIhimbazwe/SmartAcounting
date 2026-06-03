import React, {type ReactNode} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing} from '../../theme/tokens';
import {textStyles} from '../../theme/typography';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  leftIcon?: string;
  leftIconColor?: string;
  leftIconBg?: string;
  value?: ReactNode;
  showArrow?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  title,
  subtitle,
  left,
  leftIcon,
  leftIconColor = colors.primary,
  leftIconBg = colors.primaryLight,
  value,
  showArrow = false,
  onPress,
  isLast = false,
  style,
}: ListItemProps) {
  const content = (
    <>
      {left ??
        (leftIcon ? (
          <View style={[styles.iconWrap, {backgroundColor: leftIconBg}]}>
            <Icon name={leftIcon} size={18} color={leftIconColor} />
          </View>
        ) : null)}
      <View style={styles.body}>
        <Text style={textStyles.body} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={textStyles.secondary} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {value}
        {showArrow ? (
          <Icon name="chevron-right" size={20} color={colors.gray400} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          styles.row,
          !isLast && styles.divider,
          pressed && styles.pressed,
          style,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, !isLast && styles.divider, style]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 56,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.white,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  pressed: {
    backgroundColor: colors.gray50,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
