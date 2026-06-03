import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, fontSize, spacing} from '../../theme/tokens';

const TAB_ICON_SIZE = 22;
const TAB_BAR_HEIGHT = 60;

const TAB_ICONS: Record<string, string> = {
  Till: 'cash-multiple',
  POS: 'cash-register',
  Stock: 'package-variant',
  Customers: 'account-group',
  Dashboard: 'view-dashboard-outline',
  Copilot: 'star-four-points-outline',
  Settings: 'cog-outline',
};

export function AppTabBar({state, descriptors, navigation, insets}: BottomTabBarProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;
        const isFocused = state.index === index;
        const color = isFocused ? colors.primary : colors.gray400;
        const iconName = TAB_ICONS[route.name] ?? 'circle-outline';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? {selected: true} : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}>
            {isFocused ? <View style={styles.indicator} /> : null}
            {route.name === 'Copilot' ? (
              <Text style={{fontSize: TAB_ICON_SIZE, color}}>✨</Text>
            ) : (
              <Icon name={iconName} size={TAB_ICON_SIZE} color={color} />
            )}
            <Text style={[styles.label, {color}]}>
              {typeof label === 'string' ? label : route.name}
            </Text>
            {options.tabBarBadge != null && Number(options.tabBarBadge) > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{String(options.tabBarBadge)}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAB_BAR_HEIGHT,
    gap: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: spacing[4],
    right: spacing[4],
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: '22%',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
