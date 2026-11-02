import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { playerColors, fonts, radius, space, type } from '../theme';
import type { Palette } from '../theme';
import { Card, useTheme } from '../components/ui';

type RuleCard = { id: string; title: string; text: string; label: string; art: (p: Palette) => React.ReactNode };

const VB_W = 288;
const VB_H = 112;

function starPoints(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.3, 0.26], [0.7, 0.26], [0.3, 0.5], [0.7, 0.5], [0.3, 0.74], [0.7, 0.74]],
};

function DiceArt({ x, y, size, value, p }: { x: number; y: number; size: number; value: number; p: Palette }) {
  return (
    <G>
      <Rect x={x + 2} y={y + 3} width={size} height={size} rx={size * 0.22} fill="rgba(5,12,22,0.35)" />
      <Rect x={x} y={y} width={size} height={size} rx={size * 0.22} fill={p.surface} stroke={p.ink} strokeWidth={2} />
      {PIPS[value].map(([px, py], i) => (
        <Circle key={i} cx={x + px * size} cy={y + py * size} r={size * 0.075} fill={p.ink} />
      ))}
    </G>
  );
}

function PawnArt({ cx, cy, color, s = 1, opacity = 1 }: { cx: number; cy: number; color: string; s?: number; opacity?: number }) {
  return (
    <G opacity={opacity}>
      <Ellipse cx={cx + 2 * s} cy={cy + 11 * s} rx={11 * s} ry={3.5 * s} fill="rgba(5,12,22,0.4)" />
      <Path
        d={`M${cx - 10 * s} ${cy + 10 * s} Q${cx - 8 * s} ${cy - 3 * s} ${cx} ${cy - 3 * s} Q${cx + 8 * s} ${cy - 3 * s} ${cx + 10 * s} ${cy + 10 * s} Z`}
        fill={color}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={1.5}
      />
      <Circle cx={cx} cy={cy - 9 * s} r={7.5 * s} fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
      <Circle cx={cx - 2.5 * s} cy={cy - 11.5 * s} r={2.2 * s} fill="#FFFFFF" opacity={0.55} />
    </G>
  );
}

function CellArt({ x, y, w = 40, h = 40, fill, stroke }: { x: number; y: number; w?: number; h?: number; fill: string; stroke: string }) {
  return <Rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={2} />;
}

function ArrowArt({ x1, x2, y, color }: { x1: number; x2: number; y: number; color: string }) {
  return (
    <G>
      <Path d={`M${x1} ${y} L${x2 - 6} ${y}`} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Polygon points={`${x2},${y} ${x2 - 10},${y - 7} ${x2 - 10},${y + 7}`} fill={color} />
    </G>
  );
}

function BadgeX({ cx, cy, p }: { cx: number; cy: number; p: Palette }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={11} fill={p.danger} />
      <Path d={`M${cx - 4.5} ${cy - 4.5} L${cx + 4.5} ${cy + 4.5} M${cx + 4.5} ${cy - 4.5} L${cx - 4.5} ${cy + 4.5}`} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
    </G>
  );
}

function NestArt({ x, y, w, h, color, pawns }: { x: number; y: number; w: number; h: number; color: string; pawns: number }) {
  const spots: Array<[number, number]> = [
    [x + w * 0.3, y + h * 0.3], [x + w * 0.7, y + h * 0.3], [x + w * 0.3, y + h * 0.7], [x + w * 0.7, y + h * 0.7],
  ];
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={14} fill={color} opacity={0.28} />
      <Rect x={x} y={y} width={w} height={h} rx={14} fill="none" stroke={color} strokeWidth={2} />
      {spots.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={8} fill={i < pawns ? color : 'rgba(5,12,22,0.25)'} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
      ))}
    </G>
  );
}

const CARDS: RuleCard[] = [
  {
    id: 'exit',
    title: 'Salir con un 5',
    label: 'Una casa roja, dos dados con un 5 y un 2, y una flecha hacia la casilla de salida con una ficha',
    text: 'Tiras dos dados. Tus fichas esperan en casa y solo un 5 saca una ficha (en uno de los dados, o si suman 5). Esa ficha sale a tu casilla de salida usando solo ese 5; el otro dado sigue libre para mover. Si ya tienes dos fichas tuyas allí, forman barrera y no puedes sacar otra.',
    art: (p) => (
      <>
        <NestArt x={12} y={20} w={72} h={72} color={playerColors.red} pawns={3} />
        <DiceArt x={96} y={24} size={34} value={5} p={p} />
        <DiceArt x={96} y={64} size={26} value={2} p={p} />
        <ArrowArt x1={140} x2={184} y={57} color={p.ink} />
        <CellArt x={196} y={38} w={44} h={44} fill={p.accent} stroke={p.ink} />
        <PawnArt cx={218} cy={64} color={playerColors.red} />
      </>
    ),
  },
  {
    id: 'safe',
    title: 'Casillas seguras',
    label: 'Una fila de casillas; la central dorada con estrella protege a una ficha azul de una roja que se acerca',
    text: 'Las casillas con estrella son un refugio: ahí nadie puede ser capturado. Tu casilla de salida también es segura. Descansa en ellas cuando un rival te pise los talones.',
    art: (p) => (
      <>
        {[20, 72, 124, 176, 228].map((x, i) => (
          <CellArt key={x} x={x} y={52} fill={i === 2 || i === 4 ? p.accent : p.surface} stroke={i === 2 || i === 4 ? p.ink : p.line} />
        ))}
        <Polygon points={starPoints(248, 72, 12, 5)} fill={p.ink} opacity={0.85} />
        <Polygon points={starPoints(144, 90, 6, 2.5)} fill={p.ink} opacity={0.0} />
        <PawnArt cx={144} cy={76} color={playerColors.blue} />
        <PawnArt cx={40} cy={76} color={playerColors.red} />
        <Path d="M40 46 Q92 0 136 38" stroke={p.ink} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" fill="none" />
        <BadgeX cx={150} cy={22} p={p} />
      </>
    ),
  },
  {
    id: 'capture',
    title: 'Mover con dos dados',
    label: 'Una ficha roja cae sobre una azul que sale despedida en arco hacia su casa, con un más veinte',
    text: 'Con fichas ya fuera, al elegir una ficha avanza la suma de ambos dados; o usa cada dado por separado con dos fichas distintas. Si caes en una casilla normal ocupada por un rival, su ficha vuelve a casa y tú avanzas 20 casillas extra. Si no hay movimiento posible para el bonus, se pierde.',
    art: (p) => (
      <>
        {[16, 64, 112, 160].map((x) => (
          <CellArt key={x} x={x} y={62} fill={p.surface} stroke={p.line} />
        ))}
        <PawnArt cx={84} cy={88} color={playerColors.red} />
        <ArrowArt x1={108} x2={150} y={82} color={p.inkMuted} />
        <PawnArt cx={180} cy={88} color={playerColors.blue} />
        <NestArt x={216} y={46} w={56} h={56} color={playerColors.blue} pawns={2} />
        <Path d="M184 54 Q204 0 243 46" stroke={playerColors.blue} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" fill="none" />
        <SvgText x={84} y={36} fontSize={24} fontWeight="bold" fontFamily={fonts.display} fill={p.accent} textAnchor="middle">+20</SvgText>
      </>
    ),
  },
  {
    id: 'barrier',
    title: 'Barreras',
    label: 'Dos fichas verdes juntas en una casilla bloquean a una ficha roja que intenta pasar por encima',
    text: 'Dos fichas del mismo color en una casilla forman una barrera. Nadie puede pasarla, ni rivales ni tú. Hay que esperar a que se abra para seguir avanzando.',
    art: (p) => (
      <>
        {[16, 64, 112, 160, 208].map((x) => (
          <CellArt key={x} x={x} y={62} fill={p.surface} stroke={p.line} />
        ))}
        <PawnArt cx={36} cy={88} color={playerColors.red} />
        <PawnArt cx={122} cy={90} color={playerColors.green} s={0.9} />
        <PawnArt cx={142} cy={86} color={playerColors.green} s={0.9} />
        <PawnArt cx={228} cy={88} color={playerColors.red} opacity={0.35} />
        <Path d="M36 56 Q132 -6 228 56" stroke={p.ink} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" fill="none" />
        <BadgeX cx={132} cy={24} p={p} />
      </>
    ),
  },
  {
    id: 'goal',
    title: 'Llegar a la meta',
    label: 'Una ficha avanza por el pasillo de su color hasta el centro de la meta, con un más diez',
    text: 'Tras dar la vuelta entras en tu pasillo de color. Para pisar la meta la tirada debe ser exacta; si te pasas, esa ficha no se mueve. Cada ficha en meta da 10 casillas extra. Gana quien meta las cuatro.',
    art: (p) => (
      <>
        {[16, 58, 100, 142].map((x) => (
          <CellArt key={x} x={x} y={42} w={36} h={36} fill={playerColors.red} stroke={p.ink} />
        ))}
        <G opacity={0.4}>
          {[16, 58, 100, 142].map((x) => (
            <Rect key={x} x={x} y={42} width={36} height={36} rx={8} fill={p.surface} />
          ))}
        </G>
        <PawnArt cx={160} cy={66} color={playerColors.red} />
        <ArrowArt x1={186} x2={204} y={60} color={p.ink} />
        <Polygon points="232,60 208,36 256,36" fill={playerColors.yellow} />
        <Polygon points="232,60 256,36 256,84" fill={playerColors.green} />
        <Polygon points="232,60 256,84 208,84" fill={playerColors.blue} />
        <Polygon points="232,60 208,84 208,36" fill={playerColors.red} />
        <Rect x={208} y={36} width={48} height={48} rx={8} fill="none" stroke={p.ink} strokeWidth={2} />
        <Circle cx={232} cy={60} r={7} fill={p.accent} stroke={p.ink} strokeWidth={2} />
        <SvgText x={232} y={26} fontSize={22} fontWeight="bold" fontFamily={fonts.display} fill={p.accent} textAnchor="middle">+10</SvgText>
        <SvgText x={90} y={102} fontSize={12} fontWeight="600" fill={p.inkMuted} textAnchor="middle">Tirada exacta</SvgText>
      </>
    ),
  },
  {
    id: 'sixes',
    title: 'Dobles y turnos',
    label: 'Tres dobles seguidos; el tercero tachado y una ficha roja que vuelve a su casa',
    text: 'Sacar dobles (los dos dados iguales) te da otra tirada. Tres dobles seguidos mandan a casa la última ficha movida, salvo que ya esté en el pasillo o en la meta. Si no puedes mover, el turno pasa solo.',
    art: (p) => (
      <>
        <DiceArt x={16} y={36} size={40} value={6} p={p} />
        <DiceArt x={66} y={36} size={40} value={6} p={p} />
        <DiceArt x={116} y={36} size={40} value={6} p={p} />
        <BadgeX cx={152} cy={36} p={p} />
        <ArrowArt x1={172} x2={206} y={58} color={p.ink} />
        <NestArt x={214} y={32} w={58} h={58} color={playerColors.red} pawns={4} />
      </>
    ),
  },
];

export default function RulesScreen(): JSX.Element {
  const { p, s } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && winWidth >= 1024;
  const st = useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingHorizontal: isDesktop ? space[5] : space[4],
          paddingTop: isDesktop ? space[5] : space[4],
          paddingBottom: space[6],
          gap: space[4],
          width: '100%',
          maxWidth: isDesktop ? 1200 : 560,
          alignSelf: 'center',
        },
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4], width: '100%' },
        gridItem: { flexGrow: 1, flexShrink: 1, flexBasis: 320, minWidth: 280 },
        header: { gap: space[1], marginBottom: space[1] },
        art: { backgroundColor: p.surfaceHi, borderRadius: radius.input, overflow: 'hidden', marginBottom: space[3] },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[2] },
        badge: { width: 32, height: 32, borderRadius: radius.chip, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
        badgeText: { ...type.sm, fontWeight: '800', color: p.accentInk, fontFamily: fonts.display },
        cardTitle: { ...type.lg, color: p.ink, fontFamily: fonts.display, flex: 1 },
      }),
    [p, isDesktop],
  );

  const cards = CARDS.map((c, i) => (
    <Card key={c.id}>
      <View style={st.art} accessible accessibilityRole="image" accessibilityLabel={c.label}>
        <Svg width="100%" height={VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
          {c.art(p)}
        </Svg>
      </View>
      <View style={st.titleRow}>
        <View style={st.badge}>
          <Text style={st.badgeText}>{i + 1}</Text>
        </View>
        <Text style={st.cardTitle} accessibilityRole="header">{c.title}</Text>
      </View>
      <Text style={s.body}>{c.text}</Text>
    </Card>
  ));

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <Text style={s.title} accessibilityRole="header">Reglas</Text>
          <Text style={s.muted}>Parchís español en seis cartas. Se leen en un minuto.</Text>
        </View>
        {isDesktop ? (
          <View style={st.grid}>
            {CARDS.map((c, i) => (
              <View key={c.id} style={st.gridItem}>
                {cards[i]}
              </View>
            ))}
          </View>
        ) : (
          cards
        )}
      </ScrollView>
    </View>
  );
}
