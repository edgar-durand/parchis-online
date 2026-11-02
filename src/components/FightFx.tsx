import React from 'react';
import { Circle, Ellipse, G, Line, Polygon } from 'react-native-svg';
import type { Color } from '../types';

type FightFxProps = {
  x: number;
  y: number;
  d: number;
  t: number;
  attacker: Color;
  victim: Color;
};

const PALETTE: Record<string, string> = {
  red: '#e0483e',
  blue: '#3b82d6',
  green: '#3aa655',
  yellow: '#f2b705',
};
const FALLBACK = '#f2b705';
const CLOUD_FILL = '#f4efe6';
const CLOUD_SHADE = '#cfc4b0';
const CLOUD_LINE = '#9d917d';
const FLASH = '#fff8dc';

const HITS: ReadonlyArray<{ at: number; side: number; lift: number; big: boolean }> = [
  { at: 0.2, side: -1, lift: -0.12, big: false },
  { at: 0.38, side: 1, lift: 0.1, big: false },
  { at: 0.55, side: -1, lift: 0.14, big: false },
  { at: 0.72, side: 0, lift: 0, big: true },
];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeOut(v: number): number {
  const k = 1 - clamp01(v);
  return 1 - k * k * k;
}

function smooth(a: number, b: number, v: number): number {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
}

function starPoints(cx: number, cy: number, outer: number, inner: number, n: number, rot: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / n;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(' ');
}

export default function FightFx({ x, y, d, t, attacker, victim }: FightFxProps): JSX.Element {
  const p = clamp01(t);
  const aCol = PALETTE[attacker] ?? FALLBACK;
  const vCol = PALETTE[victim] ?? FALLBACK;

  const env = smooth(0.06, 0.2, p) * (1 - smooth(0.84, 1, p));
  const shakeAmp = d * 0.035 * env;
  const dx = Math.sin(p * 140) * shakeAmp;
  const dy = Math.cos(p * 118) * shakeAmp * 0.7;

  // Face-off ring: two arcs of colour closing on the square.
  const faceT = clamp01(p / 0.22);
  const faceOp = (1 - smooth(0.16, 0.26, p)) * 0.95;
  const faceGap = d * (0.62 - 0.4 * easeOut(faceT));

  // Cloud puffs.
  const puffs: JSX.Element[] = [];
  const PUFFS = 9;
  for (let i = 0; i < PUFFS; i += 1) {
    const ang = (i * Math.PI * 2) / PUFFS + p * 3.2;
    const dist = d * (0.3 + 0.07 * Math.sin(p * 31 + i * 1.7));
    const r = d * (0.21 + 0.045 * Math.cos(p * 27 + i * 1.1));
    const cx = Math.cos(ang) * dist;
    const cy = Math.sin(ang) * dist * 0.85;
    puffs.push(
      <G key={`puff-${i}`}>
        <Circle cx={cx} cy={cy + r * 0.12} r={r} fill={CLOUD_SHADE} opacity={0.85 * env} />
        <Circle cx={cx} cy={cy} r={r} fill={CLOUD_FILL} stroke={CLOUD_LINE} strokeWidth={d * 0.025} opacity={0.94 * env} />
        <Circle cx={cx - r * 0.3} cy={cy - r * 0.32} r={r * 0.3} fill="#ffffff" opacity={0.7 * env} />
      </G>,
    );
  }

  // Radial sparks.
  const sparks: JSX.Element[] = [];
  const SPARKS = 12;
  const sparkEnv = smooth(0.14, 0.3, p) * (1 - smooth(0.7, 0.95, p));
  for (let i = 0; i < SPARKS; i += 1) {
    const ang = (i * Math.PI * 2) / SPARKS + 0.3 + Math.sin(i * 2.3) * 0.15;
    const near = d * (0.42 + 0.05 * Math.sin(p * 40 + i));
    const far = near + d * (0.16 + 0.14 * ((i * 37) % 5) / 5) * (0.5 + 0.5 * easeOut(p * 1.4));
    sparks.push(
      <Line
        key={`spark-${i}`}
        x1={Math.cos(ang) * near}
        y1={Math.sin(ang) * near}
        x2={Math.cos(ang) * far}
        y2={Math.sin(ang) * far}
        stroke={i % 2 === 0 ? aCol : vCol}
        strokeWidth={d * 0.045}
        strokeLinecap="round"
        opacity={sparkEnv}
      />,
    );
  }

  // Impact stars, one per blow, the last one big.
  const stars: JSX.Element[] = [];
  HITS.forEach((h, i) => {
    const local = (p - h.at) / (h.big ? 0.2 : 0.14);
    if (local < 0 || local > 1) return;
    const pop = easeOut(local * 2.2);
    const size = d * (h.big ? 0.72 : 0.38) * (0.45 + 0.55 * pop) * (1 + 0.12 * Math.sin(local * 9));
    const cx = h.side * d * 0.2;
    const cy = h.lift * d;
    const op = 1 - smooth(0.5, 1, local);
    const col = h.big ? FLASH : h.side < 0 ? aCol : vCol;
    stars.push(
      <G key={`hit-${i}`} opacity={op}>
        <Polygon
          points={starPoints(cx, cy, size, size * 0.46, h.big ? 10 : 7, i * 0.6)}
          fill={col}
          stroke={h.big ? aCol : '#ffffff'}
          strokeWidth={d * 0.04}
          strokeLinejoin="round"
        />
        <Polygon
          points={starPoints(cx, cy, size * 0.55, size * 0.26, h.big ? 10 : 7, i * 0.6 + 0.2)}
          fill="#ffffff"
          opacity={0.9}
        />
      </G>,
    );
  });

  // Final shockwave ring as the defeated piece is launched.
  const waveLocal = (p - 0.72) / 0.28;
  const wave =
    waveLocal > 0 && waveLocal < 1 ? (
      <Ellipse
        cx={0}
        cy={0}
        rx={d * (0.3 + 0.9 * easeOut(waveLocal))}
        ry={d * (0.22 + 0.62 * easeOut(waveLocal))}
        fill="none"
        stroke={FLASH}
        strokeWidth={d * 0.06 * (1 - waveLocal)}
        opacity={0.85 * (1 - waveLocal)}
      />
    ) : null;

  return (
    <G x={x + dx} y={y + dy} pointerEvents="none">
      {/* contact shadow */}
      <Ellipse cx={0} cy={d * 0.34} rx={d * 0.55} ry={d * 0.16} fill="#000000" opacity={0.22 * env} />

      {/* face-off */}
      <G opacity={faceOp}>
        <Circle cx={-faceGap} cy={0} r={d * 0.17} fill={aCol} stroke="#ffffff" strokeWidth={d * 0.035} />
        <Circle cx={faceGap} cy={0} r={d * 0.17} fill={vCol} stroke="#ffffff" strokeWidth={d * 0.035} />
        <Line
          x1={-faceGap}
          y1={0}
          x2={faceGap}
          y2={0}
          stroke={FLASH}
          strokeWidth={d * 0.03}
          strokeDasharray={`${d * 0.06} ${d * 0.06}`}
        />
      </G>

      {sparks}
      {puffs}
      {wave}
      {stars}
    </G>
  );
}
