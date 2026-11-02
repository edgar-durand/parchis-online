import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { EmoteBarProps, EmoteId } from '../types';
import { HIT, radius, space } from '../theme';
import { useTheme } from './ui';

const COOLDOWN_MS = 3000;
const TICK_MS = 100;

type Note = [number, number];

const EMOTE_NOTES: Record<EmoteId, Note[]> = {
  gomu: [[330, 0.08], [494, 0.08], [660, 0.16]],
  laugh: [[523, 0.07], [659, 0.07], [523, 0.07], [659, 0.07]],
  cry: [[440, 0.14], [392, 0.14], [330, 0.2]],
  nakama: [[392, 0.12], [523, 0.12], [659, 0.2]],
  king: [[262, 0.1], [330, 0.1], [392, 0.1], [523, 0.28]],
  gg: [[587, 0.1], [784, 0.18]],
};

const SAMPLE_RATE = 22050;
const wavFiles: Partial<Record<EmoteId, File>> = {};
let webCtx: AudioContext | null = null;
let nativeModeSet = false;

function soundEnabled(): boolean {
  return (globalThis as { REMIX_SOUND_ON?: boolean }).REMIX_SOUND_ON !== false;
}

function buildWav(notes: Note[]): Uint8Array {
  const total = notes.reduce((n, [, d]) => n + Math.floor(d * SAMPLE_RATE), 0);
  const bytes = new Uint8Array(44 + total * 2);
  const view = new DataView(bytes.buffer);
  const str = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) view.setUint8(o + i, t.charCodeAt(i));
  };
  str(0, 'RIFF');
  view.setUint32(4, 36 + total * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, total * 2, true);
  let pos = 44;
  for (const [freq, dur] of notes) {
    const n = Math.floor(dur * SAMPLE_RATE);
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.min(1, i / 120) * Math.exp(-3 * (i / n));
      const v = Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;
      view.setInt16(pos, Math.round(v * env * 0.6 * 32767), true);
      pos += 2;
    }
  }
  return bytes;
}

function playEmoteSound(id: EmoteId): void {
  if (!soundEnabled()) return;
  const notes = EMOTE_NOTES[id];
  try {
    if (Platform.OS === 'web') {
      const Ctor =
        (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!webCtx) webCtx = new Ctor();
      const ctx = webCtx;
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
      let t = ctx.currentTime;
      for (const [freq, dur] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur;
      }
      return;
    }
    if (!nativeModeSet) {
      nativeModeSet = true;
      void Promise.resolve(setAudioModeAsync({ playsInSilentMode: true })).catch(() => undefined);
    }
    let file = wavFiles[id];
    if (!file) {
      file = new File(Paths.cache, `emote-${id}.wav`);
      file.write(buildWav(notes));
      wavFiles[id] = file;
    }
    const player = createAudioPlayer({ uri: file.uri });
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already released
      }
    }, 2000);
  } catch {
    // sound is optional: the game keeps going without it
  }
}

const EMOTES: { id: EmoteId; short: string; full: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'gomu', short: 'Gomu', full: '¡Gomu Gomu!', icon: 'hand-right' },
  { id: 'laugh', short: 'Jaja', full: 'Risa', icon: 'happy' },
  { id: 'cry', short: 'Buaa', full: 'Llanto', icon: 'sad' },
  { id: 'nakama', short: 'Nakama', full: '¡Nakama!', icon: 'people' },
  { id: 'king', short: 'Rey', full: '¡Rey de los Piratas!', icon: 'trophy' },
  { id: 'gg', short: 'GG', full: 'GG', icon: 'thumbs-up' },
];

export default function EmoteBar({ onEmote, disabled }: EmoteBarProps): JSX.Element {
  const { p, s } = useTheme();
  const lastSent = useRef(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const left = COOLDOWN_MS - (Date.now() - lastSent.current);
      setRemaining(left > 0 ? left : 0);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [remaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    (id: EmoteId) => {
      const now = Date.now();
      if (disabled || now - lastSent.current < COOLDOWN_MS) return;
      lastSent.current = now;
      setRemaining(COOLDOWN_MS);
      if (Platform.OS !== 'web') {
        try {
          const result = Haptics.selectionAsync() as Promise<void> | undefined;
          if (result && typeof result.catch === 'function') result.catch(() => undefined);
        } catch {
          // haptics not available here
        }
      }
      playEmoteSound(id);
      onEmote(id);
    },
    [disabled, onEmote],
  );

  const cooling = remaining > 0;
  const off = disabled || cooling;
  const fill = Math.max(0, Math.min(1, 1 - remaining / COOLDOWN_MS));

  return (
    <View accessibilityRole="toolbar" accessibilityLabel="Emotes de los personajes">
      <View style={local.row}>
        {EMOTES.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => send(e.id)}
            disabled={off}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={e.full}
            accessibilityState={{ disabled: off }}
            style={({ pressed }) => [
              s.chip,
              local.chip,
              pressed && s.chipPressed,
              pressed && { transform: [{ scale: 0.97 }] },
              off && local.off,
            ]}
          >
            <Ionicons name={e.icon} size={16} color={p.accent} />
            <Text style={[s.chipLabel, local.label]} numberOfLines={1} allowFontScaling={false}>
              {e.short}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        style={[local.track, { backgroundColor: p.line }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={[
            local.fill,
            { backgroundColor: p.accent, width: `${(cooling ? fill : 1) * 100}%`, opacity: cooling ? 1 : 0 },
          ]}
        />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[1] },
  chip: { flexBasis: '31%', flexGrow: 1, minWidth: 84, height: HIT, paddingHorizontal: space[2], borderRadius: 12 },
  label: { textAlign: 'center' },
  off: { opacity: 0.45 },
  track: { height: 3, borderRadius: radius.chip, marginTop: space[2], overflow: 'hidden' },
  fill: { height: 3, borderRadius: radius.chip },
});
