import React, { useState } from 'react';
import { Platform, Pressable, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, makeStyles, space } from '../theme';
import type { Tab, TabBarProps } from '../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Inicio', icon: 'home-outline' },
  { id: 'profile', label: 'Perfil', icon: 'person-outline' },
  { id: 'rules', label: 'Reglas', icon: 'book-outline' },
];

const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_BAR_HEIGHT = 56;
const DESKTOP_MAX_WIDTH = 1200;

export default function TabBar({ tab, onChange }: TabBarProps) {
  const scheme = useColorScheme();
  const p = scheme === 'light' ? colors.light : colors.dark;
  const s = React.useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [focusedTab, setFocusedTab] = useState<Tab | null>(null);
  const desktop = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
  const hairline = (p as unknown as Record<string, string | undefined>).line;

  const barStyle: ViewStyle[] = desktop
    ? [
        s.tabbar,
        {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: DESKTOP_BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: space[4],
          borderTopWidth: 0,
          borderBottomWidth: 1,
          ...(hairline ? { borderBottomColor: hairline } : null),
        } as ViewStyle,
      ]
    : [s.tabbar, { paddingBottom: insets.bottom }];

  const items = TABS.map((t) => {
    const active = t.id === tab;
    const ring: ViewStyle | null =
      Platform.OS === 'web' && focusedTab === t.id
        ? ({
            outlineStyle: 'solid',
            outlineWidth: 2,
            outlineColor: p.accent,
            outlineOffset: desktop ? 2 : -2,
          } as unknown as ViewStyle)
        : null;
    const desktopTab: ViewStyle | null = desktop
      ? {
          flex: 0,
          flexGrow: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space[2],
          minHeight: 44,
          minWidth: 112,
          paddingHorizontal: space[4],
        }
      : null;
    return (
      <Pressable
        key={t.id}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: active }}
        onPress={() => onChange(t.id)}
        onFocus={() => setFocusedTab(t.id)}
        onBlur={() => setFocusedTab(null)}
        style={({ pressed }) => [
          s.tab,
          desktopTab,
          pressed ? s.tabPressed : null,
          ring,
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null,
        ]}
      >
        <Ionicons name={t.icon} size={24} color={active ? p.accent : p.inkMuted} />
        <Text style={active ? s.tabActiveLabel : s.tabLabel} numberOfLines={1}>
          {t.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View accessibilityRole="tablist" style={barStyle}>
      {desktop ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: space[2],
            width: '100%',
            maxWidth: DESKTOP_MAX_WIDTH,
          }}
        >
          {items}
        </View>
      ) : (
        items
      )}
    </View>
  );
}
