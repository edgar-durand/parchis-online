import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CharacterEmblem from './CharacterEmblem';
import { useTheme } from './ui';
import { playerColors, playerColorsDark } from '../theme';
import { CHARACTERS } from '../types';
import type { Color, EmoteId, SeatChipProps } from '../types';

const FALLBACK: Record<Color, string> = {
  red: '#D64545',
  yellow: '#E0A526',
  green: '#2E9E5B',
  blue: '#2F6FD6',
};

const EMOTE_TEXT: Record<EmoteId, string> = {
  gomu: 'Gomu Gomu!',
  laugh: 'Jajaja',
  cry: 'Buaaa',
  nakama: 'Nakama',
  king: 'Rey pirata',
  gg: 'GG',
};

function seatColor(scheme: string | null | undefined, color: Color): string {
  const table = (scheme === 'dark' ? playerColorsDark : playerColors) as unknown as Record<string, unknown>;
  const v = table[color];
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const main = o.main ?? o.base ?? o.fill ?? o.color;
    if (typeof main === 'string') return main;
  }
  return FALLBACK[color];
}

function shortName(name: string, color: Color): string {
  const base = (name || '').trim().split(/\s+/)[0] || CHARACTERS[color].name;
  return base.length > 10 ? base.slice(0, 10) : base;
}

export default function SeatChip({ seat, isMe, isTurn, piecesHome, emote }: SeatChipProps): JSX.Element {
  const theme = useTheme();
  const p = theme.p as unknown as Record<string, string>;
  const scheme = useColorScheme();
  const tint = seatColor(scheme, seat.color);
  const surface = p.surface ?? (scheme === 'dark' ? '#1C2430' : '#FFFFFF');
  const ink = p.ink ?? (scheme === 'dark' ? '#F2EEE4' : '#1B2430');
  const muted = p.muted ?? p.mutedInk ?? (scheme === 'dark' ? '#B5BDC9' : '#55606E');
  const line = p.line ?? (scheme === 'dark' ? '#33404F' : '#D9D3C5');

  const name = shortName(seat.name, seat.color);
  const offline = !seat.isBot && seat.playerId !== null && !seat.connected;
  const label = `${name}${isMe ? ' (tú)' : ''}, ${piecesHome} de 4 fichas en meta${isTurn ? ', es su turno' : ''}${offline ? ', sin conexión' : ''}`;

  return (
    <View style={styles.wrap} accessible accessibilityRole="text" accessibilityLabel={label}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: surface,
            borderColor: isTurn ? tint : line,
            borderWidth: isTurn ? 2 : 1,
            opacity: offline ? 0.6 : 1,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <CharacterEmblem color={seat.color} size={24} variant="badge" />
        </View>
        <View style={styles.texts}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: ink }]} allowFontScaling>
              {name}
            </Text>
            {isMe ? <Text style={[styles.me, { color: muted }]}>tú</Text> : null}
            {seat.isBot ? <Feather name="cpu" size={12} color={muted} /> : null}
          </View>
          <View style={styles.goalRow}>
            <Feather name="flag" size={12} color={tint} />
            <Text style={[styles.goal, { color: muted }]}>{piecesHome}/4</Text>
            {isTurn ? <Feather name="chevrons-left" size={12} color={tint} /> : null}
          </View>
        </View>
      </View>
      {emote ? (
        <View style={[styles.bubble, { backgroundColor: tint }]} pointerEvents="none">
          <Text style={styles.bubbleText}>{EMOTE_TEXT[emote]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', zIndex: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 16,
    minHeight: 36,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { gap: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  me: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goal: { fontSize: 12, fontWeight: '500', lineHeight: 16, fontVariant: ['tabular-nums'] },
  bubble: {
    position: 'absolute',
    top: '100%',
    left: 8,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', lineHeight: 16 },
});
