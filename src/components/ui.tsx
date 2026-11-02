import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, makeStyles, motion, space } from '../theme';
import type {
  ButtonProps,
  ChipProps,
  ConnectionStatus,
  EmptyProps,
  IconButtonProps,
  InputProps,
  ThemeBundle,
} from '../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';

const ICON_SIZE = 22;

export function useTheme(): ThemeBundle {
  const scheme = useColorScheme();
  const p = scheme === 'light' ? colors.light : colors.dark;
  return useMemo(() => ({ p, s: makeStyles(p) }), [p]);
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduce(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

// Keyboard / pointer focus ring (2 px accent, offset 2 px) — only visible on the web player.
function focusRing(color: string): StyleProp<ViewStyle> {
  if (Platform.OS !== 'web') return null;
  return {
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: color,
    outlineOffset: 2,
  } as unknown as ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, icon, loading }: ButtonProps) {
  const { p, s } = useTheme();
  const [focused, setFocused] = useState(false);
  const v: Variant = variant;
  const base = {
    primary: s.btnPrimary,
    secondary: s.btnSecondary,
    tertiary: s.btnTertiary,
    danger: s.btnDanger,
  }[v];
  const pressed = {
    primary: s.btnPrimaryPressed,
    secondary: s.btnSecondaryPressed,
    tertiary: s.btnTertiaryPressed,
    danger: s.btnDangerPressed,
  }[v];
  const dis = {
    primary: s.btnPrimaryDisabled,
    secondary: s.btnSecondaryDisabled,
    tertiary: s.btnTertiaryDisabled,
    danger: s.btnDangerDisabled,
  }[v];
  const labelStyle = {
    primary: s.btnPrimaryLabel,
    secondary: s.btnSecondaryLabel,
    tertiary: s.btnTertiaryLabel,
    danger: s.btnDangerLabel,
  }[v];
  const tint = v === 'primary' ? p.accentInk : v === 'danger' ? '#FFFFFF' : v === 'secondary' ? p.ink : p.accent;
  const inactive = !!disabled || !!loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed: isPressed }) => [
        base,
        isPressed && !inactive ? pressed : null,
        disabled ? dis : null,
        focused ? focusRing(p.accent) : null,
        Platform.OS === 'web' ? ({ cursor: inactive ? 'not-allowed' : 'pointer' } as unknown as ViewStyle) : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : icon ? (
        <Ionicons name={icon as IconName} size={ICON_SIZE} color={tint} />
      ) : null}
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, variant = 'secondary', disabled }: IconButtonProps) {
  const { p, s } = useTheme();
  const [focused, setFocused] = useState(false);
  const bg: ViewStyle | null =
    variant === 'primary'
      ? { backgroundColor: p.accent }
      : variant === 'danger'
        ? { backgroundColor: p.danger }
        : variant === 'tertiary'
          ? { backgroundColor: 'transparent' }
          : null;
  const tint = variant === 'primary' ? p.accentInk : variant === 'danger' ? '#FFFFFF' : variant === 'tertiary' ? p.accent : p.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        s.iconBtn,
        bg,
        pressed && !disabled ? s.iconBtnPressed : null,
        disabled ? s.iconBtnDisabled : null,
        focused ? focusRing(p.accent) : null,
        Platform.OS === 'web' ? ({ cursor: disabled ? 'not-allowed' : 'pointer' } as unknown as ViewStyle) : null,
      ]}
    >
      <Ionicons name={icon as IconName} size={ICON_SIZE} color={tint} />
    </Pressable>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  return <View style={s.card}>{children}</View>;
}

export function Input({ value, onChange, placeholder, error, maxLength, autoCapitalize, label }: InputProps) {
  const { p, s } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space[1] }}>
      {label ? (
        <Text style={s.muted} accessibilityRole="text">
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.inkMuted}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        accessibilityLabel={label ?? placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={p.accent}
        style={[
          s.input,
          focused ? { borderColor: p.accent, borderWidth: 2 } : null,
          error ? s.inputError : null,
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null,
        ]}
      />
      {error ? (
        <Text style={s.inputErrorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const { p, s } = useTheme();
  const content = (
    <>
      {color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /> : null}
      <Text style={s.chipLabel} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  if (!onPress) {
    return <View style={[s.chip, selected ? s.chipSelected : null]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={({ pressed }) => [
        s.chip,
        selected ? s.chipSelected : null,
        pressed ? s.chipPressed : null,
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function EmptyState({ icon, title, line, actionLabel, onAction }: EmptyProps) {
  const { p, s } = useTheme();
  return (
    <View style={s.empty}>
      <View style={s.emptyCircle}>
        <Ionicons name={icon as IconName} size={40} color={p.accent} />
      </View>
      <Text style={s.emptyTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={s.emptyLine}>{line}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function Skeleton({ height }: { height: number }) {
  const { s } = useTheme();
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduce) {
      pulse.setValue(0.6);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.skeleton, { height, opacity: pulse }]}
    />
  );
}

export function Toast({ message }: { message: string | null }) {
  const { s } = useTheme();
  const reduce = useReduceMotion();
  const [shown, setShown] = useState<string>('');
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (message) setShown(message);
    Animated.timing(anim, {
      toValue: message ? 1 : 0,
      duration: reduce ? 0 : motion.base,
      useNativeDriver: true,
    }).start();
  }, [message, reduce, anim]);
  if (!shown) return <View pointerEvents="none" />;
  const translateY = reduce
    ? 0
    : anim.interpolate({ inputRange: [0, 1], outputRange: [space[4], 0] });
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[s.toast, { opacity: anim, transform: [{ translateY }] }]}
    >
      <Text style={s.toastText}>{shown}</Text>
    </Animated.View>
  );
}

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  const { s } = useTheme();
  if (status === 'online') return <View />;
  const text = status === 'reconnecting' ? 'Reconectando…' : 'Sin conexión. Reintentando cada 2 s…';
  return (
    <View style={s.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={s.bannerText}>{text}</Text>
    </View>
  );
}
