// Sound effects manager built on howler.
// No audio files: every effect is synthesised once into a small WAV data URI,
// then played through howler. Nothing here ever throws.
// @ts-ignore howler may ship without bundled types in this project
import { Howl, Howler } from 'howler';

export type SfxName = 'step' | 'dice' | 'exit' | 'capture' | 'goal' | 'win' | 'lose' | 'turn' | 'emote';

interface HowlLike {
  play: () => number;
  rate: (r: number, id?: number) => unknown;
  volume: (v: number, id?: number) => unknown;
  stop: () => unknown;
  once: (ev: string, fn: () => void) => unknown;
}

const SR = 22050;
const TWO_PI = Math.PI * 2;

type Wave = 'sine' | 'square' | 'triangle' | 'saw';

function wave(kind: Wave, phase: number): number {
  const x = phase % TWO_PI;
  switch (kind) {
    case 'square':
      return x < Math.PI ? 1 : -1;
    case 'triangle':
      return 1 - Math.abs(((x / TWO_PI) * 4) - 2) + 0;
    case 'saw':
      return x / Math.PI - 1;
    default:
      return Math.sin(x);
  }
}

function makeBuffer(seconds: number): Float32Array {
  return new Float32Array(Math.max(1, Math.floor(seconds * SR)));
}

function addTone(
  buf: Float32Array,
  start: number,
  dur: number,
  f0: number,
  f1: number,
  kind: Wave,
  vol: number,
  decayPow = 2,
): void {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx >= buf.length) break;
    const p = i / n;
    const f = f0 + (f1 - f0) * p;
    phase += (TWO_PI * f) / SR;
    const attack = Math.min(1, i / (0.004 * SR));
    const env = attack * Math.pow(1 - p, decayPow);
    buf[idx] += wave(kind, phase) * env * vol;
  }
}

function addNoise(
  buf: Float32Array,
  start: number,
  dur: number,
  vol: number,
  smooth: number,
  decayPow = 2,
): void {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx >= buf.length) break;
    const p = i / n;
    y += smooth * ((Math.random() * 2 - 1) - y);
    const attack = Math.min(1, i / (0.002 * SR));
    buf[idx] += y * attack * Math.pow(1 - p, decayPow) * vol;
  }
}

const NOTE: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5,
  Eb4: 311.13, Ab4: 415.3, Bb4: 466.16, Eb5: 622.25, G3: 196.0, C3: 130.81,
};

function buildStep(): Float32Array {
  const b = makeBuffer(0.12);
  addTone(b, 0, 0.1, 150, 62, 'sine', 0.9, 2.5);
  addNoise(b, 0, 0.05, 0.35, 0.35, 3);
  addNoise(b, 0.0, 0.03, 0.18, 0.9, 3);
  return b;
}

function buildDice(): Float32Array {
  const b = makeBuffer(0.75);
  let t = 0;
  let gap = 0.045;
  while (t < 0.62) {
    addNoise(b, t, 0.03, 0.55, 0.7, 3);
    addTone(b, t, 0.025, 900 + Math.random() * 900, 400, 'triangle', 0.18, 3);
    t += gap * (0.8 + Math.random() * 0.5);
    gap *= 1.11;
  }
  addNoise(b, 0.64, 0.08, 0.5, 0.5, 2);
  addTone(b, 0.64, 0.08, 220, 120, 'sine', 0.5, 2);
  return b;
}

function buildExit(): Float32Array {
  const b = makeBuffer(0.42);
  addTone(b, 0, 0.3, 280, 880, 'triangle', 0.5, 1.4);
  addTone(b, 0.1, 0.3, 560, 1760, 'sine', 0.22, 1.8);
  addTone(b, 0.26, 0.14, NOTE.E6, NOTE.E6, 'sine', 0.22, 2);
  addNoise(b, 0, 0.12, 0.12, 0.25, 2);
  return b;
}

function buildCapture(): Float32Array {
  const b = makeBuffer(0.6);
  addNoise(b, 0, 0.22, 0.75, 0.55, 2.2);
  addTone(b, 0, 0.12, 190, 60, 'sine', 0.95, 2);
  addTone(b, 0.05, 0.5, 520, 70, 'square', 0.22, 1.6);
  addTone(b, 0.12, 0.35, 900, 200, 'saw', 0.08, 2);
  return b;
}

function melody(buf: Float32Array, notes: [string, number, number][], vol: number): void {
  for (const [name, start, dur] of notes) {
    const f = NOTE[name] ?? 440;
    addTone(buf, start, dur, f, f, 'triangle', vol, 1.6);
    addTone(buf, start, dur, f * 2, f * 2, 'sine', vol * 0.35, 2);
  }
}

function buildGoal(): Float32Array {
  const b = makeBuffer(0.75);
  melody(b, [['C5', 0, 0.16], ['E5', 0.1, 0.16], ['G5', 0.2, 0.18], ['C6', 0.32, 0.4]], 0.4);
  addNoise(b, 0.32, 0.25, 0.05, 0.15, 2);
  return b;
}

function buildWin(): Float32Array {
  const b = makeBuffer(1.7);
  melody(
    b,
    [
      ['C5', 0, 0.18], ['C5', 0.2, 0.18], ['C5', 0.4, 0.18], ['G4', 0.6, 0.3],
      ['Bb4', 0.95, 0.18], ['C5', 1.15, 0.5],
    ],
    0.42,
  );
  melody(b, [['C4', 0.6, 0.3], ['E4', 1.15, 0.5], ['G4', 1.15, 0.5]], 0.25);
  addNoise(b, 1.15, 0.4, 0.06, 0.12, 2);
  return b;
}

function buildLose(): Float32Array {
  const b = makeBuffer(1.0);
  melody(b, [['G4', 0, 0.25], ['Eb4', 0.25, 0.25], ['C4', 0.5, 0.45]], 0.4);
  addTone(b, 0.5, 0.45, NOTE.C3, NOTE.C3, 'sine', 0.35, 1.5);
  return b;
}

function buildTurn(): Float32Array {
  const b = makeBuffer(0.3);
  addTone(b, 0, 0.14, 660, 660, 'sine', 0.5, 2);
  addTone(b, 0.1, 0.18, 880, 880, 'sine', 0.5, 2);
  return b;
}

function buildEmote(): Float32Array {
  const b = makeBuffer(0.18);
  addTone(b, 0, 0.14, 420, 900, 'sine', 0.55, 1.8);
  addTone(b, 0.03, 0.1, 840, 1300, 'triangle', 0.15, 2);
  return b;
}

const BUILDERS: Record<SfxName, () => Float32Array> = {
  step: buildStep,
  dice: buildDice,
  exit: buildExit,
  capture: buildCapture,
  goal: buildGoal,
  win: buildWin,
  lose: buildLose,
  turn: buildTurn,
  emote: buildEmote,
};

const VOLUME: Record<SfxName, number> = {
  step: 0.55,
  dice: 0.7,
  exit: 0.7,
  capture: 0.8,
  goal: 0.75,
  win: 0.85,
  lose: 0.7,
  turn: 0.6,
  emote: 0.6,
};

const MIN_GAP_MS: Record<SfxName, number> = {
  step: 45,
  dice: 250,
  exit: 150,
  capture: 150,
  goal: 200,
  win: 800,
  lose: 800,
  turn: 500,
  emote: 120,
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
}

function wavDataUri(samples: Float32Array): string {
  const n = samples.length;
  const bytes = new Uint8Array(44 + n * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, n * 2, true);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0.95 ? 0.95 / peak : 1;
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    view.setInt16(44 + i * 2, Math.round(v * 32767), true);
  }
  return 'data:audio/wav;base64,' + toBase64(bytes);
}

let enabled = true;
let failed = false;
const cache: Partial<Record<SfxName, HowlLike>> = {};
const lastPlayed: Partial<Record<SfxName, number>> = {};

function audioAvailable(): boolean {
  try {
    if (failed) return false;
    if (typeof window === 'undefined') return false;
    const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown; Audio?: unknown };
    return Boolean(w.AudioContext || w.webkitAudioContext || w.Audio);
  } catch {
    return false;
  }
}

function getHowl(name: SfxName): HowlLike | null {
  try {
    const hit = cache[name];
    if (hit) return hit;
    if (!audioAvailable()) return null;
    const uri = wavDataUri(BUILDERS[name]());
    const h = new Howl({
      src: [uri],
      format: ['wav'],
      volume: VOLUME[name],
      preload: true,
      onloaderror: () => {
        delete cache[name];
      },
      onplayerror: () => {
        try {
          (cache[name] as HowlLike | undefined)?.once('unlock', () => {
            try {
              if (enabled) (cache[name] as HowlLike | undefined)?.play();
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      },
    }) as HowlLike;
    cache[name] = h;
    return h;
  } catch {
    return null;
  }
}

export function unlockAudio(): void {
  try {
    if (!audioAvailable()) return;
    const ctx = (Howler as unknown as { ctx?: { state?: string; resume?: () => Promise<void> } }).ctx;
    if (ctx && ctx.state === 'suspended' && ctx.resume) {
      ctx.resume().catch(() => undefined);
    }
    // Prepare the most frequent sounds once the player has interacted.
    getHowl('step');
    getHowl('dice');
  } catch {
    /* ignore */
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  try {
    if (audioAvailable()) {
      (Howler as unknown as { mute: (m: boolean) => void }).mute(!on);
    }
    if (!on) {
      for (const key of Object.keys(cache) as SfxName[]) {
        try {
          cache[key]?.stop();
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export function playSfx(name: SfxName): void {
  try {
    if (!enabled) return;
    const now = Date.now();
    const last = lastPlayed[name] ?? 0;
    if (now - last < MIN_GAP_MS[name]) return;
    lastPlayed[name] = now;
    const h = getHowl(name);
    if (!h) return;
    const id = h.play();
    if (name === 'step') {
      h.rate(0.88 + Math.random() * 0.26, id);
    } else if (name === 'emote') {
      h.rate(0.95 + Math.random() * 0.15, id);
    }
  } catch {
    /* sound is optional: never surface an error */
  }
}

// Browsers only allow audio after a first gesture: unlock on the first touch / key.
(function installUnlock(): void {
  try {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    const once = (): void => {
      unlockAudio();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('touchstart', once, true);
      document.removeEventListener('keydown', once, true);
      document.removeEventListener('click', once, true);
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchstart', once, true);
    document.addEventListener('keydown', once, true);
    document.addEventListener('click', once, true);
  } catch {
    /* ignore */
  }
})();
