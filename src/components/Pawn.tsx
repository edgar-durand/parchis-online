import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CHARACTERS } from '../types';
import type { PawnProps } from '../types';
import { HIT, motion } from '../theme';
import { hues, shadow } from '../art';
import { ART, artUrl } from '../art-sprites';
import type { ArtPose } from '../art-sprites';
import { COLORS } from '../types';

// Warm the image cache once, so a pose change never shows an empty frame.
let prefetched = false;
function prefetchArt(): void {
  if (prefetched) return;
  prefetched = true;
  (['idle', 'walk', 'walk2', 'walk3', 'attack', 'hit', 'cheer'] as ArtPose[]).forEach((pz) =>
    COLORS.forEach((c) => {
      void Image.prefetch(artUrl(c, pz)).catch(() => undefined);
    }),
  );
}

const EYE = '#2A1E1A';
const SKIN = '#F2C29B';
const SKIN_TAN = '#E3AE82';
const SKIN_BLUE = '#7FB0D9';
const DUST = '#E9D8B4';
const STEP_MS = 190;

type Emblem = 'hat' | 'swords' | 'boot' | 'wave';

type LegCfg = { pants: string; len: number; skin: string; shoe: string };

const LEGS: Record<Emblem, LegCfg> = {
  hat: { pants: '#2C5B9C', len: 14, skin: SKIN, shoe: '#C9A15B' },
  boot: { pants: '#1E2230', len: 29, skin: SKIN, shoe: '#0E0F14' },
  swords: { pants: '#2F5E34', len: 26, skin: SKIN_TAN, shoe: '#2A1E1A' },
  wave: { pants: '#2B4A74', len: 20, skin: SKIN_BLUE, shoe: '#22252E' },
};

function Leg({ cfg, w, h }: { cfg: LegCfg; w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 16 68">
      <Rect x={3} y={cfg.len - 3} width={10} height={32 - cfg.len} rx={3} fill={cfg.skin} />
      <Rect x={2} y={0} width={12} height={cfg.len} rx={4} fill={cfg.pants} />
      <Rect x={4} y={1} width={3} height={Math.max(4, cfg.len - 4)} rx={1.5} fill="#FFFFFF" opacity={0.15} />
      <Path d="M1 29 C1 26,15 26,15 29 L16 33 C16 35,0 35,0 33 Z" fill={cfg.shoe} />
    </Svg>
  );
}

// Torso, arms and props of each character in a 100x140 box (legs are separate, animated).
function Body({ emblem }: { emblem: Emblem }) {
  switch (emblem) {
    case 'hat':
      return (
        <G>
          <Path d="M27 60 C19 66,19 80,23 88 L31 87 C29 79,30 69,33 62 Z" fill={SKIN} />
          <Path d="M73 60 C81 66,81 80,77 88 L69 87 C71 79,70 69,67 62 Z" fill={SKIN} />
          <Circle cx={26} cy={90} r={4.5} fill={SKIN} />
          <Circle cx={74} cy={90} r={4.5} fill={SKIN} />
          <Path d="M31 58 C33 54,67 54,69 58 L68 90 L32 90 Z" fill="#C8312B" />
          <Path d="M44 55 L50 76 L56 55 Z" fill={SKIN} />
          <Path d="M45 62 L55 70 M55 62 L45 70" stroke="#B5654A" strokeWidth={1.4} strokeLinecap="round" />
          <Rect x={30} y={84} width={40} height={7} rx={2} fill="#E8C060" />
          <Path d="M62 85 L68 92 M64 85 L72 90" stroke="#A9822F" strokeWidth={1.6} strokeLinecap="round" />
        </G>
      );
    case 'boot':
      return (
        <G>
          <Path d="M27 60 C19 66,20 82,24 90 L32 89 C30 80,31 70,33 62 Z" fill="#2B2F3A" />
          <Path d="M73 60 C81 66,80 82,76 90 L68 89 C70 80,69 70,67 62 Z" fill="#2B2F3A" />
          <Circle cx={27} cy={92} r={4.3} fill={SKIN} />
          <Circle cx={73} cy={92} r={4.3} fill={SKIN} />
          <Path d="M30 58 C32 54,68 54,70 58 L69 92 L31 92 Z" fill="#2B2F3A" />
          <Path d="M43 55 L50 78 L57 55 Z" fill="#FFFFFF" />
          <Path d="M49 58 L51 58 L52 80 L50 85 L48 80 Z" fill="#14161D" />
          <Path d="M43 55 L48 80 M57 55 L52 80" stroke="#1B1D25" strokeWidth={1.4} />
        </G>
      );
    case 'swords':
      return (
        <G>
          <Path d="M27 60 C19 66,19 80,23 88 L31 87 C29 79,30 69,33 62 Z" fill={SKIN_TAN} />
          <Path d="M73 60 C81 66,81 80,77 88 L69 87 C71 79,70 69,67 62 Z" fill={SKIN_TAN} />
          <Circle cx={26} cy={90} r={4.5} fill={SKIN_TAN} />
          <Circle cx={74} cy={90} r={4.5} fill={SKIN_TAN} />
          <Path d="M31 58 C33 54,67 54,69 58 L68 90 L32 90 Z" fill="#F1ECDD" />
          <Path d="M44 55 L50 72 L56 55 Z" fill={SKIN_TAN} />
          <Rect x={30} y={82} width={40} height={9} rx={2} fill="#3E7A43" />
          <Path d="M31 84 L15 113 M33 85 L20 115 M35 86 L25 117" stroke="#2A1E1A" strokeWidth={3} strokeLinecap="round" />
          <Path d="M31 84 L34 79 M33 85 L36 80 M35 86 L38 81" stroke="#E8C060" strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'wave':
    default:
      return (
        <G>
          <Path d="M22 60 C12 66,12 82,17 92 L28 90 C26 80,27 70,30 62 Z" fill={SKIN_BLUE} />
          <Path d="M78 60 C88 66,88 82,83 92 L72 90 C74 80,73 70,70 62 Z" fill={SKIN_BLUE} />
          <Circle cx={22} cy={94} r={5.5} fill={SKIN_BLUE} />
          <Circle cx={78} cy={94} r={5.5} fill={SKIN_BLUE} />
          <Path d="M24 58 C28 52,72 52,76 58 L74 92 L26 92 Z" fill={SKIN_BLUE} />
          <Path d="M26 58 L40 56 L44 90 L26 92 Z" fill="#3A5E8C" />
          <Path d="M74 58 L60 56 L56 90 L74 92 Z" fill="#3A5E8C" />
          <Rect x={26} y={84} width={48} height={8} rx={2} fill="#F1ECDD" />
          <Path d="M50 62 L50 82" stroke="#4F83B3" strokeWidth={1.2} />
        </G>
      );
  }
}

function Head({ emblem }: { emblem: Emblem }) {
  switch (emblem) {
    case 'hat':
      return (
        <G>
          <Circle cx={50} cy={46} r={16} fill={SKIN} />
          <Path d="M34 42 C36 36,64 36,66 42 L66 40 C60 34,40 34,34 40 Z" fill="#2A1E1A" />
          <Circle cx={44} cy={47} r={1.8} fill={EYE} />
          <Circle cx={56} cy={47} r={1.8} fill={EYE} />
          <Path d="M43 51 L45 52.5" stroke="#8E1F1B" strokeWidth={1.2} strokeLinecap="round" />
          <Path d="M43 54 C47 59,53 59,57 54 Z" fill="#FFFFFF" stroke={EYE} strokeWidth={1.2} strokeLinejoin="round" />
          <Ellipse cx={50} cy={36} rx={25} ry={5.5} fill="#E8C060" stroke="#A9822F" strokeWidth={1.2} />
          <Path d="M35 36 C35 20,65 20,65 36 Z" fill="#F0CF72" stroke="#A9822F" strokeWidth={1.2} strokeLinejoin="round" />
          <Path d="M35.5 33 C42 36,58 36,64.5 33" stroke="#C8312B" strokeWidth={4} fill="none" />
        </G>
      );
    case 'boot':
      return (
        <G>
          <Circle cx={50} cy={46} r={16} fill={SKIN} />
          <Path d="M33 47 C29 28,66 25,67 44 C61 36,52 33,45 39 C42 42,40 47,33 47 Z" fill="#F2D35B" stroke="#B89A2E" strokeWidth={1} strokeLinejoin="round" />
          <Circle cx={56} cy={47} r={1.8} fill={EYE} />
          <Path d="M52 42 C54 39,58 39,60 42" stroke="#B89A2E" strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Path d="M50 54 L66 56" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
          <Circle cx={66.5} cy={56} r={1.3} fill="#E0643A" />
          <Path d="M45 55 C48 56.5,51 56.5,53 55" stroke={EYE} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'swords':
      return (
        <G>
          <Circle cx={50} cy={46} r={16} fill={SKIN_TAN} />
          <Path d="M34 46 C31 29,69 29,66 46 C62 38,56 36,50 37 C44 36,38 38,34 46 Z" fill="#4E9A52" stroke="#2F6B34" strokeWidth={1} strokeLinejoin="round" />
          <Path d="M43 41 L47 52" stroke="#9C4B3A" strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M42 46 L46 47" stroke={EYE} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={56} cy={47} r={1.8} fill={EYE} />
          <Path d="M45 55 C48 54,52 54,55 56" stroke={EYE} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Circle cx={34.5} cy={52} r={2} fill="#E8C060" />
          <Circle cx={34.5} cy={56} r={2} fill="#E8C060" />
        </G>
      );
    case 'wave':
    default:
      return (
        <G>
          <Ellipse cx={50} cy={46} rx={18} ry={17} fill={SKIN_BLUE} />
          <Path d="M32 43 C32 26,68 26,68 43 C62 35,38 35,32 43 Z" fill="#1F3558" />
          <Path d="M40 41 L46 43" stroke="#1F3558" strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M60 41 L54 43" stroke="#1F3558" strokeWidth={2.2} strokeLinecap="round" />
          <Circle cx={43} cy={47} r={1.8} fill={EYE} />
          <Circle cx={57} cy={47} r={1.8} fill={EYE} />
          <Path d="M48 49 C49 52,51 52,52 49" stroke="#4F83B3" strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Path d="M41 55 C46 59,54 59,59 55" stroke={EYE} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Path d="M45 57 L46.5 58.5 L48 57.5 M52 57.5 L53.5 58.5 L55 57" stroke="#FFFFFF" strokeWidth={1} fill="none" strokeLinejoin="round" />
        </G>
      );
  }
}

// Where each character's open eyes sit (Head coordinates): a blink covers them with lids.
const EYES: Record<Emblem, { x: number; y: number }[]> = {
  hat: [{ x: 44, y: 47 }, { x: 56, y: 47 }],
  boot: [{ x: 56, y: 47 }],
  swords: [{ x: 56, y: 47 }],
  wave: [{ x: 43, y: 47 }, { x: 57, y: 47 }],
};
const SKIN_OF: Record<Emblem, string> = { hat: SKIN, boot: SKIN, swords: SKIN_TAN, wave: SKIN_BLUE };

function Lids({ emblem }: { emblem: Emblem }) {
  return (
    <G>
      {EYES[emblem].map((e) => (
        <G key={`${e.x}`}>
          <Ellipse cx={e.x} cy={e.y} rx={3} ry={2.8} fill={SKIN_OF[emblem]} />
          <Path d={`M${e.x - 2.6} ${e.y + 0.4} Q${e.x} ${e.y + 1.8} ${e.x + 2.6} ${e.y + 0.4}`} stroke={EYE} strokeWidth={1.3} strokeLinecap="round" fill="none" />
        </G>
      ))}
    </G>
  );
}

/** A random whole number of ms in [a, b). */
function between(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a));
}

export type PawnPose = 'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'cheer';

function PawnView({
  color,
  x,
  y,
  size,
  movable,
  dimmed,
  stacked,
  onPress,
  pose = 'idle',
  excited = false,
  still = false,
}: PawnProps & { pose?: PawnPose; excited?: boolean; still?: boolean }) {
  const reduced = useReducedMotion();
  // Alive: breathing, blinking and a spontaneous fidget now and then (a hop, a look around,
  // a shake), each character on its own random clock so the crew never moves in sync.
  const breath = useSharedValue(0);
  const idleHop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const run = useSharedValue(0);
  const [blink, setBlink] = useState(false);
  const [artOk, setArtOk] = useState(true);
  const [stride, setStride] = useState(0);
  const [joy, setJoy] = useState(false);
  useEffect(prefetchArt, []);
  // A walk cycle of four drawn frames: one leg forward, passing, the other leg forward, passing.
  useEffect(() => {
    if (pose !== 'walk' && pose !== 'run') {
      setStride(0);
      return;
    }
    const h = setInterval(() => setStride((v) => (v + 1) % 4), pose === 'run' ? 90 : 125);
    return () => clearInterval(h);
  }, [pose]);
  const frame: ArtPose =
    pose === 'attack' || pose === 'hit' || pose === 'cheer'
      ? pose
      : pose === 'walk' || pose === 'run'
        ? (['walk', 'walk2', 'walk3', 'walk2'] as const)[stride]
        : joy ? 'cheer' : 'idle';
  const h = hues[color];
  const emblem = CHARACTERS[color].emblem as Emblem;
  const cfg = LEGS[emblem] ?? LEGS.hat;
  const W = stacked ? size * 1.25 : size * 1.55;
  const H = W * 1.4;
  const u = W / 100;
  const box = size * 2;
  const ox = box / 2;
  const oy = box * 0.62;

  const px = useSharedValue(x);
  const py = useSharedValue(y);
  const hopN = useSharedValue(0);
  const liftV = useSharedValue(0);
  const swing = useSharedValue(0);
  const moving = useSharedValue(0);
  const face = useSharedValue(1);
  const spin = useSharedValue(0);
  const dust = useSharedValue(0);
  const flash = useSharedValue(0);
  const pulse = useSharedValue(0);
  const prev = useRef({ x, y });

  useEffect(() => {
    const dx = x - prev.current.x;
    const dy = y - prev.current.y;
    if (dx === 0 && dy === 0) return;
    prev.current = { x, y };
    if (Math.abs(dx) > 0.5) face.value = dx > 0 ? 1 : -1;
    if (reduced) {
      px.value = x;
      py.value = y;
      return;
    }
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > size * 4) {
      // jump out of the nest / thrown back home: arc, flip, impact flash
      const dur = motion.slow + 120;
      liftV.value = Math.min(dist * 0.35, size * 4);
      px.value = withTiming(x, { duration: dur, easing: Easing.out(Easing.cubic) });
      py.value = withTiming(y, { duration: dur, easing: Easing.out(Easing.cubic) });
      hopN.value = withSequence(
        withTiming(1, { duration: dur / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: dur / 2, easing: Easing.in(Easing.quad) }),
      );
      spin.value = withSequence(
        withTiming(360, { duration: dur, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      );
      moving.value = withSequence(withTiming(1, { duration: dur }), withTiming(0, { duration: 160 }));
      swing.value = withSequence(
        withTiming(1, { duration: dur / 2 }),
        withTiming(-1, { duration: dur / 2 }),
        withTiming(0, { duration: 120 }),
      );
      flash.value = withSequence(
        withTiming(0, { duration: dur }),
        withTiming(1, { duration: 70 }),
        withTiming(0, { duration: 320 }),
      );
      dust.value = withSequence(
        withTiming(0, { duration: dur }),
        withTiming(1, { duration: 40 }),
        withTiming(0, { duration: 260 }),
      );
      return;
    }
    // walk: one hop, leg swing and dust puff per square
    const steps = Math.max(1, Math.min(8, Math.round(dist / (size * 2))));
    const total = steps * STEP_MS;
    liftV.value = size * 0.5;
    const ease = steps === 1 ? Easing.out(Easing.cubic) : Easing.linear;
    px.value = withTiming(x, { duration: total, easing: ease });
    py.value = withTiming(y, { duration: total, easing: ease });
    hopN.value = withRepeat(
      withSequence(
        withTiming(1, { duration: STEP_MS / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: STEP_MS / 2, easing: Easing.in(Easing.quad) }),
      ),
      steps,
    );
    swing.value = withSequence(
      withRepeat(
        withSequence(withTiming(1, { duration: STEP_MS }), withTiming(-1, { duration: STEP_MS })),
        Math.ceil(steps / 2),
      ),
      withTiming(0, { duration: 120 }),
    );
    moving.value = withSequence(withTiming(1, { duration: total }), withTiming(0, { duration: 150 }));
    dust.value = withRepeat(
      withSequence(
        withTiming(0, { duration: STEP_MS * 0.6 }),
        withTiming(1, { duration: 30 }),
        withTiming(0, { duration: STEP_MS * 0.4 - 30 }),
      ),
      steps,
    );
  }, [x, y, size, reduced, px, py, hopN, liftV, swing, moving, face, spin, dust, flash]);

  useEffect(() => {
    if (movable && !reduced) {
      pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = movable ? 0.6 : 0;
    }
    return () => cancelAnimation(pulse);
  }, [movable, reduced, pulse]);

  const calm = reduced || still;
  useEffect(() => {
    if (calm) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withDelay(
      between(0, 900),
      withRepeat(withTiming(1, { duration: between(1500, 2300), easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(breath);
  }, [calm, breath]);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => alive && setBlink(false), 120);
        next();
      }, between(2200, 5600));
    };
    next();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reduced]);

  useEffect(() => {
    if (calm || pose !== 'idle') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const fidget = () => {
      const roll = Math.random();
      if (excited && roll < 0.22) {
        setJoy(true);
        setTimeout(() => alive && setJoy(false), 650);
      }
      if (roll < 0.4) {
        // a little hop (two when excited)
        idleHop.value = withSequence(
          withTiming(1, { duration: 170, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }),
          ...(excited ? [withTiming(0.8, { duration: 160 }), withTiming(0, { duration: 180 })] : []),
        );
      } else if (roll < 0.75) {
        // looks around
        const dir = Math.random() < 0.5 ? -1 : 1;
        tilt.value = withSequence(
          withTiming(dir * 9, { duration: 220 }),
          withDelay(between(250, 600), withTiming(-dir * 6, { duration: 260 })),
          withTiming(0, { duration: 220 }),
        );
      } else {
        // a happy shake
        tilt.value = withSequence(
          withTiming(6, { duration: 70 }),
          withTiming(-6, { duration: 90 }),
          withTiming(5, { duration: 90 }),
          withTiming(-4, { duration: 90 }),
          withTiming(0, { duration: 80 }),
        );
      }
    };
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        fidget();
        loop();
      }, excited ? between(900, 1900) : between(3500, 9000));
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [calm, pose, excited, idleHop, tilt]);

  useEffect(() => {
    cancelAnimation(run);
    cancelAnimation(swing);
    if (reduced) {
      run.value = pose === 'run' ? 1 : 0;
      return;
    }
    if (pose === 'run') {
      run.value = withTiming(1, { duration: 120 });
      swing.value = withRepeat(
        withSequence(withTiming(1, { duration: 120 }), withTiming(-1, { duration: 120 })),
        -1,
      );
      idleHop.value = withRepeat(
        withSequence(withTiming(0.7, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 120 })),
        -1,
      );
    } else if (pose === 'cheer') {
      run.value = withTiming(0, { duration: 120 });
      idleHop.value = withRepeat(
        withSequence(withTiming(1.4, { duration: 220, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })),
        -1,
      );
      swing.value = withRepeat(withSequence(withTiming(1, { duration: 220 }), withTiming(-1, { duration: 220 })), -1);
    } else if (pose === 'hit') {
      run.value = withTiming(0, { duration: 80 });
      tilt.value = withRepeat(withSequence(withTiming(-14, { duration: 90 }), withTiming(10, { duration: 90 })), -1, true);
    } else {
      run.value = withTiming(0, { duration: 160 });
      swing.value = withTiming(0, { duration: 160 });
      idleHop.value = withTiming(0, { duration: 160 });
      tilt.value = withTiming(0, { duration: 160 });
    }
  }, [pose, reduced, run, swing, idleHop, tilt]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: px.value - ox }, { translateY: py.value - oy }],
  }));
  const spriteStyle = useAnimatedStyle(() => {
    const s = hopN.value;
    const m = moving.value;
    const b = breath.value;
    const deg = face.value * m * 6 + swing.value * 3 + spin.value + tilt.value + run.value * 10;
    return {
      transform: [
        { translateY: -s * liftV.value - pulse.value * 2 - idleHop.value * size * 0.45 },
        { rotate: `${deg}deg` },
        { scaleX: (1 - 0.08 * (s - 0.5) * m) * (1 - 0.018 * b) },
        { scaleY: (1 + 0.12 * (s - 0.5) * m) * (1 + 0.035 * b) },
      ],
    };
  });
  const legL = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value * 32}deg` }] }));
  const legR = useAnimatedStyle(() => ({ transform: [{ rotate: `${-swing.value * 32}deg` }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.45 * pulse.value,
    transform: [{ scale: 0.9 + 0.25 * pulse.value }],
  }));
  const dustStyle = useAnimatedStyle(() => ({
    opacity: dust.value * 0.6,
    transform: [{ translateX: -face.value * size * 0.5 }, { scale: 0.5 + dust.value * 0.9 }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.9,
    transform: [{ scale: 0.4 + flash.value * 1.0 }],
  }));

  const halo = size * 1.9;
  const dustSize = size * 0.9;
  const ring = size * 3;
  const extra = Math.max(8, (HIT + 8 - W) / 2);
  const label = `Ficha de ${CHARACTERS[color].name}${movable ? ', se puede mover' : ''}`;
  const legW = 16 * u;
  const legH = 68 * u;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        { width: box, height: box, zIndex: movable ? 20 : stacked ? 5 : 10, opacity: dimmed ? 0.45 : 1 },
        containerStyle,
      ]}
    >
      {movable ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: halo,
              height: halo * 0.5,
              borderRadius: halo / 2,
              left: ox - halo / 2,
              top: oy - halo * 0.25,
              backgroundColor: h.glow,
              borderColor: h.tint,
            },
            haloStyle,
          ]}
        />
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { width: ring, height: ring * 0.5, borderRadius: ring / 2, left: ox - ring / 2, top: oy - ring * 0.25, borderColor: h.tint, backgroundColor: h.glow },
          flashStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: ox - dustSize / 2, top: oy - dustSize * 0.6 }, dustStyle]}
      >
        <Svg width={dustSize} height={dustSize} viewBox="0 0 40 40">
          <Circle cx={12} cy={26} r={8} fill={DUST} />
          <Circle cx={24} cy={22} r={10} fill={DUST} opacity={0.8} />
          <Circle cx={31} cy={30} r={5} fill={DUST} opacity={0.7} />
        </Svg>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !onPress || !movable }}
        disabled={!onPress || !movable}
        onPress={onPress}
        hitSlop={{ top: extra, bottom: extra, left: extra, right: extra }}
        style={({ pressed }) => [
          styles.pawn,
          { left: ox - W / 2, top: oy - H * 0.9, width: W, height: H },
          pressed && movable ? styles.pressed : null,
        ]}
      >
        <Animated.View style={[{ width: W, height: H, transformOrigin: '50% 90%' }, spriteStyle]}>
          <Svg width={W} height={H} viewBox="0 0 100 140" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`pw-base-${color}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={h.tint} />
                <Stop offset="1" stopColor={h.shade} />
              </LinearGradient>
            </Defs>
            <Ellipse cx={50 + shadow.offsetX} cy={129} rx={34} ry={7} fill={shadow.color} />
            <Ellipse cx={50} cy={126} rx={33} ry={9} fill="#FFFFFF" opacity={0.6} />
            <Ellipse cx={50} cy={126} rx={30} ry={7.5} fill={`url(#pw-base-${color})`} stroke={h.shade} strokeWidth={2} />
          </Svg>
          {artOk ? (
            (() => {
              const a = ART[color][frame];
              const ih = H * 0.9 * a.k;
              const iw = ih * a.ar;
              return (
                <Image
                  source={{ uri: artUrl(color, frame) }}
                  onError={() => setArtOk(false)}
                  resizeMode="contain"
                  fadeDuration={0}
                  accessibilityIgnoresInvertColors
                  style={{ position: 'absolute', width: iw, height: ih, left: W / 2 - iw / 2, top: H * 0.91 - ih }}
                />
              );
            })()
          ) : (
            <>
          <Animated.View
            style={[
              { position: 'absolute', left: 34 * u, top: 54 * u, width: legW, height: legH },
              legL,
            ]}
          >
            <Leg cfg={cfg} w={legW} h={legH} />
          </Animated.View>
          <Animated.View
            style={[
              { position: 'absolute', left: 50 * u, top: 54 * u, width: legW, height: legH },
              legR,
            ]}
          >
            <Leg cfg={cfg} w={legW} h={legH} />
          </Animated.View>
          <Svg width={W} height={H} viewBox="0 0 100 140" style={StyleSheet.absoluteFill}>
            <Body emblem={emblem} />
            <Rect x={45} y={50} width={10} height={10} fill={emblem === 'wave' ? SKIN_BLUE : emblem === 'swords' ? SKIN_TAN : SKIN} />
            <G transform="translate(-7.5 -18) scale(1.15)">
              <Head emblem={emblem} />
              {blink || pose === 'hit' ? <Lids emblem={emblem} /> : null}
            </G>
            <Ellipse cx={42} cy={22} rx={6} ry={2.4} fill="#FFFFFF" opacity={0.28} />
          </Svg>
            </>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// The board re-renders every frame while a piece moves: a pawn redraws only when what it shows
// changes. `onPress` is a fresh closure each render, so it is read from a ref instead.
const Pawn = React.memo(
  function PawnMemo(props: React.ComponentProps<typeof PawnView>) {
    const press = useRef(props.onPress);
    press.current = props.onPress;
    const stable = useRef(() => press.current?.()).current;
    return <PawnView {...props} onPress={props.onPress ? stable : undefined} />;
  },
  (a, b) =>
    a.color === b.color &&
    a.x === b.x &&
    a.y === b.y &&
    a.size === b.size &&
    a.movable === b.movable &&
    a.dimmed === b.dimmed &&
    a.stacked === b.stacked &&
    a.pose === b.pose &&
    a.excited === b.excited &&
    a.still === b.still &&
    !!a.onPress === !!b.onPress,
);
export default Pawn;

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, top: 0 },
  halo: { position: 'absolute', borderWidth: 3 },
  ring: { position: 'absolute', borderWidth: 3 },
  pawn: { position: 'absolute' },
  pressed: { transform: [{ scale: 0.97 }] },
});
