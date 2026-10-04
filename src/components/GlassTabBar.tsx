import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { Icon, type IconName } from './Icon';

const ICONS: Record<string, IconName> = { index: 'home', jizda: 'route', auta: 'car', premium: 'star' };

/** Plovoucí skleněná lišta dole, jako v návrhu. */
export function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const color = focused ? colors.accent : colors.muted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}
          >
            <Icon name={ICONS[route.name] ?? 'home'} color={color} />
            <Text style={[styles.label, { color, fontFamily: focused ? fonts.bodyHeavy : fonts.bodyBold }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 70,
    borderRadius: 24,
    backgroundColor: 'rgba(10,16,30,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    maxWidth: 528,
    alignSelf: 'center',
  },
  tab: { minWidth: 64, alignItems: 'center', gap: 4, paddingVertical: 8 },
  label: { fontSize: 11 },
});
