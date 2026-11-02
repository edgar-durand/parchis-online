// The harbour comes alive around the game: a pirate ship sailing the horizon, Laboon surfacing,
// a Sea King rising (behind the board), and on the board waving Jolly Rogers, a News Coo flying
// over, a Den Den Mushi crawling by and Karoo running past. Everything is decoration: it never
// takes a touch, and it all stops under reduced motion.
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AMBIENT_AR, ambientUrl } from '../art-sprites';
import type { AmbientId } from '../art-sprites';

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function useReduced(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setR(v)).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return r;
}

function Art({ id, width, flip }: { id: AmbientId; width: number; flip?: boolean }) {
  return (
    <Image
      source={{ uri: ambientUrl(id) }}
      resizeMode="contain"
      fadeDuration={0}
      style={{ width, height: width / AMBIENT_AR[id], transform: flip ? [{ scaleX: -1 }] : undefined }}
    />
  );
}

/** Runs `show` now and then: a random pause, the visit, another pause… */
function useVisits(enabled: boolean, firstMs: [number, number], everyMs: [number, number]): number {
  const [visit, setVisit] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const next = (range: [number, number]) => {
      t = setTimeout(() => {
        if (!alive) return;
        setVisit((v) => v + 1);
        next(everyMs);
      }, rand(range[0], range[1]));
    };
    next(firstMs);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return visit;
}

// ---------- Behind the board ----------

function Ship({ W, H }: { W: number; H: number }) {
  const w = Math.max(140, Math.min(W, H) * 0.3);
  const x = useSharedValue(0);
  const bob = useSharedValue(0);
  useEffect(() => {
    // the bow points left: it sails from the right edge to the left one, then again
    x.value = withRepeat(withTiming(1, { duration: 80000, easing: Easing.linear }), -1);
    bob.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { cancelAnimation(x); cancelAnimation(bob); };
  }, [x, bob]);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: W + w * 0.2 - x.value * (W + w * 1.4) },
      { translateY: bob.value * 6 },
      { rotate: `${-2 + bob.value * 4}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.abs, { left: 0, top: H * 0.5 - w * 0.9, opacity: 0.92 }, st]}>
      <Art id="ship" width={w} />
    </Animated.View>
  );
}

function Riser({ id, W, H, visit, side }: { id: 'laboon' | 'seaking'; W: number; H: number; visit: number; side: 'left' | 'right' | 'any' }) {
  const w = Math.min(W, H) * (id === 'laboon' ? 0.42 : 0.24);
  const h = w / AMBIENT_AR[id];
  const rise = useSharedValue(0);
  const sway = useSharedValue(0);
  const [pos, setPos] = useState({ x: 0, flip: false });
  useEffect(() => {
    if (visit === 0) return;
    const onLeft = side === 'left' || (side === 'any' && Math.random() < 0.5);
    setPos({ x: onLeft ? rand(-w * 0.15, W * 0.12) : rand(W * 0.62, W - w * 0.85), flip: !onLeft });
    rise.value = withSequence(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.back(1.2)) }),
      withDelay(id === 'laboon' ? 2600 : 2000, withTiming(0, { duration: 1500, easing: Easing.in(Easing.quad) })),
    );
    sway.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), 6, true);
  }, [visit, rise, sway, W, w, id, side]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.value * 2),
    transform: [{ translateY: (1 - rise.value) * h * 0.9 }, { rotate: `${(sway.value - 0.5) * (id === 'seaking' ? 6 : 2)}deg` }],
  }));
  if (visit === 0) return null;
  return (
    <View style={[styles.abs, { left: pos.x, top: H - h * 0.98, width: w, height: h, overflow: 'hidden' }]}>
      <Animated.View style={st}>
        <Art id={id} width={w} flip={pos.flip} />
      </Animated.View>
    </View>
  );
}

/** Behind the board: the ship on the horizon, Laboon and a Sea King now and then. */
export function SeaAmbience(): JSX.Element | null {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReduced();
  const laboon = useVisits(!reduced, [6000, 14000], [28000, 48000]);
  const seaking = useVisits(!reduced, [18000, 30000], [36000, 62000]);
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Ship W={W} H={H} />
      <Riser id="laboon" W={W} H={H} visit={laboon} side="any" />
      <Riser id="seaking" W={W} H={H} visit={seaking} side="any" />
    </View>
  );
}

// ---------- On the board ----------

function Flag({ x, y, w, delay }: { x: number; y: number; w: number; delay: number }) {
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(wave);
  }, [wave, delay]);
  const st = useAnimatedStyle(() => ({
    transformOrigin: '8% 50%',
    transform: [{ scaleX: 0.9 + wave.value * 0.1 }, { skewY: `${-4 + wave.value * 8}deg` }],
  }));
  return (
    <Animated.View style={[styles.abs, { left: x, top: y }, st]}>
      <Art id="flag" width={w} />
    </Animated.View>
  );
}

function Crosser({ id, S, visit, y, w, ms, flap, say }: { id: 'newscoo' | 'karoo' | 'dendenmushi'; S: number; visit: number; y: number; w: number; ms: number; flap?: boolean; say?: string }) {
  const t = useSharedValue(0);
  const f = useSharedValue(0);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (visit === 0) return;
    setOn(true);
    t.value = 0;
    t.value = withTiming(1, { duration: ms, easing: Easing.linear }, (done) => {
      if (done) runOnJS(setOn)(false);
    });
    f.value = withRepeat(withTiming(1, { duration: flap ? 180 : id === 'karoo' ? 140 : 700 }), -1, true);
    return () => { cancelAnimation(t); cancelAnimation(f); };
  }, [visit, t, f, ms, flap, id]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 8, (1 - t.value) * 8),
    transform: [
      { translateX: -w + t.value * (S + w) },
      { translateY: flap ? Math.sin(t.value * 18) * S * 0.015 : id === 'karoo' ? -Math.abs(Math.sin(t.value * 40)) * w * 0.06 : 0 },
      { scaleY: flap ? 1 - f.value * 0.14 : id === 'dendenmushi' ? 1 - f.value * 0.04 : 1 },
    ],
  }));
  if (!on) return null;
  return (
    <Animated.View style={[styles.abs, { left: 0, top: y }, st]}>
      {say ? (
        <View style={styles.say}>
          <Text style={[styles.sayText, { fontSize: Math.max(10, S * 0.016) }]}>{say}</Text>
        </View>
      ) : null}
      <Art id={id} width={w} />
    </Animated.View>
  );
}

// The island art reaches ISLAND × the board; its water ring is the outer band of that square.
const RING = 0.15;

function CoastShip({ S }: { S: number }) {
  const w = S * 0.13;
  const h = w / AMBIENT_AR.ship;
  const x = useSharedValue(0);
  const bob = useSharedValue(0);
  useEffect(() => {
    // sails right to left along the water south of the island, then again
    x.value = withRepeat(withTiming(1, { duration: 60000, easing: Easing.linear }), -1);
    bob.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { cancelAnimation(x); cancelAnimation(bob); };
  }, [x, bob]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, x.value * 12, (1 - x.value) * 12),
    transform: [
      { translateX: S * (1 + RING * 0.6) - x.value * (S * (1 + RING * 1.2) + w) },
      { translateY: bob.value * S * 0.004 },
      { rotate: `${-2 + bob.value * 4}deg` },
    ],
  }));
  // the hull's waterline sits in the turquoise band under the beach
  return (
    <Animated.View style={[styles.abs, { left: 0, top: S * 1.07 - h * 0.92 }, st]}>
      <Art id="ship" width={w} />
    </Animated.View>
  );
}

function CoastRiser({ id, S, visit }: { id: 'laboon' | 'seaking'; S: number; visit: number }) {
  const w = S * (id === 'laboon' ? 0.2 : 0.11);
  const h = w / AMBIENT_AR[id];
  const rise = useSharedValue(0);
  const [spot, setSpot] = useState({ x: 0, y: 0, flip: false });
  useEffect(() => {
    if (visit === 0) return;
    // the water below the island, left or right of the middle dock
    const left = Math.random() < 0.5;
    setSpot({ x: left ? S * rand(0.05, 0.3) : S * rand(0.62, 0.95) - w, y: S * 1.08, flip: !left });
    rise.value = withSequence(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.back(1.2)) }),
      withDelay(id === 'laboon' ? 2600 : 2000, withTiming(0, { duration: 1500, easing: Easing.in(Easing.quad) })),
    );
  }, [visit, rise, S, w, id]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.value * 2),
    transform: [{ translateY: (1 - rise.value) * h }],
  }));
  if (visit === 0) return null;
  // clipped at the waterline: it rises out of the sea, never out of the sand
  return (
    <View style={[styles.abs, { left: spot.x, top: spot.y - h, width: w, height: h, overflow: 'hidden' }]}>
      <Animated.View style={st}>
        <Art id={id} width={w} flip={spot.flip} />
      </Animated.View>
    </View>
  );
}

/**
 * On the board: Jolly Rogers waving over the four houses, a News Coo flying over, a Den Den Mushi
 * crawling along an edge and Karoo running past. `nests` are the four house rectangles.
 */
export function BoardAmbience({ S, nests }: { S: number; nests: { x: number; y: number; w: number; h: number }[] }): JSX.Element | null {
  const reduced = useReduced();
  const coo = useVisits(!reduced, [8000, 16000], [22000, 40000]);
  const snail = useVisits(!reduced, [20000, 34000], [40000, 70000]);
  const duck = useVisits(!reduced, [30000, 50000], [45000, 80000]);
  const [ys] = useState(() => ({ coo: rand(0.08, 0.3), snail: rand(0.82, 0.88), duck: rand(0.4, 0.55) }));
  const flagW = S * 0.1;
  const laboon = useVisits(!reduced, [7000, 15000], [28000, 48000]);
  const seaking = useVisits(!reduced, [18000, 30000], [36000, 62000]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {reduced ? null : (
        <>
          {/* in the island's water ring, below and beside the coast: never over the land */}
          <CoastShip S={S} />
          <CoastRiser id="laboon" S={S} visit={laboon} />
          <CoastRiser id="seaking" S={S} visit={seaking} />
        </>
      )}
      {nests.map((n, i) => (
        <Flag key={i} x={n.x + n.w * 0.72} y={n.y - flagW * 0.62} w={flagW} delay={i * 260} />
      ))}
      {reduced ? null : (
        <>
          <Crosser id="newscoo" S={S} visit={coo} y={S * ys.coo} w={S * 0.13} ms={6500} flap />
          <Crosser id="dendenmushi" S={S} visit={snail} y={S * ys.snail} w={S * 0.09} ms={16000} say="Purupurupuru…" />
          <Crosser id="karoo" S={S} visit={duck} y={S * ys.duck} w={S * 0.09} ms={3200} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  say: {
    alignSelf: 'center',
    backgroundColor: '#FFFDF6',
    borderColor: '#3A2A12',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  sayText: { color: '#2A1E12', fontWeight: '800' },
});
