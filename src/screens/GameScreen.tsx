import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CHARACTERS, COLORS, GOAL } from '../types';
import type { Color, DieUse, EmoteId, GameScreenProps, LogEntry, Seat } from '../types';
import { motion, playerColors, radius, space, type as typeScale } from '../theme';
import Board from '../components/Board';
import * as boardEngine from '../engine/board';
import Dice from '../components/Dice';
import CharacterEmblem from '../components/CharacterEmblem';
import EmoteBar from '../components/EmoteBar';
import SeaBackdrop from '../components/SeaBackdrop';
import { Button, Chip, ConnectionBanner, IconButton, Toast, useTheme } from '../components/ui';

const BUBBLE_MS = 3000;
const TOAST_MS = 3500;
const ROLL_FAILSAFE_MS = 4000;
const RESERVED_HEIGHT = 330;
const DESKTOP_MIN_WIDTH = 1024;
const PANEL_WIDTH = 380;

type Bubble = { id: number; emote: EmoteId };

const EMOTE_TEXT: Record<EmoteId, string> = {
  gomu: '¡Gomu!',
  laugh: 'Jaja',
  cry: 'Buaa',
  nakama: 'Nakama',
  king: '¡Rey!',
  gg: 'GG',
};

function lastId(entries: { id: number }[]): number {
  return entries.reduce((m, e) => (e.id > m ? e.id : m), 0);
}

function shortName(name: string, fallback: string): string {
  const first = (name || fallback).trim().split(/\s+/)[0] || fallback;
  return first.length > 12 ? first.slice(0, 12) : first;
}

// ---------- Corner layout: where each colour's nest really sits ----------

type XY = { x: number; y: number };

function toXY(v: unknown): XY | null {
  if (Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number') {
    return { x: v[0], y: v[1] };
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.x === 'number' && typeof o.y === 'number') return { x: o.x, y: o.y };
    if (typeof o.col === 'number' && typeof o.row === 'number') return { x: o.col, y: o.row };
    if (typeof o.c === 'number' && typeof o.r === 'number') return { x: o.c, y: o.r };
  }
  return null;
}

function nestCenter(c: Color): XY | null {
  const fn = (boardEngine as unknown as { homeCoords?: (...a: unknown[]) => unknown }).homeCoords;
  if (typeof fn !== 'function') return null;
  try {
    const r = fn(c, 0);
    const single = toXY(r);
    if (single) return single;
    if (Array.isArray(r) && r.length > 0) {
      const pts = r.map(toXY).filter((q): q is XY => q !== null);
      if (pts.length === 0) return null;
      return {
        x: pts.reduce((s, q) => s + q.x, 0) / pts.length,
        y: pts.reduce((s, q) => s + q.y, 0) / pts.length,
      };
    }
  } catch {
    return null;
  }
  return null;
}

// Returns [bottom-left, top-left, top-right, bottom-right] colours as drawn on screen.
function cornerOrder(myColor: Color | null, fixed: boolean): Color[] {
  const baseIndex = myColor ? COLORS.indexOf(myColor) : 0;
  const fallback: Color[] = [0, 1, 2, 3].map((i) => COLORS[(baseIndex + i) % 4]);
  const centers = COLORS.map((c) => nestCenter(c));
  if (centers.some((q) => q === null)) return fallback;
  const pts = centers as XY[];
  const mx = pts.reduce((s, q) => s + q.x, 0) / 4;
  const my = pts.reduce((s, q) => s + q.y, 0) / 4;
  const quad = pts.map((q) => {
    const left = q.x < mx;
    const top = q.y < my;
    if (left) return top ? 1 : 0;
    return top ? 2 : 3;
  });
  if (new Set(quad).size !== 4) return fallback;
  const shift = !fixed && myColor ? (4 - quad[COLORS.indexOf(myColor)]) % 4 : 0;
  const out: Color[] = [COLORS[0], COLORS[0], COLORS[0], COLORS[0]];
  COLORS.forEach((c, i) => {
    out[(quad[i] + shift) % 4] = c;
  });
  return out;
}

// ---------- Sound effects (Web Audio, web only, unlocked by the first tap) ----------

interface AParam {
  value: number;
  setValueAtTime(v: number, t: number): void;
  exponentialRampToValueAtTime(v: number, t: number): void;
}
interface ANode {
  connect(n: unknown): void;
}
interface AOsc extends ANode {
  type: string;
  frequency: AParam;
  start(t: number): void;
  stop(t: number): void;
}
interface AGain extends ANode {
  gain: AParam;
}
interface ACtx {
  currentTime: number;
  destination: unknown;
  state: string;
  resume(): Promise<void>;
  createOscillator(): AOsc;
  createGain(): AGain;
}

type Sfx = 'dice' | 'turn' | 'emote' | 'win';

let audioCtx: ACtx | null = null;

function getCtx(): ACtx | null {
  if (Platform.OS !== 'web') return null;
  try {
    if (!audioCtx) {
      const g = globalThis as unknown as {
        AudioContext?: new () => ACtx;
        webkitAudioContext?: new () => ACtx;
      };
      const Ctor = g.AudioContext ?? g.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => undefined);
    return audioCtx;
  } catch {
    return null;
  }
}

function unlockAudio(): void {
  getCtx();
}

function tone(ctx: ACtx, f0: number, f1: number, at: number, dur: number, wave: string, vol: number): void {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function playSfx(kind: Sfx): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (kind === 'dice') {
      for (let i = 0; i < 7; i++) {
        tone(ctx, 220 + Math.random() * 420, 110, i * 0.07, 0.06, 'square', 0.05);
      }
    } else if (kind === 'turn') {
      tone(ctx, 660, 660, 0, 0.12, 'triangle', 0.08);
      tone(ctx, 880, 880, 0.12, 0.18, 'triangle', 0.08);
    } else if (kind === 'emote') {
      tone(ctx, 420, 780, 0, 0.14, 'sine', 0.09);
    } else {
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, f, i * 0.14, 0.3, 'triangle', 0.09));
    }
  } catch {
    // audio is optional: never break the game
  }
}


// ---------- Side panel pieces ----------

const LOG_ICON: Record<LogEntry['kind'], keyof typeof Ionicons.glyphMap> = {
  roll: 'cube-outline',
  move: 'footsteps-outline',
  capture: 'flash',
  goal: 'flag',
  exit: 'boat-outline',
  skip: 'play-skip-forward-outline',
  penalty: 'alert-circle-outline',
  info: 'information-circle-outline',
};

function LogRow({ e, latest, age, ink, muted }: { e: LogEntry; latest: boolean; age: number; ink: string; muted: string }) {
  const name = CHARACTERS[e.color].name;
  const rest = e.text.startsWith(name) ? e.text.slice(name.length) : null;
  const strong = e.kind === 'capture' || e.kind === 'goal';
  return (
    <View
      style={[
        panel.logRow,
        latest ? { backgroundColor: 'rgba(242,179,61,0.14)', borderColor: 'rgba(242,179,61,0.45)' } : null,
        { opacity: Math.max(0.5, 1 - age * 0.1) },
      ]}
    >
      <View style={[panel.logIcon, { backgroundColor: playerColors[e.color] }]}>
        <Ionicons name={LOG_ICON[e.kind] ?? 'ellipse'} size={13} color="#FFFFFF" />
      </View>
      <Text style={[panel.logText, { color: strong ? ink : latest ? ink : muted, fontWeight: strong || latest ? '700' : '500' }]} numberOfLines={2}>
        {rest !== null ? (
          <>
            <Text style={{ color: playerColors[e.color], fontWeight: '800' }}>{name}</Text>
            {rest}
          </>
        ) : (
          e.text
        )}
      </Text>
    </View>
  );
}

function Pips({ pieces, color }: { pieces: number[]; color: Color }) {
  return (
    <View style={panel.pips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((prog, i) => (
        <View
          key={i}
          style={[
            panel.pip,
            prog === GOAL
              ? { backgroundColor: playerColors[color], borderColor: playerColors[color] }
              : prog > 0
                ? { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: playerColors[color] }
                : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.28)' },
          ]}
        >
          {prog === GOAL ? <Ionicons name="star" size={8} color="#FFFFFF" /> : null}
        </View>
      ))}
    </View>
  );
}

export default function GameScreen(props: GameScreenProps): JSX.Element {
  const { state, myColor, legal, canRoll, status, settings, onRoll, onMove, onEmote: onEmoteProp, onLeave } = props;
  const onEmote = useCallback(
    (id: EmoteId) => {
      unlockAudio();
      onEmoteProp(id);
    },
    [onEmoteProp],
  );
  const { p } = useTheme();
  const { width, height } = useWindowDimensions();

  const [rolling, setRolling] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Partial<Record<Color, Bubble>>>({});
  const [useSel, setUseSel] = useState<DieUse | null>(null);

  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimers = useRef<Partial<Record<Color, ReturnType<typeof setTimeout>>>>({});
  const seenRollId = useRef<number>(-1);
  const seenToastId = useRef<number>(-1);
  const seenEmoteId = useRef<number>(-1);
  const soundOn = useRef<boolean>(true);
  soundOn.current = (settings as unknown as { sound?: boolean }).sound !== false;
  // the board's effects and the characters' voices read the same switch
  (globalThis as { REMIX_SOUND_ON?: boolean }).REMIX_SOUND_ON = soundOn.current;
  const play = useCallback((kind: Sfx) => {
    if (soundOn.current) playSfx(kind);
  }, []);
  const prevTurn = useRef<Color | null>(null);
  const prevPhase = useRef<string>(state.phase);

  const startRolling = useCallback((ms: number) => {
    setRolling(true);
    if (rollTimer.current) clearTimeout(rollTimer.current);
    rollTimer.current = setTimeout(() => setRolling(false), ms);
  }, []);

  // Roll animation for everyone when a new roll appears in the log.
  const latestRollId = useMemo(() => {
    let id = 0;
    for (const e of state.log) if (e.kind === 'roll' && e.id > id) id = e.id;
    return id;
  }, [state.log]);

  // A new roll resets the die choice.
  useEffect(() => {
    setUseSel(null);
  }, [latestRollId]);

  useEffect(() => {
    if (seenRollId.current === -1) {
      seenRollId.current = latestRollId;
      return;
    }
    if (latestRollId !== seenRollId.current) {
      seenRollId.current = latestRollId;
      startRolling(motion.dice);
      play('dice');
    }
  }, [latestRollId, startRolling, play]);

  // Toast for skipped turns and penalties.
  useEffect(() => {
    if (seenToastId.current === -1) {
      seenToastId.current = lastId(state.log);
      return;
    }
    const fresh = state.log.filter((e) => e.id > seenToastId.current);
    if (fresh.length === 0) return;
    seenToastId.current = lastId(state.log);
    const notable = [...fresh].reverse().find((e) => e.kind === 'skip' || e.kind === 'penalty');
    if (notable) {
      setToast(notable.text);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    }
  }, [state.log]);

  // Emote bubbles next to the seat chips.
  useEffect(() => {
    if (seenEmoteId.current === -1) {
      seenEmoteId.current = lastId(state.emotes);
      return;
    }
    const fresh = state.emotes.filter((e) => e.id > seenEmoteId.current);
    if (fresh.length === 0) return;
    seenEmoteId.current = lastId(state.emotes);
    play('emote');
    setBubbles((prev) => {
      const next = { ...prev };
      for (const e of fresh) next[e.color] = { id: e.id, emote: e.emote };
      return next;
    });
    for (const e of fresh) {
      const prevTimer = bubbleTimers.current[e.color];
      if (prevTimer) clearTimeout(prevTimer);
      bubbleTimers.current[e.color] = setTimeout(() => {
        setBubbles((prev) => {
          if (prev[e.color]?.id !== e.id) return prev;
          const next = { ...prev };
          delete next[e.color];
          return next;
        });
      }, BUBBLE_MS);
    }
  }, [state.emotes, play]);

  // Your-turn chime and victory fanfare.
  useEffect(() => {
    const before = prevTurn.current;
    prevTurn.current = state.turn;
    if (before !== null && before !== state.turn && myColor !== null && state.turn === myColor && state.phase !== 'over') {
      play('turn');
    }
  }, [state.turn, state.phase, myColor, play]);

  useEffect(() => {
    if (prevPhase.current !== 'over' && state.phase === 'over') play('win');
    prevPhase.current = state.phase;
  }, [state.phase, play]);

  useEffect(() => {
    const timers = bubbleTimers.current;
    return () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      (Object.keys(timers) as Color[]).forEach((c) => {
        const t = timers[c];
        if (t) clearTimeout(t);
      });
    };
  }, []);

  const handleRoll = useCallback(() => {
    unlockAudio();
    if (!canRoll || rolling) return;
    startRolling(ROLL_FAILSAFE_MS);
    onRoll();
  }, [canRoll, rolling, onRoll, startRolling]);

  const isMyTurn = myColor !== null && state.turn === myColor && state.phase !== 'over';
  const myLegal = isMyTurn && state.phase === 'moving' ? legal : [];

  // Which dice the next tap spends: both added, or one die on its own.
  const dl = state.diceLeft ?? { a: state.dice, b: null };
  const useOptions: DieUse[] = [];
  (['sum', 'a', 'b'] as DieUse[]).forEach((u) => {
    if (u === 'b' && dl.a !== null && dl.a === dl.b && useOptions.includes('a')) return;
    if (myLegal.some((m) => m.use === u)) useOptions.push(u);
  });
  const choosing = useOptions.length > 1;
  // A die was spent: forget the old choice so the next tap uses what is left.
  useEffect(() => {
    setUseSel(null);
  }, [dl.a, dl.b]);
  const activeUse: DieUse | null = useSel && useOptions.includes(useSel) ? useSel : useOptions[0] ?? null;
  const boardLegal = choosing && activeUse ? myLegal.filter((m) => m.use === activeUse) : myLegal;
  const useLabel = (u: DieUse): string =>
    u === 'sum' ? `Suma ${(dl.a ?? 0) + (dl.b ?? 0)}` : u === 'a' ? `Dado ${dl.a ?? ''}` : `Dado ${dl.b ?? ''}`;
  const handlePiece = (pieceIndex: number) => {
    unlockAudio();
    onMove(pieceIndex, choosing && activeUse ? activeUse : undefined);
  };

  const seatOf = (c: Color): Seat =>
    state.seats.find((s) => s.color === c) ?? state.seats[COLORS.indexOf(c)];
  const homeCount = (c: Color): number => state.pieces[c].filter((v) => v === GOAL).length;

  // Corner order: bottom-left (me), top-left, top-right, bottom-right (clockwise).
  const [bl, tl, tr, br] = cornerOrder(myColor, settings.fixedBoard);

  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
  const boardSize = isDesktop
    ? // the board takes the whole height it has (at least half the screen when it fits), the panel the rest
      Math.max(360, Math.min(height - space[3] * 2, width - PANEL_WIDTH - space[4] * 3))
    : Math.max(260, Math.min(width, height - RESERVED_HEIGHT));

  const turnSeat = seatOf(state.turn);
  const turnChar = CHARACTERS[state.turn];
  let hint: string;
  if (state.phase === 'over') {
    hint = 'Partida terminada';
  } else if (isMyTurn) {
    if (state.phase === 'rolling') hint = 'Tu turno: tira los dados';
    else if (myLegal.length > 0) {
      hint = state.pendingBonus > 0
        ? `Bonus de ${state.pendingBonus} casillas: toca una ficha`
        : choosing
          ? 'Elige dados y toca una ficha'
          : 'Toca una ficha que brilla';
    } else hint = 'Sin movimientos posibles';
  } else if (turnSeat && turnSeat.isBot) {
    hint = `${turnChar.name} (bot) está pensando…`;
  } else if (turnSeat && !turnSeat.connected) {
    hint = `${turnChar.name} sin conexión: jugará un bot`;
  } else {
    hint = `Turno de ${turnSeat?.name || turnChar.name}`;
  }

  const recent: LogEntry[] = state.log.slice(-(logOpen ? 6 : 1)).reverse();

  const renderChip = (c: Color, align: 'left' | 'right', wide?: boolean) => {
    const seat = seatOf(c);
    const isTurn = state.turn === c && state.phase !== 'over';
    const isMe = c === myColor;
    const emote = bubbles[c]?.emote ?? null;
    const name = shortName(seat?.name ?? '', CHARACTERS[c].name);
    const label = `${name}${isMe ? ' (tú)' : ''}${seat?.isBot ? ' bot' : ''}, ${homeCount(c)} de 4 fichas en meta${isTurn ? ', es su turno' : ''}`;
    return (
      <View
        key={c}
        style={[
          styles.chipWrap,
          { flexDirection: align === 'left' ? 'row' : 'row-reverse' },
          wide ? { maxWidth: '100%' } : null,
        ]}
      >
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={label}
          style={[
            styles.chip,
            {
              backgroundColor: p.surface,
              borderColor: isTurn ? playerColors[c] : p.line,
              borderWidth: isTurn ? 2 : 1,
              opacity: seat && !seat.connected && !seat.isBot ? 0.7 : 1,
            },
          ]}
        >
          <CharacterEmblem color={c} size={28} variant="badge" />
          <Text style={[styles.chipName, { color: p.ink, fontWeight: isTurn ? '700' : '500' }]}>
            {name}
          </Text>
          <View style={styles.chipGoal}>
            <Ionicons name="flag" size={12} color={playerColors[c]} />
            <Text style={[styles.chipCount, { color: p.ink }]}>{homeCount(c)}</Text>
          </View>
        </View>
        {emote ? (
          <View style={[styles.bubble, { backgroundColor: p.surface, borderColor: playerColors[c] }]}>
            <Text style={[styles.bubbleText, { color: p.ink }]}>{EMOTE_TEXT[emote]}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SeaBackdrop>
      <View style={styles.root}>
        <ConnectionBanner status={status} />
        {isDesktop ? (
          <View style={styles.deskRoot}>
            <View style={styles.deskInner}>
              <View style={{ width: boardSize, height: boardSize }}>
                <Board
                  state={state}
                  myColor={myColor}
                  legal={boardLegal}
                  fixedView={settings.fixedBoard}
                  onPiece={handlePiece}
                  size={boardSize}
                />
              </View>
              <ScrollView
                style={{ width: PANEL_WIDTH, maxHeight: boardSize }}
                contentContainerStyle={styles.deskPanel}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.deskHeader}>
                  <IconButton icon="exit-outline" label="Salir de la partida" variant="secondary" onPress={() => setConfirmLeave(true)} />
                  <View
                    style={[
                      panel.turn,
                      { borderColor: playerColors[state.turn], backgroundColor: p.surface, shadowColor: playerColors[state.turn] },
                    ]}
                  >
                    <View style={[panel.turnPortrait, { borderColor: playerColors[state.turn] }]}>
                      <CharacterEmblem color={state.turn} size={46} variant="badge" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[panel.overline, { color: playerColors[state.turn] }]}>
                        {state.phase === 'over' ? 'FIN DE LA PARTIDA' : isMyTurn ? 'TU TURNO' : `TURNO DE ${turnChar.name.toUpperCase()}`}
                      </Text>
                      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[panel.turnHint, { color: p.ink }]}>
                        {hint}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[panel.card, { backgroundColor: p.surface, borderColor: p.line }]}>
                  <Text style={[panel.cardTitle, { color: p.inkMuted }]}>TRIPULACIÓN</Text>
                  {COLORS.map((c) => {
                    const seat = seatOf(c);
                    const isTurn = state.turn === c && state.phase !== 'over';
                    const isMe = c === myColor;
                    const emote = bubbles[c]?.emote ?? null;
                    const offline = !!seat && !seat.connected && !seat.isBot;
                    return (
                      <View
                        key={c}
                        accessible
                        accessibilityLabel={`${shortName(seat?.name ?? '', CHARACTERS[c].name)}${isMe ? ' (tú)' : ''}, ${CHARACTERS[c].name}, ${homeCount(c)} de 4 en el faro, ${state.captures[c] ?? 0} capturas${isTurn ? ', es su turno' : ''}`}
                        style={[
                          panel.crewRow,
                          isTurn ? { backgroundColor: p.surfaceHi, borderColor: playerColors[c] } : { borderColor: 'transparent' },
                          offline ? { opacity: 0.6 } : null,
                        ]}
                      >
                        <View style={[panel.turnBar, { backgroundColor: isTurn ? playerColors[c] : 'transparent' }]} />
                        <CharacterEmblem color={c} size={38} variant="badge" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={panel.nameLine}>
                            <Text style={[panel.crewName, { color: p.ink }]} numberOfLines={1}>
                              {shortName(seat?.name ?? '', CHARACTERS[c].name)}
                            </Text>
                            {isMe ? <Text style={[panel.tag, { color: p.accentInk, backgroundColor: p.accent }]}>TÚ</Text> : null}
                            {seat?.isBot ? <Text style={[panel.tag, { color: p.ink, backgroundColor: p.line }]}>BOT</Text> : null}
                            {offline ? <Ionicons name="cloud-offline-outline" size={14} color={p.warning} /> : null}
                          </View>
                          <Text style={[panel.crewSub, { color: p.inkMuted }]} numberOfLines={1}>
                            {emote ? EMOTE_TEXT[emote] : CHARACTERS[c].name}
                          </Text>
                        </View>
                        <View style={panel.crewStats}>
                          <Pips pieces={state.pieces[c]} color={c} />
                          <View style={panel.caps}>
                            <Ionicons name="flash" size={12} color={p.accent} />
                            <Text style={[panel.capsText, { color: p.ink }]}>{state.captures[c] ?? 0}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={[panel.card, panel.diceCard, { backgroundColor: p.surface, borderColor: canRoll && !rolling ? p.accent : p.line }]}>
                  <Text style={[panel.cardTitle, { color: p.inkMuted, alignSelf: 'stretch' }]}>
                    {isMyTurn ? 'TUS DADOS' : `DADOS DE ${turnChar.name.toUpperCase()}`}
                  </Text>
                  <Dice
                    value={state.dice}
                    value2={state.dice2 ?? null}
                    enabled={canRoll && !rolling}
                    rolling={rolling}
                    color={state.turn}
                    onRoll={handleRoll}
                  />
                  {choosing ? (
                    <View style={panel.useRow} accessibilityLabel="Elige qué dados usar">
                      {useOptions.map((u) => (
                        <Chip key={u} label={useLabel(u)} selected={u === activeUse} onPress={() => setUseSel(u)} />
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={[panel.card, { backgroundColor: p.surface, borderColor: p.line }]}>
                  <Text style={[panel.cardTitle, { color: p.inkMuted }]}>GRITOS DE GUERRA</Text>
                  <EmoteBar onEmote={onEmote} disabled={myColor === null || status === 'offline'} />
                </View>

                <View style={[panel.card, { backgroundColor: p.surface, borderColor: p.line }]} accessibilityLabel="Bitácora de la partida">
                  <Text style={[panel.cardTitle, { color: p.inkMuted }]}>BITÁCORA</Text>
                  {state.log.length === 0 ? (
                    <Text style={[styles.logText, { color: p.inkMuted }]}>La partida acaba de empezar.</Text>
                  ) : (
                    state.log
                      .slice(-6)
                      .reverse()
                      .map((e, i) => <LogRow key={e.id} e={e} latest={i === 0} age={i} ink={p.ink} muted={p.inkMuted} />)
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <IconButton icon="exit-outline" label="Salir de la partida" variant="secondary" onPress={() => setConfirmLeave(true)} />
            <View style={styles.headerMid}>
              <View style={[styles.turnPill, { backgroundColor: p.surface, borderColor: playerColors[state.turn] }]}>
                <View style={[styles.dot, { backgroundColor: playerColors[state.turn] }]} />
                <Text
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                  style={[styles.hint, { color: p.ink }]}
                >
                  {hint}
                </Text>
              </View>
            </View>
            <IconButton
              icon={logOpen ? 'chevron-up-outline' : 'list-outline'}
              label={logOpen ? 'Ocultar registro' : 'Ver registro de eventos'}
              variant="secondary"
              onPress={() => setLogOpen((v) => !v)}
            />
          </View>

          <View style={[styles.chipsRow, { width: boardSize }]}>
            {renderChip(tl, 'left')}
            {renderChip(tr, 'right')}
          </View>

          <View style={{ width: boardSize, height: boardSize }}>
            <Board
              state={state}
              myColor={myColor}
              legal={boardLegal}
              fixedView={settings.fixedBoard}
              onPiece={handlePiece}
              size={boardSize}
            />
          </View>

          <View style={[styles.chipsRow, { width: boardSize }]}>
            {renderChip(bl, 'left')}
            {renderChip(br, 'right')}
          </View>

          <View style={styles.diceRow}>
            <Dice
              value={state.dice}
              value2={state.dice2 ?? null}
              enabled={canRoll && !rolling}
              rolling={rolling}
              color={state.turn}
              onRoll={handleRoll}
            />
            {choosing ? (
              <View style={styles.useCol} accessibilityLabel="Elige qué dados usar">
                {useOptions.map((u) => (
                  <Chip key={u} label={useLabel(u)} selected={u === activeUse} onPress={() => setUseSel(u)} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ width: Math.min(boardSize, width - space[4] * 2) }}>
            <EmoteBar onEmote={onEmote} disabled={myColor === null || status === 'offline'} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={logOpen ? 'Ocultar registro de eventos' : 'Mostrar registro de eventos'}
            onPress={() => setLogOpen((v) => !v)}
            style={({ pressed }) => [
              styles.log,
              {
                width: Math.min(boardSize, width - space[4] * 2),
                backgroundColor: p.surface,
                borderColor: p.line,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {recent.length === 0 ? (
              <Text style={[styles.logText, { color: p.inkMuted }]}>La partida acaba de empezar.</Text>
            ) : (
              recent.map((e, i) => <LogRow key={e.id} e={e} latest={i === 0} age={i} ink={p.ink} muted={p.inkMuted} />)
            )}
          </Pressable>
        </ScrollView>
        )}

        <Toast message={toast} />

        {confirmLeave ? (
          <View style={[styles.overlay, { backgroundColor: p.overlay }]}>
            <View style={[styles.dialog, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text accessibilityRole="header" style={[styles.dialogTitle, { color: p.ink }]}>¿Salir de la partida?</Text>
              <Text style={[styles.dialogLine, { color: p.inkMuted }]}>
                Un bot jugará por ti y no podrás volver a tu asiento.
              </Text>
              <View style={styles.dialogActions}>
                <View style={styles.dialogBtn}>
                  <Button label="Seguir jugando" variant="secondary" onPress={() => setConfirmLeave(false)} />
                </View>
                <View style={styles.dialogBtn}>
                  <Button
                    label="Salir"
                    variant="danger"
                    onPress={() => {
                      setConfirmLeave(false);
                      onLeave();
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </SeaBackdrop>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  deskRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space[3], paddingHorizontal: space[4] },
  deskInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    alignSelf: 'center',
  },
  deskPanel: { gap: space[3] },
  deskHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  deskPill: { flex: 1 },
  deskChips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[2] },
  deskChipCell: { width: '50%', paddingRight: space[1] },
  deskCard: { borderRadius: radius.card, borderWidth: 1, padding: space[3] },
  scroll: { flexGrow: 1, alignItems: 'center', paddingTop: space[1], paddingBottom: space[3], gap: space[1] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    alignSelf: 'stretch',
    paddingHorizontal: space[2],
  },
  headerMid: { flex: 1, alignItems: 'center' },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 40,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.chip,
    borderWidth: 2,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  hint: { ...typeScale.sm, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[2],
  },
  chipWrap: { alignItems: 'center', gap: space[1], flexShrink: 1, maxWidth: '50%' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    minHeight: 36,
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: radius.chip,
    flexShrink: 1,
  },
  chipName: { ...typeScale.sm, flexShrink: 1 },
  chipGoal: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  chipCount: { ...typeScale.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bubble: {
    borderRadius: radius.chip,
    borderWidth: 2,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
  bubbleText: { ...typeScale.sm, fontWeight: '700' },
  diceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[3], paddingVertical: space[1] },
  useCol: { gap: space[1] },
  log: { borderRadius: radius.card, borderWidth: 1, paddingVertical: space[2], paddingHorizontal: space[3], gap: space[1], minHeight: 36 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logText: { ...typeScale.sm, flexShrink: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[4],
  },
  dialog: { width: '100%', maxWidth: 400, borderRadius: radius.sheet, borderWidth: 1, padding: space[5], gap: space[3] },
  dialogTitle: { ...typeScale.lg },
  dialogLine: { ...typeScale.sm },
  dialogActions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  dialogBtn: { flex: 1 },
});

const panel = StyleSheet.create({
  turn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderWidth: 2,
    borderRadius: radius.card,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  turnPortrait: { borderWidth: 2, borderRadius: 999, padding: 2 },
  overline: { ...typeScale.xs, fontWeight: '900', letterSpacing: 1.2 },
  turnHint: { ...typeScale.md, fontWeight: '800' },
  card: { borderRadius: radius.card, borderWidth: 1, padding: space[3], gap: space[2] },
  cardTitle: { ...typeScale.xs, fontWeight: '900', letterSpacing: 1.4 },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: space[1] + 2,
    paddingRight: space[2],
    overflow: 'hidden',
  },
  turnBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  crewName: { ...typeScale.md, fontWeight: '800', flexShrink: 1 },
  crewSub: { ...typeScale.xs },
  tag: { ...typeScale.xs, fontSize: 10, lineHeight: 14, fontWeight: '900', paddingHorizontal: 6, borderRadius: 999, overflow: 'hidden' },
  crewStats: { alignItems: 'flex-end', gap: 4 },
  pips: { flexDirection: 'row', gap: 4 },
  pip: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  caps: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  capsText: { ...typeScale.xs, fontWeight: '800', fontVariant: ['tabular-nums'] },
  diceCard: { alignItems: 'center' },
  useRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[1] },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: 5,
    paddingHorizontal: space[2],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  logIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logText: { ...typeScale.sm, flexShrink: 1 },
});
