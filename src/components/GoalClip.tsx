// The lighthouse "mini clip": a piece reaches the goal — the lighthouse beam sweeps, the character
// leaps in cheering under it, confetti rains, the reward and the count home. ~2.7 s, tap to skip.
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Pawn from './Pawn';
import { CHARACTERS, GOAL_BONUS } from '../types';
import type { Color } from '../types';
import { hues } from '../art';
import { fonts } from '../theme';

export const GOAL_CLIP_MS = 2700;

const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 37) % 100) / 100,
  delay: (i * 53) % 600,
  spin: 180 + ((i * 71) % 360),
  w: 6 + (i % 4) * 2,
  col: ['#FFD97A', '#FFFFFF', '#F26B66', '#6FD596', '#6FB1F2'][i % 5],
}));

function Confetto({ c, S }: { c: (typeof CONFETTI)[number]; S: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(c.delay, withTiming(1, { duration: 1800, easing: Easing.in(Easing.quad) }));
    return () => cancelAnimation(t);
  }, [t, c.delay]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value > 0 ? 1 - t.value * 0.6 : 0,
    transform: [
      { translateY: -S * 0.1 + t.value * S * 1.1 },
      { translateX: Math.sin(t.value * 6 + c.x * 9) * S * 0.04 },
      { rotate: `${t.value * c.spin}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: c.x * S, top: 0, width: c.w, height: c.w * 0.6, backgroundColor: c.col, borderRadius: 2 }, st]} />;
}

export default function GoalClip({
  color,
  home,
  size,
  onDone,
}: {
  color: Color;
  home: number;
  size: number;
  onDone(): void;
}): JSX.Element {
  const S = size;
  const h = hues[color];
  const name = CHARACTERS[color].name;
  const fade = useSharedValue(0);
  const beam = useSharedValue(0);
  const hero = useSharedValue(0);
  const banner = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 200 });
    beam.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true);
    hero.value = withDelay(180, withSpring(1, { damping: 9, stiffness: 150 }));
    banner.value = withDelay(520, withSpring(1, { damping: 8, stiffness: 200 }));
    if (Platform.OS !== 'web') {
      try {
        const r = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) as Promise<void> | undefined;
        if (r && typeof r.catch === 'function') r.catch(() => undefined);
      } catch {
        // no haptics here
      }
    }
    const out = setTimeout(() => {
      fade.value = withTiming(0, { duration: 240 });
    }, GOAL_CLIP_MS - 260);
    const done = setTimeout(onDone, GOAL_CLIP_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(done);
      [fade, beam, hero, banner, glow].forEach((v) => cancelAnimation(v));
    };
    // the clip runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const beamStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-28 + beam.value * 56}deg` }] }));
  const lampStyle = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45, transform: [{ scale: 0.9 + glow.value * 0.2 }] }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, hero.value * 1.5),
    transform: [{ translateY: (1 - hero.value) * S * 0.5 }, { scale: 0.5 + hero.value * 0.5 }],
  }));
  const bannerStyle = useAnimatedStyle(() => ({ opacity: banner.value, transform: [{ translateY: (1 - banner.value) * 24 }, { scale: 0.7 + banner.value * 0.3 }] }));

  const towerX = S * 0.5;
  const towerTop = S * 0.2;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { borderRadius: S * 0.03 }, rootStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityRole="button" accessibilityLabel={`${name} llega al faro. Toca para saltar la animación`}>
        <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="gcSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0B1E33" />
              <Stop offset="0.6" stopColor="#1B4A74" />
              <Stop offset="1" stopColor={h.shade} />
            </LinearGradient>
            <RadialGradient id="gcGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF3C9" stopOpacity={0.9} />
              <Stop offset="1" stopColor="#FFF3C9" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={S} height={S} fill="url(#gcSky)" />
          {/* sea */}
          <Ellipse cx={S / 2} cy={S * 1.02} rx={S * 0.9} ry={S * 0.28} fill="#12304F" />
          <Ellipse cx={S / 2} cy={S * 1.06} rx={S * 0.8} ry={S * 0.24} fill="#0B1E33" opacity={0.7} />
          {/* lighthouse */}
          <G>
            <Polygon points={`${towerX - S * 0.07},${S * 0.78} ${towerX + S * 0.07},${S * 0.78} ${towerX + S * 0.045},${towerTop + S * 0.1} ${towerX - S * 0.045},${towerTop + S * 0.1}`} fill="#F6EBD0" />
            {[0, 1, 2].map((k) => {
              const y0 = towerTop + S * (0.16 + k * 0.2);
              const y1 = y0 + S * 0.08;
              const w0 = S * (0.05 + (y0 - towerTop) / S * 0.03);
              const w1 = S * (0.05 + (y1 - towerTop) / S * 0.03);
              return <Polygon key={k} points={`${towerX - w0},${y0} ${towerX + w0},${y0} ${towerX + w1},${y1} ${towerX - w1},${y1}`} fill="#C8312B" />;
            })}
            <Rect x={towerX - S * 0.06} y={towerTop + S * 0.02} width={S * 0.12} height={S * 0.08} rx={S * 0.015} fill="#3A2A12" />
            <Polygon points={`${towerX - S * 0.07},${towerTop + S * 0.02} ${towerX + S * 0.07},${towerTop + S * 0.02} ${towerX},${towerTop - S * 0.05}`} fill="#C8312B" />
          </G>
        </Svg>
        {/* sweeping beam and lamp */}
        <Animated.View style={[{ position: 'absolute', left: towerX - S * 0.9, top: towerTop + S * 0.06 - S * 0.12, width: S * 1.8, height: S * 0.24 }, beamStyle]}>
          <Svg width={S * 1.8} height={S * 0.24}>
            <Polygon points={`${S * 0.9},${S * 0.12} 0,0 0,${S * 0.24}`} fill="#FFF3C9" opacity={0.28} />
            <Polygon points={`${S * 0.9},${S * 0.12} ${S * 1.8},0 ${S * 1.8},${S * 0.24}`} fill="#FFF3C9" opacity={0.28} />
          </Svg>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: towerX - S * 0.08, top: towerTop + S * 0.06 - S * 0.08, width: S * 0.16, height: S * 0.16 }, lampStyle]}>
          <Svg width={S * 0.16} height={S * 0.16}>
            <Ellipse cx={S * 0.08} cy={S * 0.08} rx={S * 0.08} ry={S * 0.08} fill="url(#gcGlow)" />
          </Svg>
        </Animated.View>

        {CONFETTI.map((c, i) => <Confetto key={i} c={c} S={S} />)}

        <Animated.View style={[styles.hero, { top: S * 0.95 }, heroStyle]}>
          <Pawn color={color} x={0} y={0} size={S * 0.22} movable={false} dimmed={false} pose="cheer" />
        </Animated.View>

        <Animated.View style={[styles.banner, { top: S * 0.035 }, bannerStyle]}>
          <Text style={[styles.title, { fontSize: Math.max(20, S * 0.058), fontFamily: fonts.display }]}>¡{name} llega al faro!</Text>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: '#FFE27A' }]}>
              <Text style={[styles.pillText, { fontSize: Math.max(13, S * 0.028) }]}>+{GOAL_BONUS} casillas de premio</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: h.tint }]}>
              <Text style={[styles.pillText, { fontSize: Math.max(13, S * 0.028) }]}>{home} de 4 a salvo</Text>
            </View>
          </View>
        </Animated.View>
        <Text style={[styles.skip, { fontSize: Math.max(11, S * 0.018) }]}>Toca para saltar</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', zIndex: 50 },
  hero: { position: 'absolute', left: '50%', width: 0, height: 0 },
  banner: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 10 },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 6,
  },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 2, borderColor: '#3A2A12' },
  pillText: { color: '#3A2A12', fontWeight: '900' },
  skip: { position: 'absolute', bottom: 10, right: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
});
