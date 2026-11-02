// Room transport for the four phones.
//
// The host is authoritative: guests append actions to an inbox, the host reduces them and publishes the
// next state, and everybody polls the published state every ~2 s. Storage is a tiny key-value backend, so
// the same logic powers both transports:
//   - createTransport(): remote HTTP key-value backend (textdb.dev), polled every POLL_MS, so rooms are
//     shared between any two devices or browsers. Network failures throw, which the subscription reports
//     as 'reconnecting' / 'offline' and a join reports as the 'network' error.
//   - createLocalTransport(): in-memory backend for bots and practice, polled fast, nothing persisted.
import { createInitialState } from '../engine/rules';
import { makeRoomCode, normalizeCode } from './links';
import { AppState } from 'react-native';
import { POLL_MS } from '../types';
import type {
  Action,
  ConnectionStatus,
  GameState,
  JoinError,
  PlayerInfo,
  RoomTransport,
} from '../types';

interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

interface StateRecord { state: GameState; applied: number; updatedAt: number; out?: Record<string, number> }
// One outbox per player: only that player ever writes it, so no device can overwrite another's
// actions or heartbeats (the shared inbox lost them when two phones wrote at once). `beat` moves
// on every heartbeat; `items` keeps the player's recent actions with increasing `seq`.
interface Outbox { beat: number; seq: number; items: InboxItem[] }
const OUTBOX_LIMIT = 40;
interface InboxItem { seq: number; action: Action; at: number }
interface Inbox { next: number; items: InboxItem[] }

const PREFIX = 'parchis:room:';
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const JOIN_TIMEOUT_MS = 8000;
const INBOX_LIMIT = 120;

const stateKey = (code: string) => `${PREFIX}${code}:state`;
const inboxKey = (code: string) => `${PREFIX}${code}:inbox`;
const outKey = (code: string, playerId: string) => `${PREFIX}${code}:out:${playerId}`;
const norm = (code: string): string => normalizeCode(code);

function randomCode(): string {
  return makeRoomCode();
}

function seatOf(state: GameState, playerId: string): boolean {
  return state.seats.some((s) => s.playerId === playerId);
}

function hasFreeSeat(state: GameState): boolean {
  return state.seats.some((s) => s.playerId === null && !s.isBot);
}

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

function makeBackend(kv: KV, pollMs: number, remote: boolean): RoomTransport {
  // Serialises read-modify-write of the inbox within this instance.
  let chain: Promise<unknown> = Promise.resolve();
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => undefined);
    return run;
  };

  // Next inbox sequence number this instance still has to deliver, per room.
  const cursors = new Map<string, number>();
  // Subscribers' "run a tick now" hooks, so local changes show up without waiting a full poll.
  const wakers = new Map<string, Set<() => void>>();
  const wake = (code: string) => { wakers.get(code)?.forEach((fn) => fn()); };
  // This device's own outbox per room (it is its only writer).
  const mine = new Map<string, { playerId: string; box: Outbox }>();
  // Host: the last outbox seq applied per player, and the last heartbeat seen, per room.
  const outCursors = new Map<string, Record<string, number>>();
  const beats = new Map<string, Record<string, number>>();

  async function readOutbox(code: string, playerId: string): Promise<Outbox | null> {
    const raw = await kv.get(outKey(code, playerId));
    if (!raw) return null;
    try {
      const box = JSON.parse(raw) as Outbox;
      if (box && typeof box.seq === 'number' && Array.isArray(box.items)) return box;
    } catch {
      // not an outbox yet
    }
    return null;
  }

  async function writeOutbox(code: string, playerId: string, action: Action | null): Promise<void> {
    await enqueue(async () => {
      let entry = mine.get(code);
      if (!entry || entry.playerId !== playerId) {
        // a reload: continue after what the outbox already holds, never reuse a seq
        const prev = await readOutbox(code, playerId).catch(() => null);
        entry = { playerId, box: { beat: 0, seq: prev ? prev.seq : 0, items: prev ? prev.items : [] } };
        mine.set(code, entry);
      }
      const box = entry.box;
      const at = Date.now();
      box.beat = at;
      if (action) {
        box.seq += 1;
        box.items = [...box.items, { seq: box.seq, action, at }].slice(-OUTBOX_LIMIT);
      }
      await kv.set(outKey(code, playerId), JSON.stringify(box));
    });
    wake(code);
  }

  async function readRecord(code: string): Promise<StateRecord | null> {
    const raw = await kv.get(stateKey(code));
    if (!raw) return null;
    try {
      const rec = JSON.parse(raw) as StateRecord;
      if (!rec || !rec.state) return null;
      if (Date.now() - rec.updatedAt > ROOM_TTL_MS) return null;
      return rec;
    } catch {
      return null;
    }
  }

  async function readInbox(code: string): Promise<Inbox> {
    const raw = await kv.get(inboxKey(code));
    if (!raw) return { next: 0, items: [] };
    try {
      const box = JSON.parse(raw) as Inbox;
      if (box && typeof box.next === 'number' && Array.isArray(box.items)) return box;
    } catch {
      // fall through to an empty inbox
    }
    return { next: 0, items: [] };
  }

  async function writeRecord(code: string, state: GameState, applied: number): Promise<void> {
    const rec: StateRecord = { state, applied, updatedAt: Date.now(), out: outCursors.get(code) ?? {} };
    await kv.set(stateKey(code), JSON.stringify(rec));
  }

  async function appendAction(code: string, action: Action): Promise<void> {
    await enqueue(async () => {
      const attempts = remote ? 3 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const box = await readInbox(code);
        let items = box.items;
        if (action.type === 'heartbeat') {
          items = items.filter((it) => !(it.action.type === 'heartbeat' && it.action.playerId === action.playerId));
        }
        const at = Date.now();
        const seq = box.next;
        const mine = JSON.stringify(action);
        items.push({ seq, action, at });
        if (items.length > INBOX_LIMIT) items = items.slice(items.length - INBOX_LIMIT);
        await kv.set(inboxKey(code), JSON.stringify({ next: seq + 1, items } satisfies Inbox));
        if (!remote) return;
        // Several devices write the same inbox: read it back and retry if another device overwrote it.
        await sleep(150 + attempt * 150);
        let check: Inbox;
        try {
          check = await readInbox(code);
        } catch {
          // The write went through; a failed read-back is not worth failing the action.
          return;
        }
        if (check.items.some((it) => it.seq === seq && it.at === at && JSON.stringify(it.action) === mine)) return;
      }
    });
    wake(code);
  }

  async function uniqueCode(): Promise<string> {
    for (let i = 0; i < 12; i += 1) {
      const code = randomCode();
      if ((await readRecord(code)) === null) return code;
    }
    return randomCode();
  }

  return {
    async create(host: PlayerInfo): Promise<GameState> {
      const code = await uniqueCode();
      const base = createInitialState(code);
      const now = Date.now();
      const seats = base.seats.map((s, i) =>
        i === 0
          ? { ...s, playerId: host.playerId, name: host.name, isBot: false, ready: true, connected: true, lastSeen: now }
          : s,
      );
      const state: GameState = { ...base, roomCode: code, seats, version: base.version + 1 };
      await enqueue(async () => {
        // A fresh, empty inbox (a plain write works on every backend, no DELETE needed).
        await kv.set(inboxKey(code), JSON.stringify({ next: 0, items: [] } satisfies Inbox));
        cursors.set(code, 0);
        await writeRecord(code, state, 0);
      });
      return state;
    },

    async join(rawCode: string, player: PlayerInfo): Promise<{ state?: GameState; error?: JoinError }> {
      const code = norm(rawCode);
      try {
        const rec = await readRecord(code);
        if (!rec) return { error: 'not_found' };
        // Highest room version seen during this join: older records (slow or cached reads) are ignored.
        let bestVersion = rec.state.version;
        const check = (s: GameState): { state?: GameState; error?: JoinError } | null => {
          if (seatOf(s, player.playerId)) return { state: s };
          if (s.phase !== 'lobby') return { error: 'started' };
          if (!hasFreeSeat(s)) return { error: 'full' };
          return null;
        };
        // Confirms the seat against the latest published record, so the guest lands on the phase the host
        // published now (lobby until the host presses Start), never on an old record.
        const confirm = async (seated: GameState): Promise<{ state?: GameState; error?: JoinError }> => {
          try {
            const latest = await readRecord(code);
            if (latest && latest.state.version >= seated.version && seatOf(latest.state, player.playerId)) {
              return { state: latest.state };
            }
          } catch {
            // keep the state we already confirmed
          }
          return { state: seated };
        };
        const first = check(rec.state);
        if (first) return first.state ? await confirm(first.state) : first;

        await appendAction(code, { type: 'join', playerId: player.playerId, name: player.name });

        const deadline = Date.now() + (remote ? REMOTE_JOIN_TIMEOUT_MS : JOIN_TIMEOUT_MS);
        const step = remote ? 1000 : Math.max(100, Math.min(400, pollMs));
        let lastSent = Date.now();
        while (Date.now() < deadline) {
          await sleep(step);
          if (remote && Date.now() - lastSent > 4500) {
            lastSent = Date.now();
            await appendAction(code, { type: 'join', playerId: player.playerId, name: player.name });
          }
          const cur = await readRecord(code);
          if (!cur) return { error: 'not_found' };
          if (cur.state.version < bestVersion) continue;
          bestVersion = cur.state.version;
          const res = check(cur.state);
          if (res) return res.state ? await confirm(res.state) : res;
        }
        return { error: 'network' };
      } catch {
        return { error: 'network' };
      }
    },

    async send(rawCode: string, action: Action): Promise<void> {
      const code = norm(rawCode);
      const pid = 'playerId' in action ? action.playerId : null;
      // A join comes before the player has a seat, so it rides the shared inbox; a bot has no outbox.
      if (!remote || action.type === 'join' || !pid || pid.startsWith('bot:')) {
        await appendAction(code, action);
        return;
      }
      await writeOutbox(code, pid, action.type === 'heartbeat' ? null : action);
    },

    async publish(rawCode: string, state: GameState): Promise<void> {
      const code = norm(rawCode);
      await enqueue(async () => {
        let applied = cursors.get(code);
        if (applied === undefined) {
          const rec = await readRecord(code);
          applied = rec ? rec.applied : 0;
        }
        await writeRecord(code, state, applied);
      });
      wake(code);
    },

    subscribe(rawCode, onState, onActions, onStatus, isHost): () => void {
      const code = norm(rawCode);
      let stopped = false;
      let running = false;
      let again = false;
      let failures = 0;
      let firstFailureAt = 0;
      let lastVersion = -1;
      let lastStatus: ConnectionStatus | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const setStatus = (s: ConnectionStatus) => {
        if (s !== lastStatus) {
          lastStatus = s;
          if (!stopped) onStatus(s);
        }
      };

      const schedule = () => {
        if (stopped) return;
        if (timer) clearTimeout(timer);
        // After failures, poll a little slower (backoff) instead of hammering a weak connection.
        const delay = remote ? pollMs + Math.min(failures * 1000, 4000) : pollMs;
        timer = setTimeout(() => { void tick(); }, delay);
      };

      async function tick(): Promise<void> {
        if (stopped) return;
        if (running) { again = true; return; }
        running = true;
        try {
          const host = !isHost || isHost();
          const rec = await readRecord(code);
          // only the host reduces actions: guests never read the boxes
          const box = host ? await readInbox(code) : { next: 0, items: [] };
          const players = host && remote && rec
            ? rec.state.seats.filter((x) => x.playerId && !x.isBot).map((x) => x.playerId as string)
            : [];
          const outs = await Promise.all(players.map((pid) => readOutbox(code, pid).catch(() => null)));
          if (stopped) return;
          failures = 0;
          firstFailureAt = 0;
          setStatus('online');

          if (rec) {
            if (!cursors.has(code)) cursors.set(code, Math.min(rec.applied, box.next));
            if (rec.state.version !== lastVersion) {
              lastVersion = rec.state.version;
              onState(rec.state);
            }
          }
          const cursor = cursors.get(code);
          const incoming: Action[] = [];
          if (host && cursor !== undefined) {
            const start = Math.min(cursor, box.next);
            const fresh = box.items.filter((it) => it.seq >= start).sort((a, b) => a.seq - b.seq);
            cursors.set(code, box.next);
            fresh.forEach((it) => incoming.push(it.action));
          }
          if (players.length > 0) {
            const applied = outCursors.get(code) ?? { ...(rec?.out ?? {}) };
            const seen = beats.get(code) ?? {};
            players.forEach((pid, i) => {
              const out = outs[i];
              if (!out) return;
              const from = applied[pid] ?? 0;
              out.items
                .filter((it) => it.seq > from)
                .sort((a, b) => a.seq - b.seq)
                .forEach((it) => incoming.push(it.action));
              applied[pid] = Math.max(from, out.seq);
              // a moved heartbeat = the player is here (the host's clock decides how long ago)
              if (out.beat !== seen[pid]) {
                seen[pid] = out.beat;
                incoming.push({ type: 'heartbeat', playerId: pid });
              }
            });
            outCursors.set(code, applied);
            beats.set(code, seen);
          }
          if (incoming.length > 0) onActions(incoming);
        } catch {
          // Single reads/writes are already retried silently; only repeated failures show a banner.
          if (failures === 0) firstFailureAt = Date.now();
          failures += 1;
          const elapsed = Date.now() - firstFailureAt;
          if (failures >= 4 && elapsed >= 25000) setStatus('offline');
          else if (failures >= 2) setStatus('reconnecting');
        } finally {
          running = false;
          if (!stopped) {
            if (again) { again = false; void tick(); } else schedule();
          }
        }
      }

      const waker = () => { void tick(); };
      let set = wakers.get(code);
      if (!set) { set = new Set(); wakers.set(code, set); }
      set.add(waker);
      void tick();

      // Back in the foreground or network recovered: refresh right away instead of waiting for the next poll.
      const refresh = () => {
        if (stopped) return;
        if (timer) clearTimeout(timer);
        void tick();
      };
      type Listener = () => void;
      type Env = {
        addEventListener?: (name: string, fn: Listener) => void;
        removeEventListener?: (name: string, fn: Listener) => void;
        document?: {
          visibilityState?: string;
          addEventListener?: (name: string, fn: Listener) => void;
          removeEventListener?: (name: string, fn: Listener) => void;
        };
      };
      const env = globalThis as unknown as Env;
      const onVisible: Listener = () => {
        if (!env.document || env.document.visibilityState === 'visible') refresh();
      };
      const onBack: Listener = () => refresh();
      let appStateSub: { remove: () => void } | null = null;
      if (remote) {
        try {
          env.addEventListener?.('online', onBack);
          env.addEventListener?.('focus', onBack);
          env.document?.addEventListener?.('visibilitychange', onVisible);
        } catch {
          // no window events on this platform
        }
        try {
          appStateSub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
        } catch {
          appStateSub = null;
        }
      }

      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        wakers.get(code)?.delete(waker);
        try {
          env.removeEventListener?.('online', onBack);
          env.removeEventListener?.('focus', onBack);
          env.document?.removeEventListener?.('visibilitychange', onVisible);
          appStateSub?.remove();
        } catch {
          // ignore
        }
      };
    },

    async close(rawCode: string): Promise<void> {
      const code = norm(rawCode);
      await enqueue(async () => {
        cursors.delete(code);
        await kv.remove(stateKey(code));
        await kv.remove(inboxKey(code));
      });
    },
  };
}

const REMOTE_BASE = 'https://textdb.dev/api/data/';
const REQUEST_TIMEOUT_MS = 10000;
const REMOTE_JOIN_TIMEOUT_MS = 16000;

const remoteKey = (key: string): string => key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

declare const REMIX_PROXY: string | undefined;

type FetchInit = { method?: string; body?: string; headers?: Record<string, string> };

// When the browser blocks a direct call (CORS), the platform proxy carries the same request.
let useProxy = false;

function proxyBase(): string | null {
  try {
    return typeof REMIX_PROXY === 'string' && REMIX_PROXY.length > 0 ? REMIX_PROXY : null;
  } catch {
    return null;
  }
}

async function timedFetch(url: string, init?: FetchInit): Promise<Response> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, ctrl ? { ...init, signal: ctrl.signal } : init);
  } finally {
    clearTimeout(timer);
  }
}

async function remoteFetch(key: string, init?: FetchInit): Promise<Response> {
  const target = `${REMOTE_BASE}${remoteKey(key)}?_=${Date.now()}`;
  const method = (init?.method ?? 'GET').toUpperCase();
  const proxy = proxyBase();
  const proxiable = !!proxy && (method === 'GET' || method === 'POST');
  if (!useProxy || !proxiable) {
    try {
      return await timedFetch(target, init);
    } catch (err) {
      if (!proxiable) throw err;
      useProxy = true;
    }
  }
  return timedFetch(`${proxy}?url=${encodeURIComponent(target)}`, init);
}

// Retries a flaky request silently, with a growing pause between attempts.
async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await sleep(300 + i * 500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('request failed');
}

const remoteBackend: KV = {
  async get(key) {
    return withRetry(async () => {
      const res = await remoteFetch(key);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`kv get ${res.status}`);
      const text = (await res.text()).trim();
      return text.length > 0 ? text : null;
    }, 3);
  },
  async set(key, value) {
    await withRetry(async () => {
      const res = await remoteFetch(key, { method: 'POST', body: value, headers: { 'Content-Type': 'text/plain' } });
      if (!res.ok) throw new Error(`kv set ${res.status}`);
    }, 3);
  },
  async remove(key) {
    try {
      const res = await remoteFetch(key, { method: 'DELETE' });
      if (res.ok || res.status === 404) return;
    } catch {
      // DELETE blocked or unsupported: overwrite instead
    }
    // No delete available: overwrite with an empty record, which readers treat as "no room".
    const res2 = await remoteFetch(key, { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } });
    if (!res2.ok) throw new Error(`kv remove ${res2.status}`);
  },
};

export function createTransport(): RoomTransport {
  return makeBackend(remoteBackend, POLL_MS, true);
}

export function createLocalTransport(): RoomTransport {
  const mem = new Map<string, string>();
  const memoryBackend: KV = {
    get: async (key) => (mem.has(key) ? (mem.get(key) as string) : null),
    set: async (key, value) => { mem.set(key, value); },
    remove: async (key) => { mem.delete(key); },
  };
  return makeBackend(memoryBackend, 150, false);
}
