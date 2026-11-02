// The capture "mini clip" over the board: the two characters face off, trade blows, the loser
// is launched off screen, then a close-up of the winner running forward. ~2.8 s, tap to skip.
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, Line, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
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
import type { PawnPose } from './Pawn';
import { CHARACTERS, CAPTURE_BONUS } from '../types';
import type { Color } from '../types';
import { hues } from '../art';
import { fonts } from '../theme';

export const CLIP_MS = 2900;
const CLASH_AT = 380;
const HITS = [560, 820, 1080];
const LAUNCH_AT = 1250;
const CLOSE_AT = 1650;

const SHOUTS = ['¡PAM!', '¡ZAS!', '¡BOOM!', '¡CRAC!', '¡POW!'];

function starPoints(cx: number, cy: number, outer: number, inner: number, n: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function buzz(heavy: boolean): void {
  if (Platform.OS === 'web') return;
  try {
    const r = Haptics.impactAsync(heavy ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium) as Promise<void> | undefined;
    if (r && typeof r.catch === 'function') r.catch(() => undefined);
  } catch {
    // no haptics here
  }
}

export default function CaptureClip({
  attacker,
  victim,
  size,
  onDone,
  onHit,
}: {
  attacker: Color;
  victim: Color;
  size: number;
  onDone(): void;
  onHit?: (big: boolean) => void;
}): JSX.Element {
  const S = size;
  const a = hues[attacker];
  const [stage, setStage] = useState<'clash' | 'close'>('clash');
  const [shout, setShout] = useState<{ n: number; text: string } | null>(null);
  const [victimPose, setVictimPose] = useState<PawnPose>('idle');

  const fade = useSharedValue(0);
  const rays = useSharedValue(0);
  const attX = useSharedValue(-0.75);
  const vicX = useSharedValue(0.75);
  const vicY = useSharedValue(0);
  const vicSpin = useSharedValue(0);
  const vicScale = useSharedValue(1);
  const shake = useSharedValue(0);
  const title = useSharedValue(0);
  const star = useSharedValue(0);
  const close = useSharedValue(0);
  const lines = useSharedValue(0);
  const banner = useSharedValue(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    fade.value = withTiming(1, { duration: 180 });
    rays.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1);
    title.value = withSequence(withSpring(1, { damping: 7, stiffness: 260 }), withDelay(700, withTiming(0, { duration: 200 })));
    attX.value = withTiming(-0.2, { duration: CLASH_AT, easing: Easing.out(Easing.back(1.6)) });
    vicX.value = withTiming(0.2, { duration: CLASH_AT, easing: Easing.out(Easing.back(1.6)) });

    HITS.forEach((t, i) => {
      at(t - 140, () => {
        // the attacker lunges, the victim recoils
        attX.value = withSequence(withTiming(-0.06, { duration: 120, easing: Easing.in(Easing.quad) }), withTiming(-0.18, { duration: 180 }));
        vicX.value = withSequence(withDelay(110, withTiming(0.27, { duration: 90 })), withTiming(0.21, { duration: 160 }));
      });
      at(t, () => {
        const big = i === HITS.length - 1;
        setShout({ n: i, text: SHOUTS[(i + Math.floor(Math.random() * SHOUTS.length)) % SHOUTS.length] });
        star.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 6, stiffness: 320 }));
        shake.value = withSequence(
          withTiming(1, { duration: 40 }),
          withTiming(-1, { duration: 50 }),
          withTiming(0.6, { duration: 50 }),
          withTiming(0, { duration: 60 }),
        );
        setVictimPose('hit');
        onHit?.(big);
        buzz(big);
      });
    });

    at(LAUNCH_AT, () => {
      setShout({ n: 9, text: '¡K.O.!' });
      star.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1.25, { damping: 6, stiffness: 300 }));
      vicX.value = withTiming(1.0, { duration: 520, easing: Easing.out(Easing.quad) });
      vicY.value = withTiming(-0.55, { duration: 520, easing: Easing.out(Easing.quad) });
      vicSpin.value = withTiming(900, { duration: 520 });
      vicScale.value = withTiming(0.35, { duration: 520 });
      attX.value = withSequence(withTiming(0, { duration: 160 }), withTiming(-0.04, { duration: 200 }));
    });

    at(CLOSE_AT, () => {
      setShout(null);
      setStage('close');
      close.value = withSpring(1, { damping: 12, stiffness: 140 });
      lines.value = withRepeat(withTiming(1, { duration: 360, easing: Easing.linear }), -1);
      banner.value = withDelay(120, withSpring(1, { damping: 8, stiffness: 200 }));
    });

    at(CLIP_MS - 260, () => {
      fade.value = withTiming(0, { duration: 240 });
    });
    at(CLIP_MS, onDone);

    return () => {
      timers.forEach(clearTimeout);
      [fade, rays, attX, vicX, vicY, vicSpin, vicScale, shake, title, star, close, lines, banner].forEach((v) => cancelAnimation(v));
    };
    // the clip runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: shake.value * S * 0.018 }, { translateY: -shake.value * S * 0.01 }],
  }));
  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rays.value * 360}deg` }] }));
  const attStyle = useAnimatedStyle(() => ({ transform: [{ translateX: attX.value * S }] }));
  const vicStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: vicX.value * S },
      { translateY: vicY.value * S },
      { rotate: `${vicSpin.value}deg` },
      { scale: vicScale.value },
      { scaleX: -1 },
    ],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ scale: 0.4 + title.value * 0.6 }, { rotate: '-6deg' }] }));
  const starStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, star.value), transform: [{ scale: star.value }, { rotate: `${star.value * 18 - 9}deg` }] }));
  const closeStyle = useAnimatedStyle(() => ({ opacity: close.value, transform: [{ scale: 0.6 + close.value * 0.4 }] }));
  const linesStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -lines.value * S * 0.5 }] }));
  const bannerStyle = useAnimatedStyle(() => ({ opacity: banner.value, transform: [{ translateY: (1 - banner.value) * 30 }, { scale: 0.7 + banner.value * 0.3 }] }));

  const fighter = S * 0.26;
  const hero = S * 0.46;
  const attName = CHARACTERS[attacker].name;
  const vicName = CHARACTERS[victim].name;
  const titleSize = Math.max(22, S * 0.075);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { borderRadius: S * 0.03 }, rootStyle]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={`${attName} se come a ${vicName}. Toca para saltar la animación`}
      >
        {/* comic backdrop: night vignette and spinning rays in the attacker's colour */}
        <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="clipBg" cx="50%" cy="50%" r="70%">
              <Stop offset="0" stopColor={a.base} stopOpacity={0.95} />
              <Stop offset="0.55" stopColor={a.shade} stopOpacity={0.95} />
              <Stop offset="1" stopColor="#060C16" stopOpacity={0.97} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={S} height={S} fill="url(#clipBg)" />
        </Svg>
        <Animated.View style={[styles.center, { width: S * 1.6, height: S * 1.6, left: -S * 0.3, top: -S * 0.3 }, raysStyle]}>
          <Svg width={S * 1.6} height={S * 1.6}>
            <G opacity={0.22}>
              {Array.from({ length: 18 }, (_, i) => {
                const c = S * 0.8;
                const ang0 = (i * 2 * Math.PI) / 18;
                const ang1 = ang0 + Math.PI / 36;
                const r = S * 1.2;
                return (
                  <Polygon
                    key={i}
                    points={`${c},${c} ${c + Math.cos(ang0) * r},${c + Math.sin(ang0) * r} ${c + Math.cos(ang1) * r},${c + Math.sin(ang1) * r}`}
                    fill="#FFF3C9"
                  />
                );
              })}
            </G>
          </Svg>
        </Animated.View>

        {stage === 'clash' ? (
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.title, titleStyle]}>
              <Text style={[styles.titleText, { fontSize: titleSize, fontFamily: fonts.display }]}>¡ABORDAJE!</Text>
            </Animated.View>
            <View style={[styles.stageRow, { top: S * 0.42 }]}>
              <Animated.View style={[styles.fighter, attStyle]}>
                <Pawn color={attacker} x={0} y={0} size={fighter} movable={false} dimmed={false} pose="idle" still />
              </Animated.View>
              <Animated.View style={[styles.fighter, vicStyle]}>
                <Pawn color={victim} x={0} y={0} size={fighter} movable={false} dimmed={false} pose={victimPose} still />
              </Animated.View>
            </View>
            {shout ? (
              <Animated.View key={shout.n} style={[styles.shout, { top: S * 0.22 }, starStyle]}>
                <Svg width={S * 0.42} height={S * 0.32}>
                  <Polygon points={starPoints(S * 0.21, S * 0.16, S * 0.16, S * 0.09, 11)} fill="#FFE27A" stroke="#3A2A12" strokeWidth={3} strokeLinejoin="round" />
                  <Polygon points={starPoints(S * 0.21, S * 0.16, S * 0.11, S * 0.06, 11)} fill="#FFFFFF" opacity={0.65} />
                </Svg>
                <Text style={[styles.shoutText, { fontSize: S * 0.055, fontFamily: fonts.display }]}>{shout.text}</Text>
              </Animated.View>
            ) : null}
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            {/* speed lines rushing past the runner */}
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: S * 1.5, height: S }, linesStyle]}>
              <Svg width={S * 1.5} height={S}>
                {Array.from({ length: 22 }, (_, i) => {
                  const y = ((i * 37) % 100) / 100;
                  const x = ((i * 53) % 100) / 100;
                  const len = 0.12 + ((i * 17) % 10) / 40;
                  return (
                    <Line
                      key={i}
                      x1={x * S * 1.5}
                      y1={y * S}
                      x2={x * S * 1.5 + len * S}
                      y2={y * S}
                      stroke="#FFFFFF"
                      strokeOpacity={0.35 + ((i * 7) % 5) / 12}
                      strokeWidth={2 + (i % 3)}
                      strokeLinecap="round"
                    />
                  );
                })}
              </Svg>
            </Animated.View>
            <Animated.View style={[styles.hero, { top: S * 0.5 }, closeStyle]}>
              <Pawn color={attacker} x={0} y={0} size={hero} movable={false} dimmed={false} pose="run" />
            </Animated.View>
            <Animated.View style={[styles.banner, { top: S * 0.08 }, bannerStyle]}>
              <Text style={[styles.bannerTitle, { fontSize: Math.max(20, S * 0.06), fontFamily: fonts.display }]}>
                ¡{attName} se come a {vicName}!
              </Text>
              <View style={[styles.bonus, { backgroundColor: '#FFE27A' }]}>
                <Text style={[styles.bonusText, { fontSize: Math.max(13, S * 0.03) }]}>+{CAPTURE_BONUS} casillas de premio</Text>
              </View>
            </Animated.View>
          </View>
        )}
        <Text style={[styles.skip, { fontSize: Math.max(11, S * 0.018) }]}>Toca para saltar</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', zIndex: 50 },
  center: { position: 'absolute' },
  title: { position: 'absolute', top: '10%', left: 0, right: 0, alignItems: 'center' },
  titleText: {
    color: '#FFE27A',
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#3A2A12',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  stageRow: { position: 'absolute', left: '50%', width: 0, height: 0 },
  fighter: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  shout: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  shoutText: {
    position: 'absolute',
    color: '#C8312B',
    fontWeight: '900',
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  hero: { position: 'absolute', left: '50%', width: 0, height: 0 },
  banner: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 10 },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 6,
  },
  bonus: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 2, borderColor: '#3A2A12' },
  bonusText: { color: '#3A2A12', fontWeight: '900' },
  skip: { position: 'absolute', bottom: 10, right: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
});
