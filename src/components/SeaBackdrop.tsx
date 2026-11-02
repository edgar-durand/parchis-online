import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { loops, sea } from '../art';

// Deterministic star field so the sky is identical on every render.
function makeStars(count: number, w: number, h: number) {
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    stars.push({ x: rnd() * w, y: rnd() * h, r: 0.6 + rnd() * 1.2, o: 0.25 + rnd() * 0.6 });
  }
  return stars;
}

// A seamless wave band: the path covers 2 * width and the layer slides by exactly one width.
function wavePath(width: number, amp: number, periodTarget: number, baseY: number, height: number) {
  const n = Math.max(2, Math.round(width / periodTarget));
  const period = width / n;
  const half = period / 2;
  const segments = Math.ceil((width * 2) / half);
  let d = `M0 ${baseY}`;
  for (let i = 0; i < segments; i++) {
    const x0 = i * half;
    const cy = baseY + (i % 2 === 0 ? -2 * amp : 2 * amp);
    d += ` Q${x0 + half / 2} ${cy} ${x0 + half} ${baseY}`;
  }
  d += ` L${segments * half} ${height} L0 ${height} Z`;
  return d;
}

interface WaveLayerProps {
  width: number;
  top: number;
  height: number;
  amp: number;
  period: number;
  color: string;
  opacity: number;
  duration: number;
  reverse?: boolean;
  animate: boolean;
}

function WaveLayer({ width, top, height, amp, period, color, opacity, duration, reverse, animate }: WaveLayerProps) {
  const x = useSharedValue(reverse ? -width : 0);

  useEffect(() => {
    cancelAnimation(x);
    if (!animate) {
      x.value = 0;
      return;
    }
    x.value = reverse ? -width : 0;
    x.value = withRepeat(withTiming(reverse ? 0 : -width, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [animate, width, duration, reverse, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const bandHeight = height + amp * 2;
  const d = wavePath(width, amp, period, amp * 2, bandHeight);

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: top - amp * 2, width: width * 2, height: bandHeight }, style]}
    >
      <Svg width={width * 2} height={bandHeight}>
        <Path d={d} fill={color} opacity={opacity} />
      </Svg>
    </Animated.View>
  );
}

export default function SeaBackdrop(props: { children?: React.ReactNode }) {
  const win = useWindowDimensions();
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Cover the whole window (and the container if it is larger), so wide desktop screens never show cuts or bars.
  const width = Math.max(1, Math.round(Math.max(win.width, box.w)));
  const height = Math.max(1, Math.round(Math.max(win.height, box.h)));
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduce(!!v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const animate = !reduce;
  const horizon = Math.round(height * 0.34);
  const moonX = width * 0.76;
  const moonY = horizon * 0.5;
  const moonR = Math.max(16, Math.min(44, Math.min(width, height) * 0.05));
  const starCount = Math.max(48, Math.min(180, Math.round((width * horizon) / 9000)));
  const stars = React.useMemo(() => makeStars(starCount, width, horizon * 0.9), [starCount, width, horizon]);

  // Moon reflection on the water pulses gently.
  const glow = useSharedValue(0.55);
  useEffect(() => {
    cancelAnimation(glow);
    if (!animate) {
      glow.value = 0.6;
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: loops.shimmer, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: loops.shimmer, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glow);
  }, [animate, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const waterHeight = height - horizon;

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setBox((prev) => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
      }}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Sky */}
        <LinearGradient
          colors={[sea.sky[0], sea.sky[1], sea.sky[2]]}
          locations={[0, 0.6, 1]}
          style={{ position: 'absolute', left: 0, top: 0, width, height: horizon + 2 }}
        />
        <Svg width={width} height={horizon + 2} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={sea.moon} stopOpacity="0.55" />
              <Stop offset="0.45" stopColor={sea.moon} stopOpacity="0.16" />
              <Stop offset="1" stopColor={sea.moon} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="moonBody" cx="38%" cy="34%" r="70%">
              <Stop offset="0" stopColor="#FFFBE6" />
              <Stop offset="1" stopColor={sea.moon} />
            </RadialGradient>
          </Defs>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={sea.moon} opacity={s.o} />
          ))}
          <Circle cx={moonX} cy={moonY} r={moonR * 3.2} fill="url(#moonGlow)" />
          <Circle cx={moonX} cy={moonY} r={moonR} fill="url(#moonBody)" />
          <Circle cx={moonX + moonR * 0.3} cy={moonY - moonR * 0.1} r={moonR * 0.18} fill="rgba(169,184,198,0.35)" />
          <Circle cx={moonX - moonR * 0.35} cy={moonY + moonR * 0.3} r={moonR * 0.12} fill="rgba(169,184,198,0.3)" />
        </Svg>

        {/* Water */}
        <LinearGradient
          colors={[sea.water[0], sea.water[1], sea.water[2]]}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, top: horizon, width, height: waterHeight }}
        />

        {/* Moon reflection */}
        <Animated.View
          style={[{ position: 'absolute', left: moonX - moonR * 1.4, top: horizon, width: moonR * 2.8, height: Math.min(waterHeight, height * 0.3) }, glowStyle]}
        >
          <Svg width={moonR * 2.8} height={Math.min(waterHeight, height * 0.3)}>
            <Defs>
              <RadialGradient id="reflect" cx="50%" cy="0%" r="100%">
                <Stop offset="0" stopColor={sea.moon} stopOpacity="0.45" />
                <Stop offset="1" stopColor={sea.moon} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={moonR * 2.8} height={Math.min(waterHeight, height * 0.3)} fill="url(#reflect)" />
          </Svg>
        </Animated.View>

        {/* Wave layers: far = lighter and slower, near = darker and faster */}
        <WaveLayer width={width} top={horizon} height={waterHeight} amp={3} period={90} color={sea.foam} opacity={0.5} duration={loops.wave * 1.6} animate={animate} />
        <WaveLayer width={width} top={horizon + waterHeight * 0.22} height={waterHeight * 0.78} amp={5} period={140} color="#12304F" opacity={0.55} duration={loops.wave * 1.2} reverse animate={animate} />
        <WaveLayer width={width} top={horizon + waterHeight * 0.5} height={waterHeight * 0.5} amp={7} period={200} color="#0B1E33" opacity={0.6} duration={loops.wave} animate={animate} />
        <WaveLayer width={width} top={horizon + waterHeight * 0.5 + 6} height={waterHeight * 0.5} amp={2} period={110} color={sea.foam} opacity={0.35} duration={loops.wave * 0.8} reverse animate={animate} />
        <WaveLayer width={width} top={horizon + waterHeight * 0.8} height={waterHeight * 0.2} amp={9} period={240} color="#07162A" opacity={0.7} duration={loops.wave * 0.9} reverse animate={animate} />
      </View>
      <View style={styles.content}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: sea.sky[0], overflow: 'hidden' },
  content: { flex: 1, width: '100%' },
});
