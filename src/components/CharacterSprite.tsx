import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { Color } from '../types';

type Pose = 'idle' | 'walk' | 'jump' | 'hit' | 'cheer';
type Eyes = 'open' | 'x' | 'happy';

type Props = {
  color: Color;
  size: number;
  pose: Pose;
  phase: number;
  facing: 1 | -1;
};

type Look = {
  id: 'luffy' | 'sanji' | 'zoro' | 'jinbe';
  skin: string;
  skinDark: string;
  accent: string;
  pants: string;
  shoe: string;
  top: string;
};

const LOOKS: Record<string, Look> = {
  red: { id: 'luffy', skin: '#f3c9a0', skinDark: '#d9a47c', accent: '#d6402f', pants: '#f3c9a0', shoe: '#7a4a24', top: '#d6402f' },
  yellow: { id: 'sanji', skin: '#f5d0aa', skinDark: '#dcaa82', accent: '#f2b705', pants: '#1d1f27', shoe: '#0f1015', top: '#23252f' },
  green: { id: 'zoro', skin: '#e9b98c', skinDark: '#cc9468', accent: '#3f9c4a', pants: '#20232b', shoe: '#14161b', top: '#f4f1e8' },
  blue: { id: 'jinbe', skin: '#6f9fd2', skinDark: '#527fb3', accent: '#2f6fba', pants: '#22345f', shoe: '#18213b', top: '#22345f' },
};

type Rig = {
  bob: number;
  sx: number;
  sy: number;
  lean: number;
  thighL: number;
  thighR: number;
  kneeL: number;
  kneeR: number;
  armL: number;
  armR: number;
  elbowL: number;
  elbowR: number;
  eyes: Eyes;
  mouth: 'smile' | 'open' | 'grin';
  shadow: number;
};

const TAU = Math.PI * 2;

function computeRig(pose: Pose, phase: number): Rig {
  const p = ((phase % 1) + 1) % 1;
  const th = p * TAU;
  const base: Rig = {
    bob: 0, sx: 1, sy: 1, lean: 0,
    thighL: 3, thighR: -3, kneeL: 0, kneeR: 0,
    armL: 7, armR: -7, elbowL: -12, elbowR: -12,
    eyes: 'open', mouth: 'smile', shadow: 1,
  };
  if (pose === 'idle') {
    const b = Math.sin(th);
    return { ...base, bob: -0.5 * b, sy: 1 + 0.012 * b, sx: 1 - 0.006 * b, lean: 0.8 * b, armL: 7 + 2 * b, armR: -7 - 2 * b };
  }
  if (pose === 'walk') {
    const s = Math.sin(th);
    const c = Math.cos(th);
    const sy = 1 - 0.035 + 0.05 * Math.abs(c) - 0.02 * Math.abs(s);
    return {
      ...base,
      bob: -Math.abs(c) * 4,
      sy,
      sx: 1 / Math.sqrt(sy),
      lean: 4 + s * 3,
      thighL: s * 36,
      thighR: -s * 36,
      kneeL: 40 * Math.max(0, -c),
      kneeR: 40 * Math.max(0, c),
      armL: -s * 32,
      armR: s * 32,
      elbowL: -18 - 14 * Math.max(0, s),
      elbowR: -18 - 14 * Math.max(0, -s),
      mouth: 'smile',
      shadow: 1 - Math.abs(c) * 0.15,
    };
  }
  if (pose === 'jump') {
    if (p < 0.15) {
      const q = p / 0.15;
      return { ...base, sy: 1 - 0.18 * q, sx: 1 + 0.12 * q, thighL: -30 * q, thighR: -30 * q, kneeL: 55 * q, kneeR: 55 * q, armL: 40 * q, armR: 30 * q, lean: 6 * q, mouth: 'open' };
    }
    if (p < 0.85) {
      const u = (p - 0.15) / 0.7;
      const a = Math.sin(Math.PI * u);
      return {
        ...base,
        sy: 1 + 0.12 * a,
        sx: 1 - 0.07 * a,
        thighL: -38 * a,
        thighR: 12 * a,
        kneeL: 60 * a,
        kneeR: 35 * a,
        armL: -150 * a,
        armR: -135 * a,
        elbowL: -10,
        elbowR: -10,
        lean: 5,
        mouth: 'grin',
        eyes: 'happy',
        shadow: 1 - 0.35 * a,
      };
    }
    const q = (p - 0.85) / 0.15;
    const k = 1 - q;
    return { ...base, sy: 1 - 0.15 * k, sx: 1 + 0.1 * k, thighL: -22 * k, thighR: -22 * k, kneeL: 45 * k, kneeR: 45 * k, armL: 30 * k, armR: 20 * k, lean: 3 * k };
  }
  if (pose === 'hit') {
    const f = Math.sin(th * 3);
    return {
      ...base,
      lean: -18 + 4 * f,
      sy: 1.04,
      sx: 0.97,
      thighL: 28,
      thighR: -22,
      kneeL: 18,
      kneeR: 10,
      armL: -105 + 28 * f,
      armR: -85 - 28 * f,
      elbowL: -25,
      elbowR: -25,
      eyes: 'x',
      mouth: 'open',
    };
  }
  const s = Math.sin(th);
  return {
    ...base,
    bob: -Math.abs(s) * 5,
    sy: 1 + 0.03 * Math.abs(s),
    sx: 1 - 0.015 * Math.abs(s),
    lean: 2 * s,
    thighL: 8,
    thighR: -8,
    armL: -160 + 15 * Math.sin(2 * th),
    armR: -150 - 15 * Math.sin(2 * th),
    elbowL: -8,
    elbowR: -8,
    eyes: 'happy',
    mouth: 'grin',
  };
}

function Leg(props: { x: number; y: number; a: number; k: number; look: Look }): JSX.Element {
  const { x, y, a, k, look } = props;
  return (
    <G transform={`translate(${x} ${y}) rotate(${a})`}>
      <Rect x={-4.8} y={0} width={9.6} height={17} rx={4.4} fill={look.pants} />
      <G transform={`translate(0 16) rotate(${k})`}>
        <Rect x={-4.2} y={0} width={8.4} height={15} rx={3.8} fill={look.pants} />
        <Path d="M-5 13 h11.5 a3.4 3.4 0 0 1 0 6.4 h-11.5z" fill={look.shoe} />
        <Rect x={-5} y={17.2} width={12} height={2} rx={1} fill="#000" opacity={0.3} />
      </G>
    </G>
  );
}

function Arm(props: { x: number; y: number; a: number; e: number; look: Look; sleeve: string; longSleeve: boolean }): JSX.Element {
  const { x, y, a, e, look, sleeve, longSleeve } = props;
  const fore = longSleeve ? sleeve : look.skin;
  return (
    <G transform={`translate(${x} ${y}) rotate(${a})`}>
      <Rect x={-3.8} y={-2} width={7.6} height={15} rx={3.8} fill={sleeve} />
      <G transform={`translate(0 11) rotate(${e})`}>
        <Rect x={-3.3} y={0} width={6.6} height={12.5} rx={3.3} fill={fore} />
        <Circle cx={0} cy={13.2} r={3.9} fill={look.skin} />
      </G>
    </G>
  );
}

function EyesView(props: { kind: Eyes; hideRear: boolean }): JSX.Element {
  const { kind, hideRear } = props;
  const xs = hideRear ? [44.5] : [36, 44.5];
  if (kind === 'x') {
    return (
      <G stroke="#1a1a1a" strokeWidth={1.6} strokeLinecap="round">
        {xs.map((x) => (
          <Path key={x} d={`M${x - 2.4} 18.6 l4.8 4.8 M${x + 2.4} 18.6 l-4.8 4.8`} />
        ))}
      </G>
    );
  }
  if (kind === 'happy') {
    return (
      <G stroke="#1a1a1a" strokeWidth={1.8} strokeLinecap="round" fill="none">
        {xs.map((x) => (
          <Path key={x} d={`M${x - 2.6} 22.4 q2.6 -4.8 5.2 0`} />
        ))}
      </G>
    );
  }
  return (
    <G>
      {xs.map((x) => (
        <G key={x}>
          <Ellipse cx={x} cy={21} rx={2.7} ry={3.3} fill="#fff" />
          <Circle cx={x + 0.7} cy={21.3} r={1.8} fill="#1a1a1a" />
          <Circle cx={x + 1.3} cy={20.4} r={0.6} fill="#fff" />
        </G>
      ))}
    </G>
  );
}

function MouthView(props: { kind: Rig['mouth']; look: Look }): JSX.Element {
  const { kind, look } = props;
  if (kind === 'open') {
    return <Ellipse cx={41} cy={28.3} rx={2.6} ry={3} fill="#5a1a1a" />;
  }
  if (kind === 'grin') {
    return (
      <G>
        <Path d="M33 26.5 q8 9 16 0z" fill="#5a1a1a" />
        <Path d="M34.5 26.5 q6.5 3 13 0 l-0.4 1.6 q-6 2 -12.2 0z" fill="#fff" />
      </G>
    );
  }
  if (look.id === 'zoro') {
    return <Path d="M36.5 28.5 q4.5 -2 9 0" stroke="#5a2a1a" strokeWidth={1.6} fill="none" strokeLinecap="round" />;
  }
  if (look.id === 'jinbe') {
    return (
      <G>
        <Path d="M34 27 q7.5 5 15 0z" fill="#3a1a24" />
        <Path d="M36 27 l1.4 2 l1.4 -2z M40 27.2 l1.4 2.4 l1.4 -2.4z M44 27 l1.4 2 l1.4 -2z" fill="#fff" />
      </G>
    );
  }
  return <Path d="M35 26.6 q6 5 12 0" stroke="#5a2a1a" strokeWidth={1.7} fill="none" strokeLinecap="round" />;
}

function TorsoView(props: { look: Look; id: string }): JSX.Element {
  const { look, id } = props;
  const body = 'M26 33 q0 -6 6 -6 h10 q6 0 6 6 l2.5 23 q0 4 -4 4 h-19 q-4 0 -4 -4z';
  const wide = look.id === 'jinbe';
  return (
    <G transform={wide ? 'translate(37 0) scale(1.18 1) translate(-37 0)' : undefined}>
      <Path d={body} fill={look.id === 'luffy' || look.id === 'jinbe' ? look.skin : look.top} />
      {look.id === 'luffy' && (
        <G>
          <Path d="M26 33 q0 -6 6 -6 h3.4 l1.6 33 h-12 l-1 -4z" fill={look.accent} />
          <Path d="M48 33 q0 -6 -6 -6 h-3.4 l-1.6 33 h12 l1 -4z" fill={look.accent} />
          <Path d="M34.5 38 l5 5 M39.5 38 l-5 5" stroke="#9c6a4a" strokeWidth={1.1} strokeLinecap="round" />
        </G>
      )}
      {look.id === 'sanji' && (
        <G>
          <Path d="M33 27 L37 47 L41 27z" fill="#f6f6f2" />
          <Path d="M36 31 h2 l1.3 12 l-2.3 3.4 l-2.3 -3.4z" fill={look.accent} />
          <Path d="M32 27 L37 49 M42 27 L37 49" stroke="#0a0b10" strokeWidth={1} opacity={0.7} />
          <Circle cx={37} cy={53} r={1.1} fill="#d8c27a" />
        </G>
      )}
      {look.id === 'zoro' && (
        <G>
          <Path d="M32.5 27 L37 44 L41.5 27z" fill="#e9b98c" />
          <Rect x={25} y={49} width={24} height={9} rx={2} fill={look.accent} />
          <Path d="M25 52 h24" stroke="#2a6e33" strokeWidth={1} />
        </G>
      )}
      {look.id === 'jinbe' && (
        <G>
          <Path d="M26 33 q0 -6 6 -6 h3 l1.6 33 h-12 l-1 -4z" fill="#22345f" />
          <Path d="M48 33 q0 -6 -6 -6 h-3 l-1.6 33 h12 l1 -4z" fill="#22345f" />
          <Rect x={25} y={51} width={24} height={6} rx={2} fill="#e9eef6" />
          <Path d="M31 38 q3 3 6 0 M37 38 q3 3 6 0" stroke="#527fb3" strokeWidth={1} fill="none" />
        </G>
      )}
      <Path d={body} fill={`url(#cs-${id}-shade)`} />
    </G>
  );
}

function HeadView(props: { look: Look; rig: Rig; id: string }): JSX.Element {
  const { look, rig, id } = props;
  const wide = look.id === 'jinbe';
  return (
    <G>
      <G transform={wide ? 'translate(37 20) scale(1.1 1.02) translate(-37 -20)' : undefined}>
        <Circle cx={24.5} cy={21.5} r={2.6} fill={look.skinDark} />
        <Ellipse cx={37} cy={20} rx={12.5} ry={12} fill={`url(#cs-${id}-skin)`} />
        {look.id === 'zoro' && (
          <G>
            <Circle cx={24} cy={25} r={1.3} fill="#e8c25a" />
            <Circle cx={24} cy={28} r={1.3} fill="#e8c25a" />
          </G>
        )}
        <Path d="M31 14.4 q4 -2.2 8 -0.2 M41 14.2 q4 -2 7.600 0.4" stroke="#1a1a1a" strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={look.id === 'luffy' ? 0 : 0.85} />
        <EyesView kind={rig.eyes} hideRear={look.id === 'sanji'} />
        {look.id === 'luffy' && <Path d="M34 24.2 q2 1.4 4 0" stroke="#b5483a" strokeWidth={1} fill="none" strokeLinecap="round" />}
        {look.id === 'zoro' && <Path d="M35.200 15.800 l1.600 8" stroke="#b33b3b" strokeWidth={1.3} strokeLinecap="round" />}
        <MouthView kind={rig.mouth} look={look} />
        {look.id === 'sanji' && (
          <G>
            <Rect x={45} y={26.200} width={8} height={1.900} rx={0.9} fill="#f6f6f2" />
            <Circle cx={53.400} cy={27.200} r={1.100} fill="#ff7a2e" />
            <Path d="M46 15.600 q2.600 -2.400 5 0 q-2 1.400 -2.200 3" stroke="#d9a21a" strokeWidth={1.100} fill="none" strokeLinecap="round" />
          </G>
        )}
      </G>
      {look.id === 'luffy' && (
        <G>
          <Path d="M24.600 19 q-0.600 -6 2.400 -8.800 l3 2.600 q-3.600 2.200 -4 7.200z" fill="#1c1a1a" />
          <Ellipse cx={37} cy={12} rx={21} ry={5} fill="#e8c25a" />
          <Ellipse cx={37} cy={12.800} rx={21} ry={4.200} fill="#c79a38" opacity={0.35} />
          <Path d="M26 12 q0 -11.500 11 -11.500 q11 0 11 11.500z" fill="#f0cf6a" />
          <Rect x={26} y={7.600} width={22} height={3.800} fill={look.accent} />
          <Path d="M20 11 q17 4.500 34 0" stroke="#a97f27" strokeWidth={0.900} fill="none" />
        </G>
      )}
      {look.id === 'sanji' && (
        <G>
          <Path d="M24.500 19 q-1 -14 12.500 -14 q13 0 12.500 14 q-3 -5.500 -9 -5.500 q-5.500 0 -8 8 q-3.500 0 -8 -2.500z" fill="#f6d365" />
          <Path d="M30 14 q7 -2.500 9.500 3.500 q1 5.500 -3 8 q-1 -6 -6.500 -11.500z" fill="#efc24d" />
        </G>
      )}
      {look.id === 'zoro' && (
        <Path d="M24.500 19 l0.800 -9 l4 3.800 l3 -7.400 l4 5 l4 -6.400 l3.200 6.200 l5 -2.400 l-0.600 10 q-3 -5.500 -12.500 -5.500 q-9.500 0 -10.900 5.700z" fill="#58b560" />
      )}
      {look.id === 'jinbe' && (
        <G>
          <Path d="M36 8 l4.400 -9.200 l4.400 9.200z" fill="#527fb3" />
          <Path d="M24.500 18 q1 -11 12.500 -11 q11.500 0 12.500 11 q-6 -6.500 -12.500 -6.500 q-6.500 0 -12.500 6.500z" fill="#1b2a4a" />
        </G>
      )}
    </G>
  );
}

function CharacterSprite(props: Props): JSX.Element {
  const { color, size, pose, phase, facing } = props;
  const look = LOOKS[color] ?? LOOKS.red;
  const id = look.id;
  const rig = computeRig(pose, phase);
  const shoulderDx = look.id === 'jinbe' ? 14.500 : 12;
  const sleeveFor = look.id === 'luffy' ? look.accent : look.id === 'sanji' ? look.top : look.id === 'zoro' ? look.top : look.skin;
  const longSleeve = look.id === 'sanji' || look.id === 'zoro';
  const width = size * 0.74;
  const squash = `translate(37 94) scale(${rig.sx.toFixed(3)} ${rig.sy.toFixed(3)}) translate(-37 -94)`;
  return (
    <Svg width={width} height={size} viewBox="0 0 74 100" style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id={`cs-${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
          <Stop offset="0.55" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.24} />
        </LinearGradient>
        <RadialGradient id={`cs-${id}-skin`} cx="0.4" cy="0.35" r="0.75">
          <Stop offset="0" stopColor={look.skin} />
          <Stop offset="1" stopColor={look.skinDark} />
        </RadialGradient>
      </Defs>
      <G transform={`translate(37 0) scale(${facing} 1) translate(-37 0)`}>
        <Ellipse cx={37} cy={95.500} rx={19 * rig.shadow} ry={4.200 * rig.shadow} fill="#000" opacity={0.28} />
        <Ellipse cx={37} cy={95.500} rx={17 * rig.shadow} ry={3.400 * rig.shadow} fill="none" stroke={look.accent} strokeWidth={1.800} opacity={0.95} />
        <G transform={`${squash} translate(0 ${rig.bob.toFixed(2)})`}>
          <Leg x={32} y={58} a={rig.thighL} k={rig.kneeL} look={look} />
          <Leg x={42} y={58} a={rig.thighR} k={rig.kneeR} look={look} />
          {(look.id === 'luffy' || look.id === 'jinbe') && (
            <Path
              d={look.id === 'luffy' ? 'M26 55 h22 l1.500 9.500 h-10.500 l-2 -4.500 l-2 4.500 h-10.500z' : 'M25 56 h24 l1.500 9 h-10.500 l-2.500 -4 l-2.500 4 h-10.500z'}
              fill={look.id === 'luffy' ? '#2b4f9e' : '#22345f'}
            />
          )}
          <G transform={`translate(37 58) rotate(${rig.lean.toFixed(2)}) translate(-37 -58)`}>
            <Arm x={37 - shoulderDx} y={34} a={rig.armL} e={rig.elbowL} look={look} sleeve={sleeveFor} longSleeve={longSleeve} />
            <TorsoView look={look} id={id} />
            {look.id === 'zoro' && (
              <G>
                <Path d="M32 53 L12 66" stroke="#f1efe6" strokeWidth={2.600} strokeLinecap="round" />
                <Path d="M32 56 L13 70" stroke="#23242b" strokeWidth={2.600} strokeLinecap="round" />
                <Path d="M32 59 L15 73" stroke="#f1efe6" strokeWidth={2.600} strokeLinecap="round" />
                <Circle cx={33} cy={56} r={2.200} fill="#e8c25a" />
              </G>
            )}
            <HeadView look={look} rig={rig} id={id} />
            <Arm x={37 + shoulderDx} y={34} a={rig.armR} e={rig.elbowR} look={look} sleeve={sleeveFor} longSleeve={longSleeve} />
          </G>
        </G>
      </G>
    </Svg>
  );
}

export default React.memo(CharacterSprite);
