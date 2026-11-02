import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { ART_BASE } from '../art-sprites';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Ellipse,
  Rect,
  G,
  ClipPath,
  Line,
} from 'react-native-svg';
import type { Color, EmblemProps, Emblem } from '../types';
import { CHARACTERS } from '../types';
import { hues, parchment, gold, ink } from '../art';

const STROKE = parchment.ink;
const SW = ink.stroke;
const SHADOW = '#0B1A2A';
const WHITE = '#FFFFFF';

const LINE = { stroke: STROKE, strokeWidth: SW, strokeLinejoin: ink.join, strokeLinecap: ink.cap } as const;

// ---------------------------------------------------------------------------
// Emblems (drawn in a 100x100 box, ink outline, parchment / gold fills)
// ---------------------------------------------------------------------------
function Mark({ kind, color }: { kind: Emblem; color: Color }) {
  const h = hues[color];
  const common = { stroke: STROKE, strokeWidth: 3, strokeLinejoin: ink.join, strokeLinecap: ink.cap } as const;
  switch (kind) {
    case 'hat':
      return (
        <G>
          <Ellipse cx={50} cy={62} rx={43} ry={12} fill={gold.base} {...common} />
          <Path d="M25 62 C21 30 38 20 50 20 C62 20 79 30 75 62 Z" fill={gold.tint} {...common} />
          <Path d="M24 52 C40 60 60 60 76 52 L75.5 62 C60 70 40 70 24.5 62 Z" fill={h.base} {...common} />
          <Path d="M36 34 C40 28 46 26 50 26" stroke={gold.base} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'swords':
      return (
        <G>
          {[-38, 38, 0].map((a) => (
            <G key={a} transform={`rotate(${a} 50 62)`}>
              <Path d="M50 6 L55 15 L55 62 L45 62 L45 15 Z" fill={parchment.base} {...common} />
              <Line x1={50} y1={14} x2={50} y2={58} stroke={parchment.edge} strokeWidth={2} strokeLinecap="round" />
              <Rect x={37} y={62} width={26} height={6} rx={3} fill={gold.base} {...common} />
              <Rect x={46.5} y={68} width={7} height={17} rx={2} fill={STROKE} />
              <Circle cx={50} cy={88} r={4} fill={gold.base} {...common} />
            </G>
          ))}
        </G>
      );
    case 'boot':
      return (
        <G>
          <Path
            d="M36 84 C18 78 20 60 30 48 C30 58 36 60 36 50 C41 60 44 74 38 84 Z"
            fill={gold.base}
            {...common}
          />
          <Path
            d="M28 80 C24 70 28 64 29 58 C33 64 35 70 32 80 Z"
            fill={h.base}
            stroke="none"
          />
          <Path
            d="M40 12 H62 V50 C62 56 74 58 82 66 C88 71 87 79 80 81 H40 Z"
            fill={parchment.base}
            {...common}
          />
          <Rect x={38} y={80} width={50} height={8} rx={4} fill={gold.shade} {...common} />
          <Path d="M40 20 H62" stroke={gold.base} strokeWidth={5} strokeLinecap="round" />
        </G>
      );
    case 'wave':
    default:
      return (
        <G>
          <Path
            d="M8 82 C8 54 28 28 56 26 C72 25 84 33 86 46 C77 39 64 42 62 52 C60 62 72 64 78 72 C80 77 77 82 72 82 Z"
            fill={parchment.base}
            {...common}
          />
          <Path d="M18 72 C32 62 46 70 60 66" stroke={h.base} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M22 62 C34 54 44 58 52 54" stroke={h.base} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={78} cy={30} r={3.5} fill={parchment.base} {...common} strokeWidth={2} />
          <Circle cx={88} cy={38} r={2.5} fill={parchment.base} {...common} strokeWidth={2} />
          <Circle cx={68} cy={22} r={2.5} fill={parchment.base} {...common} strokeWidth={2} />
          <Path d="M6 88 C20 82 30 94 44 88 C58 82 68 94 82 88 C88 86 92 88 94 90" stroke={parchment.base} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
  }
}

// ---------------------------------------------------------------------------
// Shared bust parts: lit from the top left, shaded to the bottom right
// ---------------------------------------------------------------------------
function Eye({ x, y, id, rx = 3.2, ry = 2.7, iris = 2 }: { x: number; y: number; id: string; rx?: number; ry?: number; iris?: number }) {
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={parchment.base} stroke={STROKE} strokeWidth={1.2} />
      <Circle cx={x + 0.3} cy={y + 0.2} r={iris} fill={STROKE} />
      <Circle cx={x - 0.5} cy={y - 0.7} r={0.8} fill={WHITE} />
      <Path d={`M${x - rx - 0.4} ${y - 0.4} Q${x} ${y - ry - 1.8} ${x + rx + 0.4} ${y - 0.4}`} stroke={STROKE} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Ellipse cx={x} cy={y + ry} rx={rx - 0.6} ry={0.5} fill={SHADOW} opacity={0.12} />
      <Circle cx={x} cy={y} r={0} fill={`url(#${id}-skin)`} />
    </G>
  );
}

function Neck({ id, wide = false }: { id: string; wide?: boolean }) {
  const x = wide ? 42 : 44;
  const w = wide ? 16 : 12;
  return (
    <G>
      <Rect x={x} y={68} width={w} height={14} rx={4} fill={`url(#${id}-skin)`} {...LINE} />
      <Rect x={x + 1.5} y={70} width={w - 3} height={11} rx={3} fill={`url(#${id}-neckShade)`} />
    </G>
  );
}

function Ears({ id, y = 55, x1 = 31, x2 = 69 }: { id: string; y?: number; x1?: number; x2?: number }) {
  return (
    <G>
      <Ellipse cx={x1} cy={y} rx={4.2} ry={5} fill={`url(#${id}-skin)`} {...LINE} />
      <Ellipse cx={x2} cy={y} rx={4.2} ry={5} fill={`url(#${id}-skin)`} {...LINE} />
      <Path d={`M${x1 - 0.8} ${y - 2} Q${x1 + 1.6} ${y} ${x1 - 0.4} ${y + 2.6}`} stroke={STROKE} strokeWidth={1} fill="none" opacity={0.55} strokeLinecap="round" />
      <Path d={`M${x2 + 0.8} ${y - 2} Q${x2 - 1.6} ${y} ${x2 + 0.4} ${y + 2.6}`} stroke={STROKE} strokeWidth={1} fill="none" opacity={0.55} strokeLinecap="round" />
    </G>
  );
}

function Head({ id }: { id: string }) {
  return (
    <G>
      <Ellipse cx={50} cy={54} rx={19} ry={22} fill={`url(#${id}-skin)`} {...LINE} />
      <Ellipse cx={50} cy={54} rx={19} ry={22} fill={`url(#${id}-faceShade)`} />
      <Ellipse cx={39} cy={63} rx={4.2} ry={2.6} fill={hues.red.base} opacity={0.2} />
      <Ellipse cx={61} cy={63} rx={4.2} ry={2.6} fill={hues.red.base} opacity={0.16} />
      <Path d="M50 56 C49 60 48 62 50.4 63.2" stroke={STROKE} strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.6} />
      <Ellipse cx={43} cy={44} rx={6} ry={3} fill={WHITE} opacity={0.2} />
    </G>
  );
}

function Folds({ d }: { d: string }) {
  return <Path d={d} stroke={SHADOW} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.28} />;
}

function Sheen({ d }: { d: string }) {
  return <Path d={d} stroke={WHITE} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.3} />;
}

// ---------------------------------------------------------------------------
// Character busts (100x100 box)
// ---------------------------------------------------------------------------
function Luffy({ id }: { id: string }) {
  const h = hues.red;
  return (
    <G>
      {/* open red vest */}
      <Path d="M10 106 C12 86 32 80 50 82 C68 80 88 86 90 106 Z" fill={`url(#${id}-body)`} {...LINE} />
      <Path d="M39 82 L50 102 L61 82 Z" fill={`url(#${id}-skin)`} {...LINE} />
      <Path d="M44 90 L54 98 M54 90 L44 98" stroke={h.shade} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      <Folds d="M30 90 C27 96 26 100 26 106 M70 90 C73 96 74 100 74 106 M18 98 C24 94 30 96 34 100" />
      <Sheen d="M20 92 C26 86 34 84 40 84" />
      <Neck id={id} />
      <Path d="M40 80 Q50 88 60 80" stroke={SHADOW} strokeWidth={4} fill="none" opacity={0.2} strokeLinecap="round" />
      <Ears id={id} />
      {/* black hair behind the face */}
      <Path d="M30 52 C28 44 32 38 38 36 L62 36 C68 38 72 44 70 52 C68 46 66 44 64 44 L36 44 C34 44 32 46 30 52 Z" fill={STROKE} />
      <Head id={id} />
      <Path d="M31 50 C32 40 40 38 50 40 C60 38 68 40 69 50 C64 44 56 44 50 46 C44 44 36 44 31 50 Z" fill={STROKE} />
      <Path d="M36 43 C42 41 48 41 52 42" stroke={WHITE} strokeWidth={1.2} fill="none" opacity={0.28} strokeLinecap="round" />
      {/* eyes, brows and the scar */}
      <Path d="M36 50 Q41 48 46 50 M54 50 Q59 48 64 50" stroke={STROKE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Eye x={41.5} y={55.5} id={id} />
      <Eye x={58.5} y={55.5} id={id} />
      <Path d="M39.5 60.5 L39.5 64.5 M37.5 62.5 L41.5 62.5" stroke={h.shade} strokeWidth={1.5} strokeLinecap="round" />
      {/* wide grin */}
      <Path d="M38 64 Q50 78 62 64 Z" fill={SHADOW} {...LINE} strokeWidth={1.8} />
      <Path d="M39.5 64.6 Q50 68 60.5 64.6 L60 66.4 Q50 70 40 66.4 Z" fill={parchment.base} />
      <Path d="M43 71.5 Q50 67.5 57 71.5 Q50 75.5 43 71.5 Z" fill={h.base} opacity={0.9} />
      {/* straw hat with weave and red band */}
      <Ellipse cx={50} cy={51} rx={19} ry={3} fill={SHADOW} opacity={0.2} />
      <Ellipse cx={50} cy={41} rx={37} ry={9} fill={`url(#${id}-hat)`} {...LINE} />
      <Path d="M18 41 C26 47 38 49 50 49 C62 49 74 47 82 41" fill="none" stroke={gold.shade} strokeWidth={1.4} opacity={0.5} />
      <Path d="M30 41 C27 12 73 12 70 41 C60 47 40 47 30 41 Z" fill={`url(#${id}-hat)`} {...LINE} />
      <Path d="M33 30 C42 36 58 36 67 30 M32 24 C42 30 58 30 68 24 M36 18 C44 22 56 22 64 18" stroke={gold.shade} strokeWidth={1} fill="none" opacity={0.45} />
      <Path d="M30.4 34 C42 41 58 41 69.6 34 L70 41 C58 47 42 47 30 41 Z" fill={h.base} {...LINE} />
      <Path d="M32 36 C42 42 58 42 68 36" stroke={h.tint} strokeWidth={1.4} fill="none" opacity={0.7} strokeLinecap="round" />
      <Path d="M38 22 C42 17 47 16 51 16" stroke={WHITE} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.45} />
    </G>
  );
}

function Sanji({ id }: { id: string }) {
  const h = hues.yellow;
  return (
    <G>
      {/* black suit, white shirt, tie */}
      <Path d="M10 106 C12 86 32 80 50 82 C68 80 88 86 90 106 Z" fill={STROKE} {...LINE} />
      <Path d="M10 106 C12 86 32 80 50 82 C68 80 88 86 90 106 Z" fill={`url(#${id}-sheen)`} />
      <Path d="M40 82 L50 102 L60 82 Z" fill={parchment.base} {...LINE} />
      <Path d="M40 82 L34 98 L46 90 Z M60 82 L66 98 L54 90 Z" fill={STROKE} {...LINE} strokeWidth={1.6} />
      <Path d="M47.5 86 L52.5 86 L53.5 98 L50 104 L46.5 98 Z" fill={h.shade} {...LINE} strokeWidth={1.6} />
      <Path d="M48.6 88 L49.4 98" stroke={h.tint} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      <Folds d="M24 92 C21 98 20 102 20 106 M76 92 C79 98 80 102 80 106" />
      <Sheen d="M18 96 C24 88 32 85 38 84" />
      <Neck id={id} />
      <Path d="M40 80 Q50 88 60 80" stroke={SHADOW} strokeWidth={4} fill="none" opacity={0.22} strokeLinecap="round" />
      <Ears id={id} />
      <Head id={id} />
      {/* visible eye and curly brow */}
      <Eye x={59} y={56} id={id} rx={3.4} ry={2.8} />
      <Path d="M54 50 Q59 47 64 50" stroke={STROKE} strokeWidth={1.9} fill="none" strokeLinecap="round" />
      <Path d="M64 50 C67.4 50 67.4 53.4 64.6 53.4" stroke={STROKE} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* goatee */}
      <Path d="M46 70 C47 75 53 75 54 70 C52 72 48 72 46 70 Z" fill={`url(#${id}-hairY)`} stroke={STROKE} strokeWidth={1.2} strokeLinejoin="round" />
      {/* blond fringe covering the other eye */}
      <Path
        d="M30 52 C25 28 40 22 54 24 C68 26 73 38 70 52 C68 44 64 40 58 40 C56 50 52 58 45 60 C40 54 35 48 30 52 Z"
        fill={`url(#${id}-hairY)`}
        {...LINE}
      />
      <Path d="M44 34 C48 30 54 29 58 30 M36 34 C38 30 41 28 44 27 M50 38 C52 44 50 50 47 55" stroke={h.tint} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M58 40 C56 50 52 58 45 60" stroke={h.shade} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.6} />
      <Path d="M46 67.4 Q51 68.4 55 66.6" stroke={STROKE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {/* cigarette and smoke */}
      <Line x1={55} y1={67} x2={73} y2={61} stroke={parchment.base} strokeWidth={3} strokeLinecap="round" />
      <Line x1={55} y1={67} x2={73} y2={61} stroke={parchment.edge} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      <Circle cx={74} cy={60.5} r={2} fill={hues.red.tint} />
      <Path d="M76 56 C79 52 74 49 77 45" stroke={parchment.edge} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.8} />
    </G>
  );
}

function Zoro({ id }: { id: string }) {
  const h = hues.green;
  return (
    <G>
      {/* sword hilts behind the shoulder */}
      {[0, 7, 14].map((o) => (
        <G key={o}>
          <Line x1={70 + o * 0.6} y1={90} x2={78 + o * 0.9} y2={62 - o * 0.4} stroke={STROKE} strokeWidth={4} strokeLinecap="round" />
          <Line x1={71 + o * 0.6} y1={88} x2={77 + o * 0.9} y2={64 - o * 0.4} stroke={WHITE} strokeWidth={0.8} strokeLinecap="round" opacity={0.3} />
          <Line x1={73 + o * 0.9} y1={72 - o * 0.2} x2={83 + o * 0.9} y2={74 - o * 0.2} stroke={gold.base} strokeWidth={3} strokeLinecap="round" />
        </G>
      ))}
      {/* open white shirt and green sash */}
      <Path d="M10 106 C12 86 32 80 50 82 C68 80 88 86 90 106 Z" fill={`url(#${id}-shirt)`} {...LINE} />
      <Path d="M39 82 L50 102 L61 82 Z" fill={`url(#${id}-skin)`} {...LINE} />
      <Path d="M44 90 C47 93 53 93 56 90" stroke={SHADOW} strokeWidth={1.2} fill="none" opacity={0.3} strokeLinecap="round" />
      <Path d="M12 98 C30 94 70 94 88 98 L90 108 L10 108 Z" fill={`url(#${id}-hairG)`} {...LINE} />
      <Path d="M16 100 C34 97 66 97 84 100" stroke={h.tint} strokeWidth={1.2} fill="none" opacity={0.7} strokeLinecap="round" />
      <Folds d="M26 88 C23 92 22 96 22 98 M74 88 C77 92 78 96 78 98 M34 86 C32 90 31 93 31 96" />
      <Sheen d="M18 94 C24 88 32 85 38 84" />
      <Neck id={id} />
      <Path d="M40 80 Q50 88 60 80" stroke={SHADOW} strokeWidth={4} fill="none" opacity={0.22} strokeLinecap="round" />
      <Ears id={id} />
      <Circle cx={27.4} cy={60} r={2} fill={gold.base} stroke={STROKE} strokeWidth={1} />
      <Circle cx={27.4} cy={65} r={2} fill={gold.base} stroke={STROKE} strokeWidth={1} />
      <Circle cx={27.4} cy={70} r={2} fill={gold.base} stroke={STROKE} strokeWidth={1} />
      <Circle cx={26.8} cy={59.4} r={0.6} fill={WHITE} />
      <Head id={id} />
      <Path
        d="M30 52 C27 36 33 28 41 30 L43 20 L50 29 L57 20 L59 30 C68 28 73 38 70 52 C65 44 57 41 50 42 C43 41 35 44 30 52 Z"
        fill={`url(#${id}-hairG)`}
        {...LINE}
      />
      <Path d="M38 33 C42 31 45 32 47 34 M52 32 C56 31 60 33 62 36 M34 40 C34 37 35 35 37 33" stroke={h.tint} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.9} />
      {/* closed scarred eye, open eye */}
      <Path d="M37 56 Q41.5 58 46 56" stroke={STROKE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d="M41 46 L46 66" stroke={hues.red.shade} strokeWidth={2} strokeLinecap="round" />
      <Path d="M42.4 52 L44.8 51 M43.6 58 L41.6 59 M44.6 62.6 L42.4 63.6" stroke={hues.red.shade} strokeWidth={1.2} strokeLinecap="round" />
      <Eye x={58} y={56} id={id} />
      <Path d="M53 50 L64 52" stroke={STROKE} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M44 68 Q52 71 59 65" stroke={STROKE} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Jinbe({ id }: { id: string }) {
  const h = hues.blue;
  return (
    <G>
      {/* wide kimono shoulders */}
      <Path d="M6 106 C8 86 30 80 50 82 C70 80 92 86 94 106 Z" fill={`url(#${id}-body)`} {...LINE} />
      <Path d="M36 82 L50 104 L64 82 Z" fill={`url(#${id}-skin)`} {...LINE} />
      <Path d="M36 82 L50 104 L64 82" fill="none" stroke={gold.base} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M16 98 C22 94 28 98 34 94 M66 94 C72 98 78 94 84 98" stroke={h.tint} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Folds d="M22 90 C19 96 18 100 18 106 M78 90 C81 96 82 100 82 106 M30 88 C28 94 27 98 27 104" />
      <Sheen d="M14 94 C22 87 30 84 36 84" />
      <Neck id={id} wide />
      <Path d="M38 80 Q50 90 62 80" stroke={SHADOW} strokeWidth={4} fill="none" opacity={0.22} strokeLinecap="round" />
      <Ears id={id} y={53} x1={29} x2={71} />
      <Path
        d="M29 46 C27 66 38 78 50 78 C62 78 73 66 71 46 C70 30 60 26 50 26 C40 26 30 30 29 46 Z"
        fill={`url(#${id}-skin)`}
        {...LINE}
      />
      <Path
        d="M29 46 C27 66 38 78 50 78 C62 78 73 66 71 46 C70 30 60 26 50 26 C40 26 30 30 29 46 Z"
        fill={`url(#${id}-faceShade)`}
      />
      <Ellipse cx={37} cy={62} rx={4.6} ry={2.8} fill={hues.red.base} opacity={0.14} />
      <Ellipse cx={63} cy={62} rx={4.6} ry={2.8} fill={hues.red.base} opacity={0.12} />
      <Path d="M50 54 C49 58 48 60 50.6 61" stroke={STROKE} strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.55} />
      <Path d="M28 48 C25 28 40 20 52 22 C66 22 76 32 72 48 C66 36 58 33 50 34 C42 33 34 38 28 48 Z" fill={`url(#${id}-hairB)`} {...LINE} />
      <Path d="M38 27 C44 24 50 24 56 25 M60 28 C65 29 69 33 70 38" stroke={h.tint} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.85} />
      {/* shark tattoo on the cheek */}
      <Path d="M33 56 C35 52 38 52 40 53 C38 55 36 58 33 56 Z" fill={h.shade} opacity={0.5} />
      {/* heavy brows and calm eyes */}
      <Path d="M35 49.4 L46 51.4 M65 49.4 L54 51.4" stroke={STROKE} strokeWidth={3} strokeLinecap="round" />
      <Eye x={41} y={55.4} id={id} rx={3} ry={2.4} iris={1.9} />
      <Eye x={59} y={55.4} id={id} rx={3} ry={2.4} iris={1.9} />
      <Path d="M43 60 Q50 63 57 60" stroke={h.shade} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* wide shark smile */}
      <Path d="M36 65 Q50 77 64 65 Z" fill={SHADOW} {...LINE} strokeWidth={1.6} />
      <Path d="M38.5 66 L41.5 70 L44.5 67 L47.5 71 L50 67.5 L52.5 71 L55.5 67 L58.5 70 L61.5 66 Z" fill={parchment.base} />
      <Path d="M33 60 C35 64 37 66 38 67 M67 60 C65 64 63 66 62 67" stroke={h.shade} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Bust({ color, id }: { color: Color; id: string }) {
  switch (color) {
    case 'red':
      return <Luffy id={id} />;
    case 'yellow':
      return <Sanji id={id} />;
    case 'green':
      return <Zoro id={id} />;
    default:
      return <Jinbe id={id} />;
  }
}

// ---------------------------------------------------------------------------
function VectorEmblem({ color, size, variant }: EmblemProps): JSX.Element {
  const h = hues[color];
  const emblem = CHARACTERS[color].emblem;
  const id = `ce-${color}-${variant}`;

  if (variant === 'badge') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}-disc`} cx="0.35" cy="0.3" rx="0.8" ry="0.8" fx="0.35" fy="0.3">
            <Stop offset="0" stopColor={h.tint} />
            <Stop offset="0.55" stopColor={h.base} />
            <Stop offset="1" stopColor={h.shade} />
          </RadialGradient>
          <LinearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={WHITE} stopOpacity={0.35} />
            <Stop offset="1" stopColor={WHITE} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Circle cx={50} cy={54} r={44} fill="rgba(5,12,22,0.35)" />
        <Circle cx={50} cy={50} r={46} fill={`url(#${id}-disc)`} />
        <Circle cx={50} cy={50} r={43.5} fill="none" stroke={gold.base} strokeWidth={3} />
        <Circle cx={50} cy={50} r={40} fill="none" stroke={h.shade} strokeWidth={1.5} opacity={0.7} />
        <G transform="translate(21 21) scale(0.58)">
          <Mark kind={emblem} color={color} />
        </G>
        <Ellipse cx={38} cy={24} rx={24} ry={12} fill={`url(#${id}-gloss)`} />
      </Svg>
    );
  }

  const skinFrom = color === 'blue' ? h.tint : parchment.cell;
  const skinTo = color === 'blue' ? h.base : parchment.edge;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={h.base} />
          <Stop offset="1" stopColor={h.shade} />
        </LinearGradient>
        <RadialGradient id={`${id}-glow`} cx="0.2" cy="0.12" rx="0.8" ry="0.8" fx="0.2" fy="0.12">
          <Stop offset="0" stopColor={h.tint} stopOpacity={0.7} />
          <Stop offset="1" stopColor={h.tint} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-skin`} x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor={skinFrom} />
          <Stop offset="1" stopColor={skinTo} />
        </LinearGradient>
        <LinearGradient id={`${id}-faceShade`} x1="0" y1="0" x2="1" y2="0.3">
          <Stop offset="0" stopColor={WHITE} stopOpacity={0.16} />
          <Stop offset="0.5" stopColor={SHADOW} stopOpacity={0} />
          <Stop offset="1" stopColor={SHADOW} stopOpacity={0.3} />
        </LinearGradient>
        <LinearGradient id={`${id}-neckShade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SHADOW} stopOpacity={0.4} />
          <Stop offset="1" stopColor={SHADOW} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${id}-body`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={h.tint} />
          <Stop offset="0.5" stopColor={h.base} />
          <Stop offset="1" stopColor={h.shade} />
        </LinearGradient>
        <LinearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={WHITE} stopOpacity={0.22} />
          <Stop offset="0.5" stopColor={WHITE} stopOpacity={0.02} />
          <Stop offset="1" stopColor={WHITE} stopOpacity={0.08} />
        </LinearGradient>
        <LinearGradient id={`${id}-shirt`} x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor={parchment.base} />
          <Stop offset="1" stopColor={parchment.edge} />
        </LinearGradient>
        <LinearGradient id={`${id}-hat`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gold.tint} />
          <Stop offset="0.55" stopColor={gold.base} />
          <Stop offset="1" stopColor={gold.shade} />
        </LinearGradient>
        <LinearGradient id={`${id}-hairY`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={hues.yellow.tint} />
          <Stop offset="0.5" stopColor={hues.yellow.base} />
          <Stop offset="1" stopColor={hues.yellow.shade} />
        </LinearGradient>
        <LinearGradient id={`${id}-hairG`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={hues.green.tint} />
          <Stop offset="0.5" stopColor={hues.green.base} />
          <Stop offset="1" stopColor={hues.green.shade} />
        </LinearGradient>
        <LinearGradient id={`${id}-hairB`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={hues.blue.base} />
          <Stop offset="1" stopColor={hues.blue.shade} />
        </LinearGradient>
        <ClipPath id={`${id}-clip`}>
          <Rect x={0} y={0} width={100} height={100} rx={16} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id}-clip)`}>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}-bg)`} />
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}-glow)`} />
        <Path d="M0 84 C20 76 40 90 60 82 C78 76 90 82 100 78 L100 100 L0 100 Z" fill={h.shade} opacity={0.35} />
        <Ellipse cx={50} cy={96} rx={40} ry={7} fill={SHADOW} opacity={0.22} />
        <Bust color={color} id={id} />
        {/* emblem seal, top right */}
        <Circle cx={85} cy={16} r={11} fill={parchment.base} stroke={gold.base} strokeWidth={2} />
        <G transform="translate(75.5 6.5) scale(0.19)">
          <Mark kind={emblem} color={color} />
        </G>
      </G>
      <Rect x={1.25} y={1.25} width={97.5} height={97.5} rx={15} fill="none" stroke={gold.shade} strokeWidth={2.5} />
    </Svg>
  );
}

/** The illustrated portrait in a round frame of the player's colour; the vector emblem if it can't load. */
export default function CharacterEmblem(props: EmblemProps): JSX.Element {
  const { color, size } = props;
  const [ok, setOk] = useState(true);
  if (!ok) return <VectorEmblem {...props} />;
  const h = hues[color];
  const ring = Math.max(2, Math.round(size * 0.06));
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={CHARACTERS[color].name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: h.base,
        borderWidth: ring,
        borderColor: gold.base,
        overflow: 'hidden',
      }}
    >
      <Image
        source={{ uri: `${ART_BASE}${color}-portrait.webp` }}
        onError={() => setOk(false)}
        fadeDuration={0}
        style={{ width: size - ring * 2, height: size - ring * 2 }}
      />
    </View>
  );
}
