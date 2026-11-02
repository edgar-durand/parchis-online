import React from 'react';
import { View } from 'react-native';
import Svg, {
  ClipPath,
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import type { Color } from '../types';

type Pal = { main: string; dark: string; light: string; tint: string };

const PALS: Record<string, Pal> = {
  red: { main: '#D93A3A', dark: '#8E1F24', light: '#FFE3DC', tint: '#FFB9AC' },
  yellow: { main: '#F2B705', dark: '#946600', light: '#FFF4C4', tint: '#FFE27A' },
  green: { main: '#2E9E5B', dark: '#156034', light: '#D7F3E1', tint: '#9ADDB4' },
  blue: { main: '#2F6FD6', dark: '#1A3D86', light: '#D6E5FF', tint: '#9DBFF5' },
};

const SKIN = '#F4C7A1';
const SKIN_SHADE = '#D9A27A';
const GOLD = '#E3B341';
const INK = '#1E1B2B';

const VIEW_W = 48;
const VIEW_H = 54;

function Luffy() {
  return (
    <G>
      {/* chest + shoulders */}
      <Path d="M8 44 Q10 31 24 30 Q38 31 40 44 Z" fill={SKIN} />
      <Path d="M8 44 Q10 32 20 30.5 L22 44 Z" fill="#D93A3A" />
      <Path d="M40 44 Q38 32 28 30.5 L26 44 Z" fill="#D93A3A" />
      <Rect x={21} y={27} width={6} height={5} fill={SKIN_SHADE} />
      {/* head */}
      <Ellipse cx={24} cy={21} rx={8.2} ry={9} fill={SKIN} />
      <Ellipse cx={15.8} cy={22} rx={1.4} ry={2.2} fill={SKIN} />
      <Ellipse cx={32.2} cy={22} rx={1.4} ry={2.2} fill={SKIN} />
      {/* hair */}
      <Path d="M16 19 Q15.5 14 18 13 L19 19 Z" fill={INK} />
      <Path d="M32 19 Q32.5 14 30 13 L29 19 Z" fill={INK} />
      {/* eyes, scar, smile */}
      <Circle cx={20.5} cy={21} r={1.3} fill={INK} />
      <Circle cx={27.5} cy={21} r={1.3} fill={INK} />
      <Path d="M18.6 23.6 L22 24" stroke="#B5473A" strokeWidth={0.9} strokeLinecap="round" />
      <Path d="M18.8 24.8 Q24 30.6 29.2 24.8 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      {/* straw hat */}
      <Path d="M15 14.5 Q15 4.5 24 4.5 Q33 4.5 33 14.5 Z" fill="#F2CD6B" />
      <Path d="M15.1 11.8 Q24 14 32.9 11.8 L33 14.5 Q24 16.6 15 14.5 Z" fill="#D93A3A" />
      <Ellipse cx={24} cy={15} rx={16.5} ry={3.6} fill="#E8B94A" />
      <Path d="M9 14.6 Q24 20 39 14.6" stroke="#B98A25" strokeWidth={0.8} fill="none" />
      <Path d="M18 7 Q22 5 26 5.6" stroke="#FFF1B8" strokeWidth={1} strokeLinecap="round" fill="none" />
    </G>
  );
}

function Sanji() {
  return (
    <G>
      {/* suit */}
      <Path d="M8 44 Q10 31 24 30 Q38 31 40 44 Z" fill="#23262F" />
      <Path d="M19.5 30.5 L24 41 L28.5 30.5 Z" fill="#FFFFFF" />
      <Path d="M23 32 L25 32 L25.6 41 L24 43 L22.4 41 Z" fill="#12141A" />
      <Rect x={21} y={27} width={6} height={5} fill={SKIN_SHADE} />
      {/* head */}
      <Ellipse cx={24} cy={21} rx={8.2} ry={9} fill={SKIN} />
      {/* hair */}
      <Path d="M15.4 21 Q13.6 8 24 7.6 Q34.6 8 32.6 21 Q31 14.4 24 14.8 Q18 14.4 15.4 21 Z" fill="#F6D44B" />
      <Path d="M22 14.6 Q31.5 13.4 32.6 26 Q27.5 25 25 19.5 Z" fill="#F6D44B" />
      <Path d="M23 10 Q27 9 30 11" stroke="#FFF2A8" strokeWidth={1} strokeLinecap="round" fill="none" />
      {/* eye + curly brow */}
      <Circle cx={20.2} cy={21.4} r={1.3} fill={INK} />
      <Path d="M17.6 18.6 Q20 17.4 22 18.8" stroke="#B88B00" strokeWidth={1} strokeLinecap="round" fill="none" />
      <Path d="M18.6 18.2 Q19.4 16.8 20.4 17.6" stroke="#B88B00" strokeWidth={0.8} strokeLinecap="round" fill="none" />
      {/* goatee + cigarette */}
      <Path d="M22 28.4 Q24 30.4 26 28.4 Q24 29 22 28.4 Z" fill="#E1BC32" />
      <Path d="M22.4 26.6 Q24.5 27.4 26.6 26.6" stroke={INK} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      <Path d="M26.4 26.8 L35.5 24.4" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={36} cy={24.3} r={1} fill="#F2711C" />
    </G>
  );
}

function Zoro() {
  return (
    <G>
      {/* shirt, coat, sash */}
      <Path d="M8 44 Q10 31 24 30 Q38 31 40 44 Z" fill="#1E5B36" />
      <Path d="M19.5 30.5 L24 42 L28.5 30.5 Z" fill="#F2F2EC" />
      <Path d="M8 44 Q9 40 13 39 L35 39 Q39 40 40 44 Z" fill="#2B8C52" />
      <Rect x={21} y={27} width={6} height={5} fill={SKIN_SHADE} />
      {/* head */}
      <Ellipse cx={24} cy={21} rx={8.2} ry={9} fill={SKIN} />
      {/* earrings */}
      <Circle cx={15.6} cy={23.4} r={1} fill={GOLD} />
      <Circle cx={15.6} cy={26} r={1} fill={GOLD} />
      <Circle cx={15.6} cy={28.6} r={1} fill={GOLD} />
      {/* hair */}
      <Path d="M15.6 21 Q13.8 8.5 24 8 Q34.2 8.5 32.4 21 Q31 14 24 14 Q17 14 15.6 21 Z" fill="#2E9A56" />
      <Path d="M17 11.5 L15.2 6.5 L21 9.5 Z" fill="#2E9A56" />
      <Path d="M22 9 L24 4 L27 9 Z" fill="#2E9A56" />
      <Path d="M27.5 9.6 L33 6.4 L31.6 12.4 Z" fill="#2E9A56" />
      <Path d="M20 10 Q23 8.6 26 9.4" stroke="#7BD79B" strokeWidth={1} strokeLinecap="round" fill="none" />
      {/* eyes, scar, frown */}
      <Path d="M18.4 20.4 L22.4 20.8" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M20.2 16.6 L21.6 25" stroke="#B5473A" strokeWidth={1} strokeLinecap="round" />
      <Circle cx={27.6} cy={21} r={1.3} fill={INK} />
      <Path d="M17.8 18 L22.4 19" stroke="#1C6B3A" strokeWidth={1.1} strokeLinecap="round" />
      <Path d="M30 18 L25.6 19" stroke="#1C6B3A" strokeWidth={1.1} strokeLinecap="round" />
      <Path d="M21 27.6 Q24 26 27 27.6" stroke={INK} strokeWidth={1} strokeLinecap="round" fill="none" />
    </G>
  );
}

function Jinbe() {
  const skin = '#6A9AD0';
  const shade = '#4D7BAE';
  return (
    <G>
      {/* broad robe + chest */}
      <Path d="M4 44 Q7 30 24 29.5 Q41 30 44 44 Z" fill="#24427A" />
      <Path d="M18 30 L24 43 L30 30 Z" fill={skin} />
      <Path d="M17 30 L24 44 L31 30" stroke="#E9EEF7" strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      <Rect x={20} y={26} width={8} height={5} fill={shade} />
      {/* head */}
      <Ellipse cx={24} cy={20.4} rx={9.4} ry={9.6} fill={skin} />
      <Ellipse cx={14.8} cy={21.5} rx={1.4} ry={2.3} fill={skin} />
      <Ellipse cx={33.2} cy={21.5} rx={1.4} ry={2.3} fill={skin} />
      {/* hair */}
      <Path d="M14.8 17.6 Q14 7.4 24 7.2 Q34 7.4 33.2 17.6 Q31.5 12.4 24 12.4 Q16.5 12.4 14.8 17.6 Z" fill="#17254A" />
      <Path d="M20 8.6 Q24 7 28 8.6" stroke="#4C629C" strokeWidth={1} strokeLinecap="round" fill="none" />
      {/* brows, eyes */}
      <Path d="M17.4 17.6 L22 18.4" stroke="#17254A" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M30.6 17.6 L26 18.4" stroke="#17254A" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M18.4 20.8 Q20.4 19.8 22.2 20.8" stroke={INK} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Path d="M29.6 20.8 Q27.6 19.8 25.8 20.8" stroke={INK} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      {/* nose and thick lips */}
      <Path d="M22.6 23.6 Q24 25 25.4 23.6" stroke={shade} strokeWidth={1} strokeLinecap="round" fill="none" />
      <Path d="M19.4 27 Q24 24.8 28.6 27 Q24 31 19.4 27 Z" fill="#3B6396" />
      <Path d="M20.6 27.2 Q24 26.2 27.4 27.2" stroke="#9FC2E8" strokeWidth={0.8} strokeLinecap="round" fill="none" />
    </G>
  );
}

function Bust({ k }: { k: string }) {
  if (k === 'yellow') return <Sanji />;
  if (k === 'green') return <Zoro />;
  if (k === 'blue') return <Jinbe />;
  return <Luffy />;
}

export default function CharacterPawn(props: { color: Color; size: number; stacked?: boolean }) {
  const { color, size, stacked } = props;
  const key = String(color);
  const k = PALS[key] ? key : 'red';
  const pal = PALS[k];
  const width = size;
  const height = (size * VIEW_H) / VIEW_W;
  const id = `cpawn-${k}`;

  return (
    <View pointerEvents="none" style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <LinearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pal.tint} />
            <Stop offset="0.45" stopColor={pal.main} />
            <Stop offset="1" stopColor={pal.dark} />
          </LinearGradient>
          <LinearGradient id={`${id}-disc`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor={pal.light} />
          </LinearGradient>
          <ClipPath id={`${id}-clip`}>
            <Circle cx={24} cy={22} r={17.2} />
          </ClipPath>
        </Defs>

        {/* ground shadow */}
        <Ellipse cx={24} cy={49.4} rx={stacked ? 14 : 17} ry={stacked ? 2.6 : 3.6} fill="#000000" opacity={0.28} />

        {/* base */}
        <Ellipse cx={24} cy={44.2} rx={18} ry={6.6} fill={pal.dark} />
        <Ellipse cx={24} cy={42.4} rx={18} ry={6.6} fill={`url(#${id}-base)`} />
        <Ellipse cx={24} cy={41.6} rx={13.5} ry={4} fill={pal.dark} opacity={0.35} />
        <Path d="M9 40.6 Q13 37.6 19 37.4" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" opacity={0.55} fill="none" />

        {/* medallion */}
        <Circle cx={24} cy={22} r={19.4} fill={GOLD} />
        <Circle cx={24} cy={22} r={18.2} fill={pal.main} />
        <Circle cx={24} cy={22} r={17.2} fill={`url(#${id}-disc)`} />
        <G clipPath={`url(#${id}-clip)`}>
          <Bust k={k} />
        </G>
        <Circle cx={24} cy={22} r={17.2} stroke={pal.dark} strokeWidth={0.8} fill="none" opacity={0.5} />
        <Path d="M9.6 14.6 Q13 7.4 21 5.2" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} fill="none" />
      </Svg>
    </View>
  );
}
