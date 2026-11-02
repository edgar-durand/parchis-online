import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CHARACTERS, COLORS, GOAL } from '../types';
import type { Color, ResultScreenProps } from '../types';
import { fonts, HIT, radius, space, playerColors } from '../theme';
import { ranking } from '../engine/rules';
import CharacterEmblem from '../components/CharacterEmblem';
import { Button, Card, Toast, useTheme } from '../components/ui';
import SeaBackdrop from '../components/SeaBackdrop';
import { buildInviteLink } from '../net/links';
import { useProfile } from '../state/useProfile';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

const SAMPLE_RATE = 22050;
type Note = { f: number; at: number; dur: number };

const VICTORY_NOTES: Note[] = [
  { f: 523.25, at: 0, dur: 0.16 },
  { f: 659.25, at: 0.14, dur: 0.16 },
  { f: 783.99, at: 0.28, dur: 0.16 },
  { f: 1046.5, at: 0.42, dur: 0.5 },
  { f: 783.99, at: 0.42, dur: 0.5 },
];
const DEFEAT_NOTES: Note[] = [
  { f: 392, at: 0, dur: 0.22 },
  { f: 329.63, at: 0.2, dur: 0.22 },
  { f: 261.63, at: 0.4, dur: 0.22 },
  { f: 196, at: 0.6, dur: 0.5 },
];

function synth(notes: Note[]): Float32Array {
  const total = notes.reduce((m, n) => Math.max(m, n.at + n.dur), 0) + 0.1;
  const out = new Float32Array(Math.ceil(total * SAMPLE_RATE));
  for (const n of notes) {
    const start = Math.floor(n.at * SAMPLE_RATE);
    const len = Math.floor(n.dur * SAMPLE_RATE);
    for (let i = 0; i < len && start + i < out.length; i++) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.015);
      const decay = Math.pow(1 - i / len, 1.5);
      const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * n.f * t));
      const v = (Math.sin(2 * Math.PI * n.f * t) * 0.6 + tri * 0.4) * attack * decay * 0.28;
      out[start + i] += v;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i]));
  return out;
}

function toWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(samples[i] * 32767), true);
  return bytes;
}

type WebAudioCtx = {
  state: string;
  resume: () => Promise<void>;
  destination: unknown;
  createBuffer: (ch: number, len: number, rate: number) => { copyToChannel: (d: Float32Array, c: number) => void };
  createBufferSource: () => { buffer: unknown; connect: (d: unknown) => void; start: () => void };
};

async function playJingle(win: boolean): Promise<void> {
  try {
    const samples = synth(win ? VICTORY_NOTES : DEFEAT_NOTES);
    if (Platform.OS === 'web') {
      const g = globalThis as unknown as {
        AudioContext?: new () => WebAudioCtx;
        webkitAudioContext?: new () => WebAudioCtx;
      };
      const Ctor = g.AudioContext ?? g.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      if (ctx.state === 'suspended') await ctx.resume();
      const buf = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
      buf.copyToChannel(samples, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true });
    const file = new File(Paths.cache, win ? 'parchis-victoria.wav' : 'parchis-derrota.wav');
    file.write(toWav(samples));
    const player = createAudioPlayer({ uri: file.uri });
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already released
      }
    }, 3000);
  } catch {
    // audio is optional: the result screen works without it
  }
}

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

type WebNav = {
  share?: (data: { text?: string; title?: string }) => Promise<void>;
  clipboard?: { writeText?: (t: string) => Promise<void> };
};
type WebDoc = {
  createElement: (tag: string) => {
    value: string;
    style: Record<string, string>;
    setAttribute: (k: string, v: string) => void;
    focus: () => void;
    select: () => void;
  };
  body: { appendChild: (n: unknown) => void; removeChild: (n: unknown) => void };
  execCommand?: (cmd: string) => boolean;
};

async function copyTextWeb(text: string): Promise<boolean> {
  const g = globalThis as unknown as { navigator?: WebNav; document?: WebDoc };
  try {
    if (g.navigator?.clipboard?.writeText) {
      await g.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const doc = g.document;
    if (!doc || !doc.execCommand) return false;
    const area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    doc.body.appendChild(area);
    area.focus();
    area.select();
    const ok = doc.execCommand('copy');
    doc.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export default function ResultScreen({ state, myColor, isHost, onRematch, onExit }: ResultScreenProps) {
  const { p, s } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && winWidth >= 1024;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  // The match ended when this screen opened: freeze the duration instead of letting it grow.
  const [endedAt] = useState(() => Date.now());
  const profileHook = useProfile() as unknown as { profile?: { settings?: { sound?: boolean } } } | undefined;
  const soundOn = profileHook?.profile?.settings?.sound !== false;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!soundRef.current) return;
      void playJingle(myColor == null || myColor === (state.winner ?? myColor));
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [fade]);

  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const order: Color[] = useMemo(() => {
    const r = ranking(state);
    return r.length === COLORS.length ? r : [...COLORS];
  }, [state]);

  const winner: Color = state.winner ?? order[0];
  const seatOf = (c: Color) => state.seats.find((x) => x.color === c);
  const nameOf = (c: Color) => {
    const seat = seatOf(c);
    return seat && seat.name ? seat.name : CHARACTERS[c].name;
  };
  const homeOf = (c: Color) => state.pieces[c].filter((v) => v === GOAL).length;
  const capsOf = (c: Color) => state.captures[c] ?? 0;
  const durationSec = state.startedAt > 0 ? (endedAt - state.startedAt) / 1000 : 0;
  const character = CHARACTERS[winner];
  const iWon = myColor === winner;
  const hostName = state.seats[0]?.name || 'Anfitrión';

  const statsLine = `${homeOf(winner)}/4 fichas en meta · ${capsOf(winner)} ${capsOf(winner) === 1 ? 'captura' : 'capturas'} · ${formatDuration(durationSec)}`;

  const onShare = async () => {
    const message = `¡${character.name} (${nameOf(winner)}) ganó el Parchís pirata! ${statsLine}. ¿Te atreves a la revancha?\n${buildInviteLink(state.roomCode)}`;
    if (Platform.OS === 'web') {
      const nav = (globalThis as unknown as { navigator?: WebNav }).navigator;
      if (nav && typeof nav.share === 'function') {
        try {
          await nav.share({ title: 'Parchís pirata', text: message });
          showToast('Tarjeta compartida');
          return;
        } catch (e) {
          const name = (e as { name?: string } | null)?.name;
          if (name === 'AbortError') return;
          // otherwise fall back to copying
        }
      }
      const copied = await copyTextWeb(message);
      showToast(copied ? 'Tarjeta copiada' : 'No se pudo compartir ni copiar. Prueba de nuevo.');
      return;
    }
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) showToast('Tarjeta compartida');
    } catch {
      showToast('No se pudo abrir el menú de compartir. Prueba de nuevo.');
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 },
        scroll: {
          paddingHorizontal: space[4],
          paddingTop: space[4],
          paddingBottom: space[7],
          gap: space[4],
          flexGrow: 1,
          justifyContent: desktop ? 'center' : 'flex-start',
          width: '100%',
          maxWidth: desktop ? 1120 : undefined,
          alignSelf: 'center',
        },
        cols: desktop
          ? { flexDirection: 'row', alignItems: 'flex-start', gap: space[6] }
          : { gap: space[4] },
        colLeft: desktop ? { flex: 1 } : {},
        colRight: desktop ? { flex: 1, gap: space[4] } : { gap: space[4] },
        victory: { alignItems: 'center', gap: space[3], paddingVertical: space[2] },
        overline: { ...s.caption, letterSpacing: 2, textTransform: 'uppercase', color: p.accent, fontWeight: '800' },
        portraitRing: {
          padding: space[2],
          borderRadius: radius.sheet,
          borderWidth: 3,
          borderColor: playerColors[winner],
          backgroundColor: p.surfaceHi,
        },
        winnerName: { ...s.title, textAlign: 'center' },
        titleLine: { ...s.muted, textAlign: 'center' },
        statsRow: { flexDirection: 'row', alignSelf: 'stretch', gap: space[2], marginTop: space[2] },
        stat: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: space[3],
          borderRadius: radius.input,
          backgroundColor: p.accentSoft,
        },
        statValue: { ...s.heading, fontVariant: ['tabular-nums'] },
        statLabel: { ...s.caption, textAlign: 'center' },
        sectionTitle: { ...s.heading, marginBottom: space[2] },
        row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], minHeight: 56 },
        rowBorder: { borderBottomWidth: 1, borderBottomColor: p.line },
        pos: {
          width: HIT * 0.75,
          height: HIT * 0.75,
          borderRadius: radius.chip,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: p.surfaceHi,
        },
        posFirst: { backgroundColor: p.accent },
        posText: { fontFamily: fonts.display, fontSize: 16, lineHeight: 24, fontWeight: '800', color: p.ink },
        posTextFirst: { color: p.accentInk },
        rowText: { flex: 1, gap: 2 },
        rowName: { ...s.body, fontWeight: '700' },
        rowValue: { alignItems: 'flex-end' },
        rowHome: { ...s.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
        actions: { gap: space[3] },
        hint: { ...s.muted, textAlign: 'center' },
      }),
    [p, s, winner, desktop],
  );

  const stats: { value: string; label: string }[] = [
    { value: `${homeOf(winner)}/4`, label: 'Fichas en meta' },
    { value: String(capsOf(winner)), label: capsOf(winner) === 1 ? 'Captura' : 'Capturas' },
    { value: formatDuration(durationSec), label: 'Duración' },
  ];

  return (
    <SeaBackdrop>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.cols}>
          <View style={styles.colLeft}>
          <Animated.View style={{ opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
            <Card>
              <View style={styles.victory}>
                <Text style={styles.overline} accessibilityRole="header">
                  {iWon ? '¡Has ganado!' : 'Fin de la partida'}
                </Text>
                <View style={styles.portraitRing}>
                  <CharacterEmblem color={winner} size={128} variant="portrait" />
                </View>
                <Text style={styles.winnerName}>{character.name} ganó</Text>
                <Text style={styles.titleLine}>
                  {nameOf(winner)} · {character.title}
                </Text>
                <View style={styles.statsRow}>
                  {stats.map((st) => (
                    <View key={st.label} style={styles.stat} accessible accessibilityLabel={`${st.label}: ${st.value}`}>
                      <Text style={styles.statValue}>{st.value}</Text>
                      <Text style={styles.statLabel}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </Animated.View>
          </View>

          <View style={styles.colRight}>
          <Card>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Clasificación
            </Text>
            {order.map((c, i) => {
              const seat = seatOf(c);
              return (
                <View
                  key={c}
                  style={[styles.row, i < order.length - 1 ? styles.rowBorder : null]}
                  accessible
                  accessibilityLabel={`Puesto ${i + 1}: ${CHARACTERS[c].name}, ${nameOf(c)}, ${homeOf(c)} fichas en meta`}
                >
                  <View style={[styles.pos, i === 0 ? styles.posFirst : null]}>
                    <Text style={[styles.posText, i === 0 ? styles.posTextFirst : null]}>{i + 1}</Text>
                  </View>
                  <CharacterEmblem color={c} size={HIT} variant="badge" />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>
                      {nameOf(c)}
                      {c === myColor ? ' (tú)' : ''}
                    </Text>
                    <Text style={s.caption}>
                      {CHARACTERS[c].name}
                      {seat?.isBot ? ' · Bot' : ''} · {capsOf(c)} {capsOf(c) === 1 ? 'captura' : 'capturas'}
                    </Text>
                  </View>
                  <View style={styles.rowValue}>
                    <Text style={styles.rowHome}>{homeOf(c)}/4</Text>
                    <Text style={s.caption}>en meta</Text>
                  </View>
                </View>
              );
            })}
          </Card>

          <View style={styles.actions}>
            <Button label="Revancha" icon="refresh" onPress={onRematch} variant="primary" disabled={!isHost} />
            {!isHost ? <Text style={styles.hint}>Solo {hostName} puede iniciar la revancha.</Text> : null}
            <Button label="Compartir" icon="share-social-outline" onPress={onShare} variant="secondary" />
            <Button label="Salir" icon="exit-outline" onPress={onExit} variant="tertiary" />
          </View>
          </View>
          </View>
        </ScrollView>
        <Toast message={toast} />
      </SafeAreaView>
    </SeaBackdrop>
  );
}
