import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { EmoteId, PlayerCardProps } from '../types';
import { CHARACTERS } from '../types';
import { colors, fonts, makeStyles, motion, playerColors, radius, space, type, HIT } from '../theme';
import CharacterEmblem from './CharacterEmblem';

const EMOTE_TEXT: Record<EmoteId, string> = {
  gomu: '¡Gomu Gomu!',
  laugh: '¡Jajaja!',
  cry: 'Buaaa…',
  nakama: '¡Nakama!',
  king: '¡Rey de los Piratas!',
  gg: 'GG',
};

type Tone = 'muted' | 'success' | 'warning' | 'accent';

export default function PlayerCard(props: PlayerCardProps): JSX.Element {
  const { seat, state, isMe, isTurn, compact = false, piecesHome, emote, onKick } = props;
  const scheme = useColorScheme();
  const p = scheme === 'light' ? colors.light : colors.dark;
  const base = useMemo(() => makeStyles(p), [p]);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(v);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const character = CHARACTERS[seat.color];
  const hue = playerColors[seat.color];
  const empty = seat.playerId === null && !seat.isBot;
  const inLobby = state.phase === 'lobby';
  const playing = state.phase === 'rolling' || state.phase === 'moving';
  const showTurn = isTurn && playing;

  const ring = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(ring);
    if (!showTurn) {
      ring.value = withTiming(0, { duration: motion.fast });
    } else if (reduceMotion) {
      ring.value = withTiming(1, { duration: motion.fast });
    } else {
      ring.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })),
        -1,
        false,
      );
    }
    return () => cancelAnimation(ring);
  }, [showTurn, reduceMotion, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

  const displayName = empty ? 'Asiento libre' : seat.name || character.name;

  let status: { label: string; tone: Tone };
  if (empty) status = { label: 'Libre', tone: 'muted' };
  else if (!seat.isBot && !seat.connected) status = { label: 'Desconectado', tone: 'warning' };
  else if (showTurn) status = { label: isMe ? 'Tu turno' : 'Su turno', tone: 'accent' };
  else if (state.phase === 'over' && state.winner === seat.color) status = { label: 'Ganador', tone: 'success' };
  else if (seat.isBot) status = { label: 'Bot', tone: 'muted' };
  else if (inLobby) status = seat.ready ? { label: 'Listo', tone: 'success' } : { label: 'Esperando', tone: 'muted' };
  else status = { label: 'En juego', tone: 'muted' };

  const toneColor = status.tone === 'success' ? p.success : status.tone === 'warning' ? p.warning : status.tone === 'accent' ? p.accent : p.inkMuted;
  const isHostSeat = inLobby && seat.color === 'red' && !seat.isBot && !empty;

  const portrait = compact ? 40 : 56;
  const pip = 12;

  const st = useMemo(
    () =>
      StyleSheet.create({
        wrap: { zIndex: 1 },
        card: { padding: compact ? space[3] : space[4], flexDirection: 'row', alignItems: 'center', gap: space[3], opacity: empty ? 0.75 : 1 },
        ring: {
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          borderRadius: radius.card + 3,
          borderWidth: 2,
          borderColor: p.accent,
          shadowColor: p.accent,
          shadowOpacity: 0.9,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        },
        portrait: {
          width: portrait,
          height: portrait,
          borderRadius: portrait / 2,
          borderWidth: 2,
          borderColor: hue,
          overflow: 'hidden',
          backgroundColor: p.surfaceHi,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: empty ? 0.45 : 1,
        },
        info: { flex: 1, flexShrink: 1, gap: 2 },
        name: { ...(compact ? type.sm : type.md), fontWeight: '800', color: p.ink, fontFamily: fonts.display },
        sub: { ...type.xs, color: p.inkMuted, fontFamily: fonts.body },
        statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2], marginTop: 2 },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: toneColor },
        statusText: { ...type.xs, fontWeight: '700', color: toneColor, fontFamily: fonts.body },
        hostPill: { borderRadius: radius.chip, borderWidth: 1, borderColor: p.accent, paddingHorizontal: space[2], paddingVertical: 2 },
        hostText: { ...type.xs, color: p.accent, fontWeight: '700', fontFamily: fonts.body },
        right: { alignItems: 'flex-end', gap: space[1] },
        pips: { flexDirection: 'row', gap: space[1] },
        pip: { width: pip, height: pip, borderRadius: pip / 2, borderWidth: 1.5, borderColor: hue },
        pipOn: { backgroundColor: hue },
        kick: { width: HIT, height: HIT, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
        kickPressed: { backgroundColor: p.accentSoft },
        kickText: { fontSize: 24, lineHeight: 28, fontWeight: '600', color: p.danger },
        bubble: {
          position: 'absolute',
          top: -space[4],
          right: space[2],
          zIndex: 5,
          backgroundColor: p.ink,
          borderRadius: radius.card,
          paddingHorizontal: space[3],
          paddingVertical: space[1],
          borderWidth: 2,
          borderColor: hue,
        },
        bubbleText: { ...type.sm, fontWeight: '800', color: p.bg, fontFamily: fonts.display },
      }),
    [p, compact, empty, portrait, hue, toneColor],
  );

  const a11y = empty
    ? `${character.name}, asiento libre`
    : `${displayName}, ${character.name}${isMe ? ', tú' : ''}, ${status.label}, ${piecesHome} de 4 fichas en meta`;

  return (
    <View style={st.wrap} accessible accessibilityLabel={a11y}>
      <Animated.View pointerEvents="none" style={[st.ring, ringStyle]} />
      <View style={[base.card, st.card]}>
        <View style={st.portrait}>
          <CharacterEmblem color={seat.color} size={portrait - 4} variant="portrait" />
        </View>

        <View style={st.info}>
          <Text style={st.name}>{displayName}</Text>
          <Text style={st.sub}>
            {character.name}
            {isMe ? ' · Tú' : ''}
            {!compact && !empty ? ` · ${character.title}` : ''}
          </Text>
          <View style={st.statusRow}>
            <View style={st.dot} />
            <Text style={st.statusText}>{status.label}</Text>
            {isHostSeat ? (
              <View style={st.hostPill}>
                <Text style={st.hostText}>Anfitrión</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={st.right}>
          {onKick && !empty && !isMe ? (
            <Pressable
              onPress={onKick}
              accessibilityRole="button"
              accessibilityLabel={`Expulsar a ${displayName}`}
              hitSlop={space[1]}
              style={({ pressed }) => [st.kick, pressed && st.kickPressed]}
            >
              <Text style={st.kickText}>×</Text>
            </Pressable>
          ) : null}
          {!empty && !inLobby ? (
            <>
              <View style={st.pips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[st.pip, i < piecesHome && st.pipOn]} />
                ))}
              </View>
              {!compact ? <Text style={st.sub}>{piecesHome}/4 en meta</Text> : null}
            </>
          ) : null}
        </View>
      </View>

      {emote ? (
        <Animated.View
          key={emote}
          pointerEvents="none"
          entering={reduceMotion ? FadeIn.duration(motion.fast) : ZoomIn.duration(motion.base)}
          exiting={FadeOut.duration(motion.fast)}
          style={st.bubble}
        >
          <Text style={st.bubbleText}>{EMOTE_TEXT[emote]}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
