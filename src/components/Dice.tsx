import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Color, DiceProps } from '../types';
import { colors, fonts, space, type, radius } from '../theme';
import { hues, loops, parchment, shadow } from '../art';

const SIZE = 64;

// --- Dice sound (Web Audio, web only; native keeps haptics) ---------------
interface AudioWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}
let diceCtx: AudioContext | null = null;

function getDiceCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  try {
    if ((globalThis as { __soundMuted?: boolean }).__soundMuted === true) return null;
    if (!diceCtx) {
      const w = globalThis as unknown as AudioWindow;
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      diceCtx = new Ctor();
    }
    if (diceCtx.state === 'suspended') {
      diceCtx.resume().catch(() => undefined);
    }
    return diceCtx.state === 'running' ? diceCtx : null;
  } catch {
    return null;
  }
}

function playClack(strength: number): void {
  try {
    const ctx = getDiceCtx();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400 + Math.random() * 1800;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.value = 0.35 * strength;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {
    // sound is optional
  }
}

function playThud(): void {
  try {
    const ctx = getDiceCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
    playClack(1.2);
  } catch {
    // sound is optional
  }
}
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 46]],
  2: [[30, 26], [70, 66]],
  3: [[30, 26], [50, 46], [70, 66]],
  4: [[30, 26], [70, 26], [30, 66], [70, 66]],
  5: [[30, 26], [70, 26], [50, 46], [30, 66], [70, 66]],
  6: [[30, 22], [70, 22], [30, 46], [70, 46], [30, 70], [70, 70]],
};

function randomFace(): number {
  return 1 + Math.floor(Math.random() * 6);
}

interface DieProps {
  value: number | null;
  rolling: boolean;
  interactive: boolean;
  reduceMotion: boolean;
  color: Color;
  gid: string;
  period: number;
}

function Die({ value, rolling, interactive, reduceMotion, color, gid, period }: DieProps): JSX.Element {
  const hue = hues[color];
  const rot = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const [face, setFace] = useState<number>(value ?? 0);
  const wasRolling = useRef(false);

  // Shown face: random while rolling, the real value afterwards.
  useEffect(() => {
    if (!rolling) {
      setFace(value ?? 0);
      return;
    }
    setFace(randomFace());
    const id = setInterval(() => setFace(randomFace()), 90);
    return () => clearInterval(id);
  }, [rolling, value]);

  useEffect(() => {
    if (rolling) {
      wasRolling.current = true;
      if (reduceMotion) return;
      rot.value = 0;
      rot.value = withRepeat(withTiming(360, { duration: period, easing: Easing.linear }), -1, false);
      ty.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: period / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: period / 2, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else if (wasRolling.current) {
      wasRolling.current = false;
      cancelAnimation(rot);
      cancelAnimation(ty);
      rot.value = withSpring(0, { damping: 9, stiffness: 140 });
      ty.value = withSpring(0, { damping: 8, stiffness: 180 });
      scale.value = withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, { damping: 8 }));
    }
  }, [rolling, reduceMotion, period, rot, ty, scale]);

  const diceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));

  const pipColor = interactive ? hue.shade : '#2A1D0B';
  const pips = face >= 1 && face <= 6 ? PIPS[face] : null;
  const height = Math.round(SIZE * 1.12);

  return (
    <Animated.View style={[{ width: SIZE, height }, diceStyle, !interactive && !rolling && styles.dim]}>
      <Svg width={SIZE} height={height} viewBox="0 0 100 112">
        <Defs>
          <LinearGradient id={`${gid}-face`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFDF4" />
            <Stop offset="0.55" stopColor={parchment.base} />
            <Stop offset="1" stopColor={parchment.edge} />
          </LinearGradient>
          <LinearGradient id={`${gid}-side`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={parchment.edge} />
            <Stop offset="1" stopColor="#B59A62" />
          </LinearGradient>
          <LinearGradient id={`${gid}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={52} cy={104} rx={34} ry={5} fill={shadow.color} />
        <Rect x={6} y={14} width={88} height={86} rx={20} fill={`url(#${gid}-side)`} />
        <Rect
          x={6}
          y={6}
          width={88}
          height={86}
          rx={20}
          fill={`url(#${gid}-face)`}
          stroke={interactive ? hue.base : parchment.edge}
          strokeWidth={3}
        />
        <Path d="M 24 10 H 70 Q 84 10 88 22" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Rect x={12} y={10} width={76} height={30} rx={14} fill={`url(#${gid}-gloss)`} opacity={0.5} />
        {pips ? (
          pips.map(([cx, cy], i) => (
            <React.Fragment key={i}>
              <Circle cx={cx} cy={cy + 1.5} r={9} fill="rgba(255,255,255,0.7)" />
              <Circle cx={cx} cy={cy} r={9} fill={pipColor} />
              <Circle cx={cx - 2.5} cy={cy - 3} r={2.6} fill="#FFFFFF" opacity={0.35} />
            </React.Fragment>
          ))
        ) : (
          <SvgText
            x={50}
            y={64}
            fontSize={46}
            fontWeight="bold"
            fontFamily={fonts.display}
            fill={parchment.ink}
            opacity={0.6}
            textAnchor="middle"
          >
            ?
          </SvgText>
        )}
      </Svg>
    </Animated.View>
  );
}

export default function Dice({ value, value2, enabled, rolling, color, onRoll }: DiceProps): JSX.Element {
  const scheme = useColorScheme();
  const p = scheme === 'light' ? colors.light : colors.dark;
  const hue = hues[color];

  const glow = useSharedValue(0.35);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(v);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Glowing ring while the dice are waiting for the player.
  useEffect(() => {
    if (enabled && !rolling && !reduceMotion) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: loops.glow, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: loops.glow, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(enabled && !rolling ? 0.8 : 0, { duration: 160 });
    }
  }, [enabled, rolling, reduceMotion, glow]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  // Rattle while rolling, a thud when the dice land.
  const wasRollingSound = useRef(false);
  useEffect(() => {
    if (rolling) {
      wasRollingSound.current = true;
      playClack(1);
      const id = setInterval(() => playClack(0.5 + Math.random() * 0.6), 110);
      return () => clearInterval(id);
    }
    if (wasRollingSound.current) {
      wasRollingSound.current = false;
      playThud();
    }
    return undefined;
  }, [rolling]);

  const interactive = enabled && !rolling;

  const handlePress = () => {
    if (!interactive) return;
    if (Platform.OS !== 'web') {
      try {
        const result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) as unknown;
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => undefined);
        }
      } catch {
        // haptics are optional
      }
    }
    onRoll();
  };

  const second = value2 ?? null;
  // Saved games from before the two-dice rule only carry one die.
  const showSecond = value === null || second !== null || rolling;
  const gid = `dice-${color}`;

  const caption = rolling
    ? 'Rodando…'
    : interactive
      ? 'Toca para tirar'
      : value
        ? second !== null
          ? `Salió ${value} y ${second}`
          : `Salió ${value}`
        : 'Esperando turno';
  const a11y = rolling
    ? 'Dados rodando'
    : interactive
      ? 'Tirar los dos dados'
      : value
        ? second !== null
          ? `Dados: ${value} y ${second}`
          : `Dado: ${value}`
        : 'Dados, no es tu turno';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled: !interactive, busy: rolling }}
        hitSlop={8}
        style={({ pressed }) => [styles.press, pressed && interactive && { transform: [{ scale: 0.97 }] }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { borderColor: hue.tint, shadowColor: hue.base, backgroundColor: hue.glow },
            ringStyle,
          ]}
        />
        <View style={styles.row}>
          <Die
            value={value}
            rolling={rolling}
            interactive={interactive}
            reduceMotion={reduceMotion}
            color={color}
            gid={`${gid}-a`}
            period={420}
          />
          {showSecond ? (
            <Die
              value={second}
              rolling={rolling}
              interactive={interactive}
              reduceMotion={reduceMotion}
              color={color}
              gid={`${gid}-b`}
              period={500}
            />
          ) : null}
        </View>
      </Pressable>
      <Text style={[styles.caption, { color: interactive ? p.accent : p.inkMuted }]} accessibilityLiveRegion="polite">
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space[1] },
  press: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  ring: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: radius.card,
    borderWidth: 3,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dim: { opacity: 0.7 },
  caption: { ...type.xs, fontFamily: fonts.body, fontWeight: '700' },
});
