// Speech bubbles over the pieces: random pirate slang when a character feels like it, and
// reactions to what happens on the board (setting sail, a capture, reaching the lighthouse).
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Color, EmoteId } from '../types';
import * as Speech from 'expo-speech';
import { hues } from '../art';

export type TalkKind = 'chatter' | 'exit' | 'goal' | 'brag' | 'ouch' | 'gasp' | 'turn';

const COMMON = [
  '¡Arrr!',
  '¡Al abordaje!',
  '¡Por mil barriles de ron!',
  '¡Que me aspen!',
  '¡Viento en popa!',
  '¡Rayos y centellas!',
  '¡A toda vela!',
  '¡Izad las velas!',
  '¡Tierra a la vista!',
  '¡Rumbo al faro, grumetes!',
  '¡Ni un doblón para ti!',
  '¡Esta tripulación no se rinde!',
  '¡Huelo a tesoro!',
  '¡Arriad el foque!',
  '¡Por las barbas de Neptuno!',
];

const FLAVOR: Record<Color, string[]> = {
  red: ['¡Seré el rey de este tablero!', '¡Tengo hambre… de fichas!', '¡Jajaja, qué divertido!', '¡Nadie deja atrás a su tripulación!'],
  yellow: ['¡Esta jugada está para chuparse los dedos!', '¡Te serviré de entrante!', '¡Una patada y al agua!', 'Mmm, ¿huele a pescado frito?'],
  green: ['Tres espadas, cero piedad.', '¿Hacia dónde quedaba el faro?', 'Hmph. Aburrido.', 'Despiértame cuando me toque.'],
  blue: ['¡El mar está de mi lado!', 'Paciencia, como la marea.', '¡Ola gigante en camino!', 'Un buen pirata no corre: navega.'],
};

const LINES: Record<Exclude<TalkKind, 'chatter'>, string[]> = {
  exit: ['¡Zarpamos!', '¡Leven anclas!', '¡A la mar!', '¡Soltad amarras!'],
  goal: ['¡Tesoro asegurado!', '¡Llegué al faro!', '¡Esto huele a oro!', '¡A salvo en puerto!'],
  brag: ['¡A la tabla, marinero!', '¡Al fondo del mar contigo!', '¡Toma ya, grumete!', '¡Abordado!', '¡Fuera de mi barco!'],
  ouch: ['¡Me las pagarás!', '¡Rayos! ¡Otra vez al nido!', '¡Volveré, bribón!', '¡Esto no queda así!'],
  gasp: ['¡Uuuh!', '¡Eso dolió!', '¡Cuidado, que muerde!', '¡Qué abordaje!'],
  turn: ['¡Mi turno!', '¡Dadme esos dados!', '¡Ahora verás!', '¡Allá voy!'],
};

export const EMOTE_LINE: Record<EmoteId, string> = {
  gomu: '¡Gomu!',
  laugh: '¡Jajaja!',
  cry: '¡Buaaa!',
  nakama: '¡Nakama!',
  king: '¡Seré el rey!',
  gg: '¡Buena partida!',
};

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function lineFor(kind: TalkKind, color: Color): string {
  if (kind === 'chatter') return Math.random() < 0.45 ? pick(FLAVOR[color]) : pick(COMMON);
  return pick(LINES[kind]);
}

// Each character's voice: the pitch and pace the phone's speech voice reads their lines with.
const VOICE: Record<Color, { pitch: number; rate: number }> = {
  red: { pitch: 1.35, rate: 1.08 },
  yellow: { pitch: 1.0, rate: 0.98 },
  green: { pitch: 0.72, rate: 0.9 },
  blue: { pitch: 0.6, rate: 0.85 },
};

let speaking = false;
let lastSpoke = 0;

function soundOn(): boolean {
  const g = globalThis as { REMIX_SOUND_ON?: boolean; REMIX_SFX_MUTED?: boolean };
  return g.REMIX_SOUND_ON !== false && g.REMIX_SFX_MUTED !== true;
}

/**
 * Says a line out loud in the character's voice. A loud line (a capture, an emote, the
 * lighthouse) cuts in; idle chatter waits its turn and never piles up. Never throws.
 */
export function speakLine(text: string, color: Color, loud: boolean): void {
  if (!soundOn()) return;
  const now = Date.now();
  if (!loud && (speaking || now - lastSpoke < 3500)) return;
  try {
    if (loud && speaking) Speech.stop();
    speaking = true;
    lastSpoke = now;
    const v = VOICE[color];
    const done = () => {
      speaking = false;
    };
    Speech.speak(text.replace(/[¡!¿?…]/g, (c) => (c === '…' ? '...' : c)), {
      language: 'es-ES',
      pitch: v.pitch,
      rate: v.rate,
      volume: loud ? 1 : 0.85,
      onDone: done,
      onStopped: done,
      onError: done,
    });
    // a voice that never reports back must not silence the crew for good
    setTimeout(done, 4500);
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
