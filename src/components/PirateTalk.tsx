// Speech bubbles over the pieces: random pirate slang when a character feels like it, and
// reactions to what happens on the board (setting sail, a capture, reaching the lighthouse).
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Color, EmoteId } from '../types';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { VOICE_TEXT, voiceUrl } from '../voices';
import { hues } from '../art';

export type TalkKind = 'chatter' | 'exit' | 'goal' | 'brag' | 'ouch' | 'turn';
type Kind = TalkKind | EmoteId;

export type Line = { text: string; clip: string };

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** A random line of this kind in this character's own words, with its acted clip. */
export function lineFor(kind: TalkKind, color: Color): Line {
  const list = VOICE_TEXT[color][kind] as readonly string[];
  const i = Math.floor(Math.random() * list.length);
  return { text: list[i], clip: `${color}:${kind}${i}` };
}

/** What a character shouts for an emote. */
export function emoteLine(emote: EmoteId, color: Color): Line {
  return { text: VOICE_TEXT[color][emote], clip: `${color}:${emote}` };
}

let speaking = false;
let lastSpoke = 0;
let current: { stop(): void } | null = null;
let modeSet = false;

function soundOn(): boolean {
  const g = globalThis as { REMIX_SOUND_ON?: boolean; REMIX_SFX_MUTED?: boolean };
  return g.REMIX_SOUND_ON !== false && g.REMIX_SFX_MUTED !== true;
}

// Web: Web Audio, unlocked by the player's first tap (a browser plays a clip a timer starts only
// through an AudioContext that a gesture has resumed — an <audio> element stays silent).
type Ctx = {
  state: string;
  currentTime: number;
  destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(b: ArrayBuffer): Promise<unknown>;
  createBufferSource(): { buffer: unknown; connect(n: unknown): void; start(t?: number): void; stop(): void; onended: (() => void) | null };
  createGain(): { gain: { value: number }; connect(n: unknown): void };
};
let ctx: Ctx | null = null;
const buffers = new Map<string, Promise<unknown>>();

function webCtx(): Ctx | null {
  if (ctx) return ctx;
  const g = globalThis as unknown as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx; document?: { addEventListener(n: string, f: () => void, o?: unknown): void } };
  const C = g.AudioContext ?? g.webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  const unlock = () => { void ctx?.resume().catch(() => undefined); };
  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((n) => g.document?.addEventListener(n, unlock, { passive: true }));
  return ctx;
}

if (Platform.OS === 'web') webCtx();

function bufferFor(c: Ctx, key: string): Promise<unknown> {
  let b = buffers.get(key);
  if (!b) {
    b = fetch(voiceUrl(key)).then((r) => r.arrayBuffer()).then((a) => c.decodeAudioData(a));
    b.catch(() => buffers.delete(key));
    buffers.set(key, b);
  }
  return b;
}

function playClip(key: string, loud: boolean, done: () => void): boolean {
  if (Platform.OS === 'web') {
    const c = webCtx();
    if (!c) return false;
    if (c.state === 'suspended') void c.resume().catch(() => undefined);
    let src: ReturnType<Ctx['createBufferSource']> | null = null;
    let stopped = false;
    void bufferFor(c, key)
      .then((buf) => {
        if (stopped) return;
        src = c.createBufferSource();
        src.buffer = buf;
        const g = c.createGain();
        g.gain.value = loud ? 1 : 0.85;
        src.connect(g);
        g.connect(c.destination);
        src.onended = done;
        src.start();
      })
      .catch(done);
    current = { stop: () => { stopped = true; try { src?.stop(); } catch { /* ended */ } done(); } };
    return true;
  }
  if (!modeSet) {
    modeSet = true;
    void Promise.resolve(setAudioModeAsync({ playsInSilentMode: true })).catch(() => undefined);
  }
  const player = createAudioPlayer({ uri: url });
  player.volume = loud ? 1 : 0.85;
  player.play();
  const release = () => {
    try { player.remove(); } catch { /* released */ }
    done();
  };
  const t = setTimeout(release, 6000);
  current = { stop: () => { clearTimeout(t); release(); } };
  return true;
}

/**
 * Says a line out loud with the character's acted voice. A loud line (a capture, an emote, the
 * lighthouse) cuts in; idle chatter waits its turn and never piles up. Never throws.
 */
export function speakLine(line: Line, loud: boolean): void {
  if (!soundOn()) return;
  const now = Date.now();
  if (!loud && (speaking || now - lastSpoke < 3000)) return;
  try {
    if (loud && speaking) current?.stop();
    speaking = true;
    lastSpoke = now;
    const done = () => { speaking = false; };
    if (!playClip(line.clip, loud, done)) speaking = false;
    setTimeout(done, 5000);
  } catch {
    speaking = false;
  }
}

export type Talk = { id: number; key: string; color: Color; text: string; loud: boolean };

/** One bubble, anchored above (x, y) on the board and kept inside it. */
export function TalkBubble({ talk, x, y, board }: { talk: Talk; x: number; y: number; board: number }) {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 220 }),
      withTiming(1, { duration: 1 }),
    );
  }, [pop, talk.id]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ translateY: (1 - pop.value) * 10 }, { scale: 0.6 + 0.4 * pop.value }],
  }));
  const fontSize = Math.max(11, Math.min(15, board * 0.017)) * (talk.loud ? 1.15 : 1);
  const maxW = Math.max(120, board * 0.28);
  // keep the bubble on the board: it may slide sideways, its tail stays on the speaker
  const left = Math.max(4, Math.min(board - maxW - 4, x - maxW / 2));
  const tail = Math.max(14, Math.min(maxW - 14, x - left));
  const tint = hues[talk.color];
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { left, top: y, width: maxW, transformOrigin: `${tail}px 100%` }, style]}
    >
      <View style={styles.anchor}>
        <View
          style={[
            styles.bubble,
            { borderColor: talk.loud ? tint.shade : '#3A2A12', backgroundColor: talk.loud ? '#FFF6D8' : '#FFFDF6' },
          ]}
        >
          <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.25, color: talk.loud ? tint.shade : '#2A1E12' }]}>
            {talk.text}
          </Text>
        </View>
        <View style={[styles.tail, { left: tail - 7, borderTopColor: talk.loud ? tint.shade : '#3A2A12' }]} />
        <View style={[styles.tailIn, { left: tail - 5, borderTopColor: talk.loud ? '#FFF6D8' : '#FFFDF6' }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  anchor: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  bubble: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    alignSelf: 'center',
  },
  text: { fontWeight: '800', textAlign: 'center' },
  tail: {
    position: 'absolute',
    bottom: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tailIn: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export const TALK_EASE = Easing.out(Easing.quad);
