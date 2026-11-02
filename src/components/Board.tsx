import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { BoardProps, COLORS, Color, GOAL, Point, SAFE_SQUARES, START_SQUARE } from '../types';
import { elevation } from '../theme';
import { gold, hues, loops, parchment, wood } from '../art';
import { CIRCUIT_COORDS, homeCoords, laneCoords, pointFor } from '../engine/board';
import Pawn from './Pawn';
import CaptureClip, { CLIP_MS } from './CaptureClip';
import { TalkBubble, emoteLine, lineFor, speakLine } from './PirateTalk';
import type { Line as VoiceLine, Talk, TalkKind } from './PirateTalk';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Rc = { x: number; y: number; w: number; h: number };
interface Geo {
  size: number;
  d: number;
  circ: Point[];
  lanes: Record<Color, Point[]>;
  homes: Record<Color, Point[]>;
  nests: Record<Color, Rc>;
  goal: { cx: number; cy: number; half: number };
  tris: Record<Color, Point[]>;
  pt: (c: Color, prog: number, idx: number) => Point;
}
type Over = { x: number; y: number; lift: number; face: number; sx: number; sy: number; rot: number };
type Anim = { key: string; pts: Point[]; seg: number; start: number; lift: number; arc: boolean; face?: number; lastI?: number; hold?: number; brawl?: boolean; side?: number };
type Burst = { id: number; x: number; y: number; color: Color; start: number; dust?: boolean; fight?: boolean; goal?: boolean };
type BurstView = { id: number; x: number; y: number; color: Color; t: number; dust?: boolean; fight?: boolean; goal?: boolean };

const FIGHT_MS = 900;

// Face-to-face scuffle pose: both pieces square up, lunge in turns and jitter.
function brawlPose(t: number, dur: number, base: Point, side: number, d: number): Over {
  const ramp = Math.max(0, Math.min(1, t / 120, (dur - t) / 100));
  const beat = Math.max(0, Math.sin((t / 140) * Math.PI * 2 + (side > 0 ? 0 : Math.PI)));
  const lunge = beat * d * 0.2;
  return {
    x: base.x + (side * d * 0.28 - side * lunge) * ramp + Math.sin(t / 23) * d * 0.03 * ramp,
    y: base.y + Math.sin(t / 31) * d * 0.02 * ramp,
    lift: Math.abs(Math.sin(t / 95)) * d * 0.1 * ramp,
    face: -side,
    sx: 1,
    sy: 1 + beat * 0.08,
    rot: beat * 8 * ramp * -side,
  };
}

function FightFx({ x, y, t, d, color }: { x: number; y: number; t: number; d: number; color: Color }) {
  const env = Math.max(0, Math.min(1, t * 6, (1 - t) * 5));
  const pulse = Math.max(0, Math.sin(t * Math.PI * 6));
  const puffs: React.ReactNode[] = [];
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + t * 9;
    const rr = d * (0.28 + 0.1 * Math.sin(t * 14 + k));
    puffs.push(
      <Circle
        key={`p${k}`}
        cx={x + Math.cos(a) * rr}
        cy={y - d * 0.1 + Math.sin(a) * rr * 0.7}
        r={d * (0.2 + 0.06 * (k % 3))}
        fill={k % 2 ? '#F3E8CC' : '#D9C79C'}
        fillOpacity={0.8 * env}
      />,
    );
  }
  const rays: React.ReactNode[] = [];
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4 + 0.4;
    const r0 = d * 0.3;
    const r1 = d * (0.3 + 0.55 * pulse);
    rays.push(
      <Line
        key={`r${k}`}
        x1={x + Math.cos(ang) * r0}
        y1={y - d * 0.1 + Math.sin(ang) * r0}
        x2={x + Math.cos(ang) * r1}
        y2={y - d * 0.1 + Math.sin(ang) * r1}
        stroke={k % 2 ? '#FFFFFF' : hues[color].tint}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeOpacity={pulse * env}
      />,
    );
  }
  return (
    <G>
      {puffs}
      {rays}
      <Circle cx={x} cy={y - d * 0.1} r={d * 0.18 * pulse} fill="#FFF3B0" fillOpacity={0.9 * env} />
    </G>
  );
}

const FRAME = 0.085;
const SAND_LIGHT = '#EBD8AA';
const SAND_DARK = '#C9AC75';
const PLANK_LIGHT = '#E6C48C';
const PLANK_DARK = '#C99A5B';
const STONE = '#A88A57';

interface ParamLike { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void }
interface NodeLike { connect(n: object): void }
interface OscLike extends NodeLike { type: string; frequency: ParamLike; start(t: number): void; stop(t: number): void }
interface GainLike extends NodeLike { gain: ParamLike }
interface AudioLike { currentTime: number; destination: object; resume(): unknown; createOscillator(): OscLike; createGain(): GainLike }
type SfxKind = 'step' | 'jump' | 'hit';
let audioCtx: AudioLike | null = null;

// Small synthesized effects (web only); never throws, silent when audio is unavailable.
function sfx(kind: SfxKind): void {
  if (Platform.OS !== 'web') return;
  try {
    const g = globalThis as unknown as {
      REMIX_SFX_MUTED?: boolean;
      AudioContext?: new () => AudioLike;
      webkitAudioContext?: new () => AudioLike;
    };
    if (g.REMIX_SFX_MUTED) return;
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    const ctx = audioCtx;
    void ctx.resume();
    const t = ctx.currentTime;
    const dur = kind === 'hit' ? 0.28 : kind === 'jump' ? 0.16 : 0.07;
    const f0 = kind === 'step' ? 180 : kind === 'jump' ? 320 : 140;
    const f1 = kind === 'step' ? 90 : kind === 'jump' ? 640 : 45;
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.type = kind === 'hit' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(kind === 'step' ? 0.08 : 0.14, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gn);
    gn.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    /* audio unavailable: keep playing silently */
  }
}

function makeMapper(size: number, q: number): (p: Point) => Point {
  const all: Point[] = [...CIRCUIT_COORDS];
  for (const c of COLORS) all.push(...laneCoords(c), ...homeCoords(c));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of all) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  const pad = size * FRAME;
  const inner = size - 2 * pad;
  return (p: Point): Point => {
    let x = (p.x - mx) / span + 0.5;
    let y = (p.y - my) / span + 0.5;
    for (let i = 0; i < q; i++) {
      const nx = 1 - y;
      y = x;
      x = nx;
    }
    return { x: pad + x * inner, y: pad + y * inner };
  };
}

function bbox(pts: Point[]): Rc {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function buildGeo(size: number, q: number): Geo {
  const toPx = makeMapper(size, q);
  const off = CIRCUIT_COORDS.length >= 69 ? 1 : 0;
  const circ: Point[] = [];
  for (let abs = 1; abs <= 68; abs++) circ.push(toPx(CIRCUIT_COORDS[abs - 1 + off] ?? CIRCUIT_COORDS[0]));
  let d = Infinity;
  for (let i = 0; i < circ.length; i++) {
    const a = circ[i];
    const b = circ[(i + 1) % circ.length];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist > 0.5 && dist < d) d = dist;
  }
  if (!isFinite(d)) d = (size * (1 - 2 * FRAME)) / 14;
  const lanes = {} as Record<Color, Point[]>;
  const homes = {} as Record<Color, Point[]>;
  const nests = {} as Record<Color, Rc>;
  const tris = {} as Record<Color, Point[]>;
  const c0 = size / 2;
  const edge = size * 0.05;
  let minInner = Infinity;
  for (const c of COLORS) {
    lanes[c] = laneCoords(c).map(toPx);
    homes[c] = homeCoords(c).map(toPx);
    for (const p of lanes[c]) {
      const cheb = Math.max(Math.abs(p.x - c0), Math.abs(p.y - c0));
      if (cheb > d * 0.3 && cheb < minInner) minInner = cheb;
    }
  }
  const half = Math.max(d * 0.9, Math.min(d * 2, (isFinite(minInner) ? minInner : d * 1.5) - d * 0.5));
  for (const c of COLORS) {
    const b = bbox(homes[c]);
    const pad = d * 1.1;
    let x0 = b.x - pad, y0 = b.y - pad, x1 = b.x + b.w + pad, y1 = b.y + b.h + pad;
    const ncx = b.x + b.w / 2;
    const ncy = b.y + b.h / 2;
    if (ncx < c0) x0 = Math.min(x0, edge); else x1 = Math.max(x1, size - edge);
    if (ncy < c0) y0 = Math.min(y0, edge); else y1 = Math.max(y1, size - edge);
    nests[c] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    const lp = lanes[c];
    let mxp = 0, myp = 0;
    for (const p of lp) { mxp += p.x - c0; myp += p.y - c0; }
    const n = Math.max(1, lp.length);
    mxp /= n; myp /= n;
    let dx = 0, dy = 0;
    if (Math.abs(mxp) >= Math.abs(myp)) dx = mxp >= 0 ? 1 : -1; else dy = myp >= 0 ? 1 : -1;
    const px = -dy, py = dx;
    tris[c] = [
      { x: c0, y: c0 },
      { x: c0 + dx * half + px * half, y: c0 + dy * half + py * half },
      { x: c0 + dx * half - px * half, y: c0 + dy * half - py * half },
    ];
  }
  const pt = (c: Color, prog: number, idx: number): Point => toPx(pointFor(c, Math.max(0, Math.min(GOAL, prog)), idx));
  return { size, d, circ, lanes, homes, nests, goal: { cx: c0, cy: c0, half }, tris, pt };
}

const DefsLayer = React.memo(function DefsLayer() {
  return (
    <Defs>
      <LinearGradient id="bdSea" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#2F93B8" />
        <Stop offset="0.5" stopColor="#1A6A93" />
        <Stop offset="1" stopColor="#0D3F66" />
      </LinearGradient>
      <LinearGradient id="bdSand" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={SAND_LIGHT} />
        <Stop offset="1" stopColor={SAND_DARK} />
      </LinearGradient>
      <LinearGradient id="bdPlank" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={PLANK_LIGHT} />
        <Stop offset="1" stopColor={PLANK_DARK} />
      </LinearGradient>
      <LinearGradient id="bdWood" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={wood.light} />
        <Stop offset="0.5" stopColor={wood.base} />
        <Stop offset="1" stopColor={wood.dark} />
      </LinearGradient>
      <LinearGradient id="bdSafe" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={gold.tint} />
        <Stop offset="1" stopColor={gold.base} />
      </LinearGradient>
      <RadialGradient id="bdPit" cx="0.62" cy="0.68" r="0.75">
        <Stop offset="0" stopColor="#5A3E26" />
        <Stop offset="1" stopColor="#120A05" />
      </RadialGradient>
      <RadialGradient id="bdStud" cx="0.35" cy="0.35" r="0.7">
        <Stop offset="0" stopColor={gold.tint} />
        <Stop offset="0.6" stopColor={gold.base} />
        <Stop offset="1" stopColor={gold.shade} />
      </RadialGradient>
      <RadialGradient id="bdGlow" cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#FFF3B0" stopOpacity={0.85} />
        <Stop offset="1" stopColor="#FFD54A" stopOpacity={0} />
      </RadialGradient>
      {COLORS.map((c) => (
        <LinearGradient key={c} id={`bdC-${c}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={hues[c].tint} />
          <Stop offset="0.5" stopColor={hues[c].base} />
          <Stop offset="1" stopColor={hues[c].shade} />
        </LinearGradient>
      ))}
    </Defs>
  );
});

function Lighthouse({ cx, cy, d }: { cx: number; cy: number; d: number }) {
  const yTop = cy - d * 0.6;
  const yBot = cy + d * 0.5;
  const wTop = d * 0.24;
  const wBot = d * 0.42;
  const hw = (y: number) => wTop + ((y - yTop) / (yBot - yTop)) * (wBot - wTop);
  const band = (y1: number, y2: number, fill: string, key: string) => (
    <Polygon key={key} points={`${cx - hw(y1)},${y1} ${cx + hw(y1)},${y1} ${cx + hw(y2)},${y2} ${cx - hw(y2)},${y2}`} fill={fill} />
  );
  const h = yBot - yTop;
  return (
    <G>
      <Circle cx={cx} cy={cy + d * 0.5} r={d * 0.62} fill="rgba(40,20,5,0.3)" />
      <Circle cx={cx} cy={cy + d * 0.45} r={d * 0.58} fill="url(#bdSand)" stroke={wood.dark} strokeWidth={1.2} />
      <Circle cx={cx} cy={yTop - d * 0.05} r={d * 1.0} fill="url(#bdGlow)" />
      {band(yTop, yBot, '#F6EBD0', 'b0')}
      {band(yTop + h * 0.2, yTop + h * 0.4, hues.red.base, 'b1')}
      {band(yTop + h * 0.6, yTop + h * 0.8, hues.red.base, 'b2')}
      <Rect x={cx - wTop * 1.35} y={yTop - d * 0.2} width={wTop * 2.7} height={d * 0.2} rx={d * 0.03} fill="url(#bdSafe)" stroke={wood.dark} strokeWidth={1} />
      <Rect x={cx - wTop * 0.7} y={yTop - d * 0.17} width={wTop * 1.4} height={d * 0.14} fill="#FFF3B0" />
      <Polygon points={`${cx - wTop * 1.45},${yTop - d * 0.2} ${cx + wTop * 1.45},${yTop - d * 0.2} ${cx},${yTop - d * 0.46}`} fill={wood.dark} />
      <Rect x={cx - wBot} y={yBot - 1} width={wBot * 2} height={d * 0.07} rx={d * 0.03} fill={wood.dark} />
    </G>
  );
}

const PIER = '#8B5E34';
const PIER_LIGHT = '#B2824F';
const LAMP = '#FFE08A';

const HarbourDecor = React.memo(function HarbourDecor({ size }: { size: number; d: number }) {
  const c = size / 2;
  const w = size * 0.07;
  const l = size * 0.075;
  const out: React.ReactNode[] = [];
  for (let s = 0; s < 4; s++) {
    const planks: React.ReactNode[] = [];
    for (let k = 1; k < 5; k++) {
      const y = (l * k) / 5;
      planks.push(<Line key={k} x1={c - w / 2} y1={y} x2={c + w / 2} y2={y} stroke={wood.dark} strokeOpacity={0.55} strokeWidth={1} />);
    }
    out.push(
      <G key={`side${s}`} rotation={s * 90} origin={`${c}, ${c}`}>
        <Rect x={c - w / 2} y={0} width={w} height={l} fill={PIER_LIGHT} stroke={PIER} strokeWidth={1.2} />
        {planks}
        <Circle cx={c - w / 2} cy={l} r={size * 0.009} fill={PIER} stroke={wood.dark} strokeWidth={0.8} />
        <Circle cx={c + w / 2} cy={l} r={size * 0.009} fill={PIER} stroke={wood.dark} strokeWidth={0.8} />
        <Circle cx={c + w / 2} cy={l - size * 0.02} r={size * 0.03} fill="url(#bdGlow)" />
        <Rect x={c + w / 2 - size * 0.007} y={l - size * 0.03} width={size * 0.014} height={size * 0.02} rx={size * 0.003} fill={LAMP} stroke={wood.dark} strokeWidth={0.8} />
        <Circle cx={size * 0.25} cy={size * 0.012} r={size * 0.02} fill="url(#bdGlow)" />
        <Circle cx={size * 0.25} cy={size * 0.012} r={size * 0.007} fill={LAMP} stroke={wood.dark} strokeWidth={0.6} />
        <Circle cx={size * 0.75} cy={size * 0.012} r={size * 0.02} fill="url(#bdGlow)" />
        <Circle cx={size * 0.75} cy={size * 0.012} r={size * 0.007} fill={LAMP} stroke={wood.dark} strokeWidth={0.6} />
      </G>,
    );
  }
  return <G>{out}</G>;
});

const COBBLE_TONES = ['#B79A66', '#A88A57', '#C2A573'];

const StaticBoard = React.memo(function StaticBoard({ geo }: { geo: Geo }) {
  const { size, d } = geo;
  const cw = d * 0.9;
  const rx = d * 0.14;
  const startAbs: Record<number, Color> = {};
  COLORS.forEach((c) => { startAbs[START_SQUARE[c]] = c; });

  const waves: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    const t = size * (i + 0.5) / 10;
    const w = size * 0.04;
    const e = size * 0.006;
    waves.push(
      <Path key={`wt${i}`} d={`M${t} ${e} q${w / 2} ${-e} ${w} 0`} stroke="#fff" strokeOpacity={0.4} strokeWidth={1.2} fill="none" />,
      <Path key={`wb${i}`} d={`M${t} ${size - e} q${w / 2} ${-e} ${w} 0`} stroke="#fff" strokeOpacity={0.4} strokeWidth={1.2} fill="none" />,
      <Path key={`wl${i}`} d={`M${e} ${t} q${-e} ${w / 2} 0 ${w}`} stroke="#fff" strokeOpacity={0.4} strokeWidth={1.2} fill="none" />,
      <Path key={`wr${i}`} d={`M${size - e} ${t} q${e} ${w / 2} 0 ${w}`} stroke="#fff" strokeOpacity={0.4} strokeWidth={1.2} fill="none" />,
    );
  }
  const posts: React.ReactNode[] = [];
  for (let i = 1; i < 8; i++) {
    const t = (size * i) / 8;
    const o = size * 0.014;
    const r = size * 0.0075;
    posts.push(
      <Circle key={`pt${i}`} cx={t} cy={o} r={r} fill="url(#bdStud)" stroke={wood.dark} strokeWidth={0.8} />,
      <Circle key={`pb${i}`} cx={t} cy={size - o} r={r} fill="url(#bdStud)" stroke={wood.dark} strokeWidth={0.8} />,
      <Circle key={`pl${i}`} cx={o} cy={t} r={r} fill="url(#bdStud)" stroke={wood.dark} strokeWidth={0.8} />,
      <Circle key={`pr${i}`} cx={size - o} cy={t} r={r} fill="url(#bdStud)" stroke={wood.dark} strokeWidth={0.8} />,
    );
  }
  const cobbles: React.ReactNode[] = [];
  for (let k = 0; k < 150; k++) {
    const a = Math.sin(k * 12.9898) * 43758.5453;
    const b = Math.sin(k * 78.233) * 12345.6789;
    const x = size * (0.04 + 0.92 * (a - Math.floor(a)));
    const y = size * (0.04 + 0.92 * (b - Math.floor(b)));
    cobbles.push(<Rect key={k} x={x - d * 0.24} y={y - d * 0.16} width={d * 0.48} height={d * 0.32} rx={d * 0.1} fill={COBBLE_TONES[k % 3]} fillOpacity={0.5} stroke={wood.dark} strokeOpacity={0.22} strokeWidth={0.7} />);
  }

  const u = cw;
  const sw = Math.max(1.2, u * 0.07);
  const plank = (p: Point, key: string, fill: string, stroke: string, lw = 1) => (
    <G key={key}>
      <Rect x={p.x - cw / 2 + 1.5} y={p.y - cw / 2 + cw * 0.14} width={cw} height={cw} rx={rx} fill="rgba(40,20,5,0.32)" />
      <Rect x={p.x - cw / 2} y={p.y - cw / 2 + cw * 0.09} width={cw} height={cw} rx={rx} fill="rgba(70,38,10,0.7)" />
      <Rect x={p.x - cw / 2} y={p.y - cw / 2} width={cw} height={cw} rx={rx} fill={fill} stroke={stroke} strokeWidth={lw} />
      <Line x1={p.x - cw / 2 + 1} y1={p.y - cw / 2 + rx} x2={p.x - cw / 2 + 1} y2={p.y + cw / 2 - rx} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
      <Line x1={p.x - cw / 2 + rx} y1={p.y + cw / 2 - 1} x2={p.x + cw / 2 - rx} y2={p.y + cw / 2 - 1} stroke="rgba(40,20,5,0.3)" strokeWidth={1} />
      <Line x1={p.x - cw / 2 + rx} y1={p.y - cw * 0.12} x2={p.x + cw / 2 - rx} y2={p.y - cw * 0.12} stroke={wood.dark} strokeOpacity={0.2} strokeWidth={0.8} />
      <Line x1={p.x - cw / 2 + rx} y1={p.y + cw * 0.2} x2={p.x + cw / 2 - rx} y2={p.y + cw * 0.2} stroke={wood.dark} strokeOpacity={0.15} strokeWidth={0.8} />
      <Line x1={p.x - cw / 2 + rx} y1={p.y - cw / 2 + 1} x2={p.x + cw / 2 - rx} y2={p.y - cw / 2 + 1} stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
    </G>
  );

  return (
    <G>
      <Rect x={0} y={0} width={size} height={size} rx={size * 0.03} fill="url(#bdSea)" />
      {waves}
      <Rect x={size * 0.014} y={size * 0.014} width={size * 0.972} height={size * 0.972} rx={size * 0.05} fill="none" stroke={wood.dark} strokeWidth={size * 0.02} />
      <Rect x={size * 0.014} y={size * 0.014} width={size * 0.972} height={size * 0.972} rx={size * 0.05} fill="none" stroke="url(#bdWood)" strokeWidth={size * 0.015} />
      {posts}
      <Rect x={size * 0.024} y={size * 0.024} width={size * 0.952} height={size * 0.952} rx={size * 0.04} fill="url(#bdSand)" stroke={wood.dark} strokeOpacity={0.8} strokeWidth={1.5} />
      {cobbles}

      {COLORS.map((c) => {
        const n = geo.nests[c];
        const rh = d * 0.75;
        const lines: React.ReactNode[] = [];
        for (let y = n.y + rh + d * 0.4; y < n.y + n.h - d * 0.3; y += d * 0.55) {
          lines.push(<Line key={y} x1={n.x + d * 0.3} y1={y} x2={n.x + n.w - d * 0.3} y2={y} stroke={wood.dark} strokeOpacity={0.22} strokeWidth={1} />);
        }
        return (
          <G key={`nest-${c}`}>
            <Rect x={n.x + 3} y={n.y + d * 0.5} width={n.w} height={n.h} rx={d * 0.4} fill="rgba(30,14,4,0.38)" />
            <Rect x={n.x} y={n.y + d * 0.26} width={n.w} height={n.h} rx={d * 0.4} fill={hues[c].shade} stroke={wood.dark} strokeWidth={1.5} />
            <Rect x={n.x} y={n.y} width={n.w} height={n.h} rx={d * 0.4} fill="url(#bdPlank)" stroke={hues[c].shade} strokeWidth={2.5} />
            <Rect x={n.x + 2} y={n.y + 2} width={n.w - 4} height={n.h - 4} rx={d * 0.35} fill="none" stroke={hues[c].base} strokeWidth={2} />
            {lines}
            <Rect x={n.x + d * 0.25} y={n.y + rh + d * 0.2} width={n.w - d * 0.5} height={n.h - rh - d * 0.45} rx={d * 0.3} fill="rgba(60,30,8,0.45)" />
            <Rect x={n.x + d * 0.25} y={n.y + rh + d * 0.1} width={n.w - d * 0.5} height={n.h - rh - d * 0.45} rx={d * 0.3} fill={hues[c].tint} fillOpacity={0.45} stroke={hues[c].shade} strokeWidth={1.2} />
            <Line x1={n.x + d * 0.55} y1={n.y + rh + d * 0.12} x2={n.x + n.w - d * 0.55} y2={n.y + rh + d * 0.12} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} strokeLinecap="round" />
            <Rect x={n.x + d * 0.6} y={n.y + rh + d * 0.3} width={n.w - d * 1.2} height={n.h - rh - d * 0.85} rx={d * 0.22} fill={hues[c].base} fillOpacity={0.25} stroke={hues[c].shade} strokeOpacity={0.6} strokeWidth={1} />
            <Polygon
              points={`${n.x - d * 0.2},${n.y + rh} ${n.x + d * 0.35},${n.y - d * 0.12} ${n.x + n.w - d * 0.35},${n.y - d * 0.12} ${n.x + n.w + d * 0.2},${n.y + rh}`}
              fill={`url(#bdC-${c})`}
              stroke={hues[c].shade}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <Line x1={n.x + d * 0.1} y1={n.y + rh * 0.38} x2={n.x + n.w - d * 0.1} y2={n.y + rh * 0.38} stroke={hues[c].shade} strokeOpacity={0.55} strokeWidth={1} />
            <Line x1={n.x + d * 0.0} y1={n.y + rh * 0.72} x2={n.x + n.w - d * 0.0} y2={n.y + rh * 0.72} stroke={hues[c].shade} strokeOpacity={0.55} strokeWidth={1} />
            <Line x1={n.x + d * 0.35} y1={n.y - d * 0.12} x2={n.x + n.w - d * 0.35} y2={n.y - d * 0.12} stroke={gold.tint} strokeWidth={2} />
            <Rect x={n.x + n.w * 0.78} y={n.y - d * 0.34} width={d * 0.22} height={d * 0.26} fill={PIER} stroke={hues[c].shade} strokeWidth={1} />
            <Rect x={n.x + n.w * 0.24} y={n.y + rh * 0.3} width={d * 0.3} height={d * 0.24} rx={d * 0.04} fill={LAMP} stroke={hues[c].shade} strokeWidth={1.2} />
            <Rect x={n.x + n.w * 0.72} y={n.y + rh * 0.3} width={d * 0.3} height={d * 0.24} rx={d * 0.04} fill={LAMP} stroke={hues[c].shade} strokeWidth={1.2} />
            <Line x1={n.x + n.w * 0.24 + d * 0.15} y1={n.y + rh * 0.3} x2={n.x + n.w * 0.24 + d * 0.15} y2={n.y + rh * 0.3 + d * 0.24} stroke={hues[c].shade} strokeWidth={0.8} />
            <Line x1={n.x + n.w * 0.72 + d * 0.15} y1={n.y + rh * 0.3} x2={n.x + n.w * 0.72 + d * 0.15} y2={n.y + rh * 0.3 + d * 0.24} stroke={hues[c].shade} strokeWidth={0.8} />
            {geo.homes[c].map((h, i) => (
              <G key={i}>
                <Circle cx={h.x} cy={h.y + 1.8} r={d * 0.52} fill="rgba(255,255,255,0.5)" />
                <Circle cx={h.x} cy={h.y} r={d * 0.5} fill={hues[c].shade} />
                <Circle cx={h.x} cy={h.y + 1} r={d * 0.4} fill="url(#bdPit)" stroke="rgba(0,0,0,0.5)" strokeWidth={1.2} />
                <Path d={`M${h.x - d * 0.32} ${h.y + d * 0.1} A${d * 0.34} ${d * 0.34} 0 0 0 ${h.x + d * 0.3} ${h.y + d * 0.2}`} fill="none" stroke={hues[c].tint} strokeOpacity={0.7} strokeWidth={1.2} strokeLinecap="round" />
              </G>
            ))}
          </G>
        );
      })}

      {geo.circ.map((p, i) => {
        const abs = i + 1;
        const sc = startAbs[abs];
        if (sc) {
          return (
            <G key={`s${abs}`}>
              {plank(p, `c${abs}`, `url(#bdC-${sc})`, hues[sc].shade, 1.5)}
              <Circle cx={p.x} cy={p.y - u * 0.26} r={u * 0.07} fill="none" stroke={parchment.cell} strokeWidth={sw} />
              <Line x1={p.x} y1={p.y - u * 0.19} x2={p.x} y2={p.y + u * 0.26} stroke={parchment.cell} strokeWidth={sw} strokeLinecap="round" />
              <Line x1={p.x - u * 0.14} y1={p.y - u * 0.08} x2={p.x + u * 0.14} y2={p.y - u * 0.08} stroke={parchment.cell} strokeWidth={sw} strokeLinecap="round" />
              <Path d={`M${p.x - u * 0.22} ${p.y + u * 0.08} Q${p.x - u * 0.2} ${p.y + u * 0.28} ${p.x} ${p.y + u * 0.28} Q${p.x + u * 0.2} ${p.y + u * 0.28} ${p.x + u * 0.22} ${p.y + u * 0.08}`} fill="none" stroke={parchment.cell} strokeWidth={sw} strokeLinecap="round" />
            </G>
          );
        }
        if (SAFE_SQUARES.includes(abs)) {
          return (
            <G key={`s${abs}`}>
              {plank(p, `c${abs}`, 'url(#bdPlank)', gold.shade, 1.2)}
              <Circle cx={p.x} cy={p.y} r={u * 0.52} fill="url(#bdGlow)" />
              <Rect x={p.x - u * 0.13} y={p.y - u * 0.12} width={u * 0.26} height={u * 0.3} rx={u * 0.05} fill="url(#bdSafe)" stroke={wood.dark} strokeWidth={1} />
              <Polygon points={`${p.x - u * 0.18},${p.y - u * 0.12} ${p.x + u * 0.18},${p.y - u * 0.12} ${p.x},${p.y - u * 0.3}`} fill={wood.dark} />
              <Circle cx={p.x} cy={p.y + u * 0.04} r={u * 0.06} fill="#FFF3B0" />
            </G>
          );
        }
        return plank(p, `c${abs}`, 'url(#bdPlank)', wood.dark, 0.8);
      })}

      {COLORS.map((c) =>
        geo.lanes[c].map((p, i) => plank(p, `l-${c}-${i}`, `url(#bdC-${c})`, hues[c].shade, 1)),
      )}

      <G>
        <Rect x={geo.goal.cx - geo.goal.half - 2} y={geo.goal.cy - geo.goal.half - 2} width={geo.goal.half * 2 + 4} height={geo.goal.half * 2 + 4} rx={d * 0.25} fill={wood.dark} fillOpacity={0.6} />
        {COLORS.map((c) => (
          <Polygon key={`t-${c}`} points={geo.tris[c].map((p) => `${p.x},${p.y}`).join(' ')} fill={`url(#bdC-${c})`} stroke={gold.shade} strokeWidth={1} strokeLinejoin="round" />
        ))}
        <Lighthouse cx={geo.goal.cx} cy={geo.goal.cy} d={d} />
        <HarbourDecor size={size} d={d} />
      </G>
    </G>
  );
});

interface Item { key: string; color: Color; index: number; prog: number; x: number; y: number; lift: number; anim: boolean; face: number; sx: number; sy: number; rot: number }

export default function Board({ state, myColor, legal, fixedView, onPiece, size }: BoardProps): JSX.Element {
  const S = Math.max(120, Math.round(size));

  const quarter = useMemo(() => {
    if (fixedView || !myColor) return 0;
    const hs = homeCoords(myColor);
    let best = 0;
    let bestD = Infinity;
    for (let q = 0; q < 4; q++) {
      const map = makeMapper(1, q);
      const pts = hs.map(map);
      const ax = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const ay = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const dist = Math.hypot(ax, ay - 1);
      if (dist < bestD - 1e-6) { bestD = dist; best = q; }
    }
    return best;
  }, [myColor, fixedView]);

  const geo = useMemo(() => buildGeo(S, quarter), [S, quarter]);

  const [over, setOver] = useState<Record<string, Over>>({});
  const [fx, setFx] = useState<BurstView[]>([]);
  const overRef = useRef<Record<string, Over>>({});
  const animsRef = useRef<Anim[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const rafRef = useRef<number | null>(null);
  const geoRef = useRef<Geo | null>(null);
  const prevRef = useRef<{ room: string; pieces: Record<Color, number[]> } | null>(null);
  const reduceRef = useRef(false);
  const burstId = useRef(1);
  const lockRef = useRef(0);
  const press = useCallback((idx: number) => {
    if (Date.now() < lockRef.current) return;
    onPiece(idx);
  }, [onPiece]);

  // Speech bubbles (one per piece at most) and the capture clip.
  const [talks, setTalks] = useState<Record<string, Talk>>({});
  const talkId = useRef(1);
  const talkTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const say = useCallback((key: string, color: Color, line: VoiceLine, loud: boolean, delay = 0) => {
    const show = () => {
      const id = talkId.current++;
      setTalks((t) => ({ ...t, [key]: { id, key, color, text: line.text, loud } }));
      speakLine(line, loud);
      if (talkTimers.current[key]) clearTimeout(talkTimers.current[key]);
      talkTimers.current[key] = setTimeout(() => {
        setTalks((t) => {
          if (t[key]?.id !== id) return t;
          const n = { ...t };
          delete n[key];
          return n;
        });
      }, loud ? 2600 : 2300);
    };
    if (delay > 0) setTimeout(show, delay);
    else show();
  }, []);
  const react = useCallback((key: string, color: Color, kind: TalkKind, delay = 0) => {
    say(key, color, lineFor(kind, color), kind !== 'chatter', delay);
  }, [say]);
  useEffect(() => () => {
    Object.values(talkTimers.current).forEach(clearTimeout);
  }, []);
  const [clip, setClip] = useState<{ id: number; attacker: Color; victim: Color } | null>(null);
  const clipId = useRef(1);

  // Spontaneous chatter: now and then a character on the board says something piratey.
  const piecesRef = useRef(state.pieces);
  piecesRef.current = state.pieces;
  const playing = state.phase === 'rolling' || state.phase === 'moving';
  useEffect(() => {
    if (!playing) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = (first: boolean) => {
      timer = setTimeout(() => {
        if (!alive) return;
        const out: { key: string; color: Color }[] = [];
        const home: { key: string; color: Color }[] = [];
        COLORS.forEach((c) => piecesRef.current[c].forEach((prog, i) => {
          if (prog === GOAL) return;
          (prog > 0 ? out : home).push({ key: `${c}-${i}`, color: c });
        }));
        const pool = out.length > 0 && Math.random() < 0.8 ? out : home;
        if (pool.length > 0) {
          const who = pool[Math.floor(Math.random() * pool.length)];
          react(who.key, who.color, 'chatter');
        }
        loop(false);
      }, first ? 2500 + Math.random() * 2500 : 5500 + Math.random() * 6500);
    };
    loop(true);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [playing, react]);

  // The piece of a colour that speaks for it: the furthest along, else one in the nest.
  const voiceOf = useCallback((c: Color): string => {
    const ps = piecesRef.current[c];
    let best = -1;
    ps.forEach((prog, i) => {
      if (prog < GOAL && (best < 0 || prog > ps[best])) best = i;
    });
    return `${c}-${Math.max(0, best)}`;
  }, []);

  // A player's emote is said by their character on the board.
  const seenEmote = useRef(-1);
  useEffect(() => {
    const top = state.emotes.reduce((m, e) => (e.id > m ? e.id : m), 0);
    if (seenEmote.current === -1) { seenEmote.current = top; return; }
    state.emotes
      .filter((e) => e.id > seenEmote.current)
      .forEach((e) => say(voiceOf(e.color), e.color, emoteLine(e.emote, e.color), true));
    seenEmote.current = top;
  }, [state.emotes, say, voiceOf]);

  // Sometimes a character cheers when its turn comes round.
  const prevTurn = useRef(state.turn);
  useEffect(() => {
    if (prevTurn.current === state.turn) return;
    prevTurn.current = state.turn;
    if (state.phase === 'rolling' && Math.random() < 0.35) react(voiceOf(state.turn), state.turn, 'turn', 300);
  }, [state.turn, state.phase, react, voiceOf]);

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) { reduceRef.current = v; setReduce(v); }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const run = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const now = Date.now();
    const next: Record<string, Over> = {};
    animsRef.current = animsRef.current.filter((a) => {
      const hold = a.hold ?? 0;
      let t = now - a.start;
      const segs = a.pts.length - 1;
      const dd = geoRef.current ? geoRef.current.d : 20;
      if (a.brawl) {
        if (t < 0) return true;
        if (t >= a.seg) return false;
        next[a.key] = brawlPose(t, a.seg, a.pts[0], a.side ?? 1, dd);
        return true;
      }
      if (t >= hold + segs * a.seg) return false;
      if (t <= 0) { next[a.key] = { x: a.pts[0].x, y: a.pts[0].y, lift: 0, face: 1, sx: 1, sy: 1, rot: 0 }; return true; }
      if (t < hold) { next[a.key] = brawlPose(t, hold, a.pts[0], a.side ?? -1, dd); return true; }
      t -= hold;
      const i = Math.min(segs - 1, Math.floor(t / a.seg));
      const f = (t - i * a.seg) / a.seg;
      const e = segs === 1 ? (a.arc ? 1 - (1 - f) * (1 - f) : f * f * (3 - 2 * f)) : f;
      const p0 = a.pts[i];
      const p1 = a.pts[i + 1];
      const dx = p1.x - p0.x;
      if (Math.abs(dx) > 0.5) a.face = dx < 0 ? -1 : 1;
      if (a.lastI !== i) {
        if (a.lastI !== undefined && !a.arc) {
          burstsRef.current.push({ id: burstId.current++, x: p0.x, y: p0.y, color: a.key.split('-')[0] as Color, start: now, dust: true });
          sfx('step');
        }
        a.lastI = i;
      }
      const bounce = Math.sin(Math.PI * f);
      const sy = a.arc ? 1 + 0.2 * bounce : 1 - 0.14 * Math.cos(2 * Math.PI * f);
      const rot = a.arc ? f * 540 : (i % 2 ? 1 : -1) * bounce * 9;
      next[a.key] = {
        x: p0.x + dx * e,
        y: p0.y + (p1.y - p0.y) * e,
        lift: bounce * a.lift,
        face: a.face ?? 1,
        sx: 1 / sy,
        sy,
        rot,
      };
      return true;
    });
    const views: BurstView[] = [];
    burstsRef.current = burstsRef.current.filter((b) => {
      const t = (now - b.start) / (b.fight ? FIGHT_MS : b.goal ? 1200 : 480);
      if (t >= 1) return false;
      if (t >= 0) views.push({ id: b.id, x: b.x, y: b.y, color: b.color, t, dust: b.dust, fight: b.fight, goal: b.goal });
      return true;
    });
    overRef.current = next;
    setOver(next);
    setFx(views);
    if (animsRef.current.length || burstsRef.current.length) rafRef.current = requestAnimationFrame(run);
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  useLayoutEffect(() => {
    const prev = prevRef.current;
    const geoChanged = geoRef.current !== geo;
    geoRef.current = geo;
    const cur = state.pieces;
    prevRef.current = {
      room: state.roomCode,
      pieces: { red: [...cur.red], yellow: [...cur.yellow], green: [...cur.green], blue: [...cur.blue] },
    };
    const snap = () => {
      animsRef.current = [];
      burstsRef.current = [];
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (Object.keys(overRef.current).length) { overRef.current = {}; setOver({}); }
      setFx((f) => (f.length ? [] : f));
    };
    if (geoChanged || !prev || prev.room !== state.roomCode || state.phase === 'lobby' || reduceRef.current) { snap(); return; }

    const dec: { c: Color; i: number; o: number; p: number }[] = [];
    const inc: { c: Color; i: number; o: number; p: number }[] = [];
    COLORS.forEach((c) => cur[c].forEach((p, i) => {
      const o = prev.pieces[c][i];
      if (o === undefined || o === p) return;
      (p < o ? dec : inc).push({ c, i, o, p });
    }));
    if (dec.length === 0 && inc.length === 0) return;
    if (dec.length > 1 || dec.some((x) => x.p !== 0)) { snap(); return; }

    const now = Date.now();
    let maxDur = 0;
    const ends: { c: Color; i: number; p: number }[] = [];
    inc.forEach(({ c, i, o, p }) => {
      const key = `${c}-${i}`;
      const live = overRef.current[key];
      const from: Point = live ? { x: live.x, y: live.y } : geo.pt(c, o, i);
      const pts: Point[] = [from];
      if (o === 0) pts.push(geo.pt(c, p, i));
      else for (let k = o + 1; k <= p; k++) pts.push(geo.pt(c, k, i));
      const steps = pts.length - 1;
      if (steps < 1) return;
      const seg = o === 0 ? 300 : Math.max(50, Math.min(150, 1400 / steps));
      animsRef.current = animsRef.current.filter((a) => a.key !== key);
      animsRef.current.push({ key, pts, seg, start: now, lift: o === 0 ? geo.d * 0.6 : geo.d * 0.3, arc: false });
      maxDur = Math.max(maxDur, steps * seg);
      ends.push({ c, i, p });
      if (o === 0) {
        sfx('jump');
        react(key, c, 'exit', 120);
      } else if (p === GOAL) {
        react(key, c, 'goal', steps * seg);
        burstsRef.current.push({ id: burstId.current++, x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, color: c, start: now + steps * seg, goal: true });
      }
    });
    dec.forEach(({ c, i, o }) => {
      const key = `${c}-${i}`;
      const live = overRef.current[key];
      const from: Point = live ? { x: live.x, y: live.y } : geo.pt(c, o, i);
      const to = geo.pt(c, 0, i);
      animsRef.current = animsRef.current.filter((a) => a.key !== key);
      const att = ends.find((e) => {
        if (e.c === c) return false;
        const q = geo.pt(e.c, e.p, e.i);
        return Math.hypot(q.x - from.x, q.y - from.y) < geo.d * 0.6;
      });
      const fightMs = att ? FIGHT_MS : 0;
      const side = -1;
      const startPt: Point = att ? { x: from.x + side * geo.d * 0.0, y: from.y } : from;
      animsRef.current.push({ key, pts: [startPt, to], seg: 650, start: now + maxDur, lift: geo.size * 0.2, arc: true, hold: fightMs, side });
      if (att) {
        const at = geo.pt(att.c, att.p, att.i);
        const akey = `${att.c}-${att.i}`;
        animsRef.current = animsRef.current.filter((a) => !(a.key === akey && a.brawl));
        animsRef.current.push({ key: akey, pts: [at, at], seg: FIGHT_MS, start: now + maxDur, lift: 0, arc: false, brawl: true, side: 1 });
        burstsRef.current.push({ id: burstId.current++, x: from.x, y: from.y, color: c, start: now + maxDur, fight: true });
        [0.083, 0.417, 0.75].forEach((f) => setTimeout(() => sfx('hit'), maxDur + f * FIGHT_MS));
        lockRef.current = Date.now() + maxDur + FIGHT_MS + CLIP_MS + 300;
        react(akey, att.c, 'brag', maxDur + 80);
        react(key, c, 'ouch', maxDur + 420);
        // the mini clip plays once the scuffle on the square is over
        const attacker = att.c;
        setTimeout(() => setClip({ id: clipId.current++, attacker, victim: c }), maxDur + FIGHT_MS);
      }
      burstsRef.current.push({ id: burstId.current++, x: from.x, y: from.y, color: c, start: now + maxDur + fightMs });
      setTimeout(() => sfx('hit'), maxDur + fightMs);
    });
    run();
  }, [state.pieces, state.roomCode, state.phase, geo, run, react]);

  // Turn glow ring.
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    if (reduce) { pulse.value = 0.85; return; }
    pulse.value = withRepeat(withTiming(1, { duration: loops.glow, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, pulse]);
  const glowProps = useAnimatedProps(() => ({ strokeOpacity: pulse.value }));

  const myTurn = !!myColor && state.turn === myColor && state.phase === 'moving';
  const movableSet = useMemo(() => new Set(myTurn ? legal.map((m) => m.pieceIndex) : []), [myTurn, legal]);

  const items: Item[] = [];
  COLORS.forEach((color) => state.pieces[color].forEach((prog, index) => {
    const key = `${color}-${index}`;
    const o = over[key];
    const base = geo.pt(color, prog, index);
    items.push({
      key, color, index, prog,
      x: o ? o.x : base.x, y: o ? o.y : base.y, lift: o ? o.lift : 0, anim: !!o,
      face: o ? o.face : 1, sx: o ? o.sx : 1, sy: o ? o.sy : 1, rot: o ? o.rot : 0,
    });
  }));

  // Group pieces sharing a square (barriers, shared safe squares) and fan them out.
  const groups: Record<string, Item[]> = {};
  items.forEach((it) => {
    if (it.anim || it.prog === 0) return;
    const gk = `${Math.round(it.x)},${Math.round(it.y)}`;
    (groups[gk] = groups[gk] || []).push(it);
  });
  const offsets: Record<string, Point> = {};
  const stackedKeys = new Set<string>();
  Object.values(groups).forEach((g) => {
    if (g.length < 2) return;
    g.forEach((it, k) => {
      const m = k - (g.length - 1) / 2;
      offsets[it.key] = { x: m * geo.d * 0.3, y: m * geo.d * 0.08 };
      stackedKeys.add(it.key);
    });
  });

  const sorted = [...items].sort((a, b) => {
    if (a.anim !== b.anim) return a.anim ? 1 : -1;
    return a.y - b.y;
  });

  const last = state.lastMoved;
  const lastItem = last ? items.find((it) => it.color === last.color && it.index === last.index) : undefined;
  const showTurn = state.phase === 'rolling' || state.phase === 'moving';
  const tn = geo.nests[state.turn];
  const pawnSize = geo.d * 1.2;
  const pawnBox = pawnSize * 2;
  const hasLegal = myTurn && legal.length > 0;
  const fightFx = fx.find((b) => b.fight);
  const shk = fightFx
    ? Math.sin((fightFx.t * FIGHT_MS) / 18) * S * 0.006 * Math.max(0, Math.sin(fightFx.t * Math.PI * 6))
    : 0;

  const placed = sorted.map((it) => {
    const off = offsets[it.key];
    const gx = it.x + (off ? off.x : 0);
    const gy = it.y + (off ? off.y : 0);
    const movable = myTurn && it.color === myColor && movableSet.has(it.index);
    const dimmed = hasLegal && it.color === myColor && !movable;
    return { it, gx, gy, movable, dimmed };
  });

  return (
    <View
      style={{ width: S, height: S, borderRadius: S * 0.03, ...elevation, transform: [{ translateX: shk }, { translateY: shk * 0.6 }] }}
      accessibilityLabel={`Tablero de Parchís pirata. Turno de ${state.turn === 'red' ? 'Luffy' : state.turn === 'yellow' ? 'Sanji' : state.turn === 'green' ? 'Zoro' : 'Jinbe'}`}
    >
      <Svg width={S} height={S}>
        <DefsLayer />
        <StaticBoard geo={geo} />

        {showTurn && tn ? (
          <AnimatedRect
            x={tn.x - 2}
            y={tn.y - 2}
            width={tn.w + 4}
            height={tn.h + 4}
            rx={geo.d * 0.5}
            fill="none"
            stroke={gold.tint}
            strokeWidth={4}
            animatedProps={glowProps}
          />
        ) : null}

        {myTurn && myColor
          ? legal.map((m) => {
              const p = geo.pt(myColor, Math.min(m.to, GOAL), m.pieceIndex);
              return (
                <Circle key={`tg-${m.pieceIndex}-${m.use}`} cx={p.x} cy={p.y} r={geo.d * 0.5} fill={gold.base} fillOpacity={0.25} stroke={gold.tint} strokeWidth={2.5} />
              );
            })
          : null}

        {lastItem && !lastItem.anim && lastItem.prog > 0 ? (
          <Circle cx={lastItem.x} cy={lastItem.y} r={geo.d * 0.62} fill="none" stroke={gold.tint} strokeOpacity={0.75} strokeWidth={2} />
        ) : null}

        {placed.map(({ it, gx, gy }) => {
          return (
            <G key={it.key}>
              {it.lift > 0.5 ? (
                <Ellipse cx={gx} cy={gy + geo.d * 0.25} rx={geo.d * 0.4 * (1 - Math.min(0.5, it.lift / (geo.size * 0.4)))} ry={geo.d * 0.14} fill="rgba(5,12,22,0.4)" />
              ) : null}

            </G>
          );
        })}

        {fx.map((b) =>
          b.fight ? (
            <FightFx key={b.id} x={b.x} y={b.y} t={b.t} d={geo.d} color={b.color} />
          ) : b.goal ? (
            <G key={b.id}>
              {Array.from({ length: 16 }, (_, k) => {
                const ang = (k / 16) * Math.PI * 2;
                const r = geo.d * (0.4 + 2.2 * (1 - (1 - b.t) * (1 - b.t)));
                const fall = b.t * b.t * geo.d * 1.4;
                const col = k % 3 === 0 ? gold.tint : k % 3 === 1 ? hues[b.color].tint : '#FFFFFF';
                return (
                  <Rect
                    key={k}
                    x={b.x + Math.cos(ang) * r - geo.d * 0.09}
                    y={b.y + Math.sin(ang) * r * 0.8 + fall - geo.d * 0.06}
                    width={geo.d * 0.18}
                    height={geo.d * 0.12}
                    rx={geo.d * 0.03}
                    fill={col}
                    fillOpacity={1 - b.t}
                    transform={`rotate(${(k * 47 + b.t * 720) % 360} ${b.x + Math.cos(ang) * r} ${b.y + Math.sin(ang) * r * 0.8 + fall})`}
                  />
                );
              })}
              <Circle cx={b.x} cy={b.y} r={geo.d * (0.5 + b.t * 2.4)} fill="none" stroke={gold.tint} strokeOpacity={1 - b.t} strokeWidth={4 * (1 - b.t) + 0.5} />
            </G>
          ) : b.dust ? (
            <G key={b.id}>
              {[-1, 0, 1].map((k) => (
                <Circle
                  key={k}
                  cx={b.x + k * geo.d * (0.15 + 0.3 * b.t)}
                  cy={b.y + geo.d * 0.25 - b.t * geo.d * 0.3 - (k === 0 ? 0 : geo.d * 0.04)}
                  r={geo.d * (0.08 + 0.14 * b.t)}
                  fill="#E9D9B0"
                  fillOpacity={0.75 * (1 - b.t)}
                />
              ))}
            </G>
          ) : (
            <Circle
              key={b.id}
              cx={b.x}
              cy={b.y}
              r={geo.d * (0.4 + b.t * 1.8)}
              fill="none"
              stroke={hues[b.color].tint}
              strokeOpacity={1 - b.t}
              strokeWidth={3 * (1 - b.t) + 0.5}
            />
          ),
        )}
      </Svg>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {placed.map(({ it, gx, gy, movable, dimmed }) => (
          // Sized to the pawn's own box (never 0×0): iOS and Android only deliver a touch inside
          // the parent's bounds, so a pawn in a zero-size wrapper could not be tapped on a phone.
          <View
            key={it.key}
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: gx - pawnBox / 2,
              top: gy - it.lift - pawnBox * 0.62,
              width: pawnBox,
              height: pawnBox,
              overflow: 'visible',
              transformOrigin: `${pawnBox / 2}px ${pawnBox * 0.62}px`,
              transform: [
                { rotate: `${it.rot}deg` },
                { scaleX: it.face * it.sx },
                { scaleY: it.sy },
              ],
            }}
          >
            <Pawn
              color={it.color}
              x={pawnBox / 2}
              y={pawnBox * 0.62}
              size={pawnSize}
              movable={movable}
              dimmed={dimmed}
              stacked={stackedKeys.has(it.key)}
              onPress={movable ? () => press(it.index) : undefined}
              excited={showTurn && state.turn === it.color && !it.anim}
              still={it.anim}
            />
          </View>
        ))}
        {placed.map(({ it, gx, gy }) => {
          const t = talks[it.key];
          if (!t) return null;
          return <TalkBubble key={`talk-${it.key}`} talk={t} x={gx} y={gy - it.lift - pawnSize * 1.55} board={S} />;
        })}
      </View>
      {clip ? (
        <CaptureClip
          key={clip.id}
          attacker={clip.attacker}
          victim={clip.victim}
          size={S}
          onHit={() => sfx('hit')}
          onDone={() => {
            setClip((c) => (c && c.id === clip.id ? null : c));
            lockRef.current = Math.min(lockRef.current, Date.now() + 150);
          }}
        />
      ) : null}
    </View>
  );
}
