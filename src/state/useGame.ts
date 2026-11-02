import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import {
  Action,
  CHARACTERS,
  COLORS,
  Color,
  ConnectionStatus,
  DieUse,
  EmoteId,
  GOAL,
  GameState,
  GameStore,
  JoinError,
  LegalMove,
  MatchRecord,
  OFFLINE_BOT_AFTER_MS,
  Profile,
  RoomTransport,
  Seat,
} from '../types';
import { applyMove, applyRoll, createInitialState, legalMoves, nextTurn } from '../engine/rules';
import { botDelayMs, chooseBotMoveWithUse } from '../engine/bots';
import { createLocalTransport, createTransport } from '../net/transport';
import { makeRoomCode, normalizeCode } from '../net/links';

const SESSION_KEY = 'parchis:session';
const HISTORY_KEY = 'parchis:history';
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const HEARTBEAT_MS = 3000;
// a phone that switches app for a moment, or a slow network, is not "gone"
const DISCONNECT_AFTER_MS = 25000;
const EMOTE_COOLDOWN_MS = 3000;
const PENDING_TIMEOUT_MS = 5000;
const HISTORY_LIMIT = 20;

interface SavedSession {
  code: string;
  practice: boolean;
  pid: string;
  savedAt: number;
  state: GameState;
}

// ---------- pure helpers (host reducer) ----------

function emptySeat(color: Color): Seat {
  return { color, playerId: null, name: '', isBot: false, ready: false, connected: false, lastSeen: 0 };
}

function setSeat(s: GameState, color: Color, patch: Partial<Seat>): GameState {
  return { ...s, seats: s.seats.map((x) => (x.color === color ? { ...x, ...patch } : x)) };
}

function isHumanSeat(x: Seat): boolean {
  return !!x.playerId && !x.isBot;
}

function hostSeat(s: GameState): Seat | null {
  return s.seats.find(isHumanSeat) ?? null;
}

function humanCount(s: GameState): number {
  return s.seats.filter(isHumanSeat).length;
}

function canStart(s: GameState): boolean {
  const host = hostSeat(s);
  return s.seats.every((x) => (!!x.playerId || x.isBot) && (x.isBot || x.ready || x === host));
}

// The rules engine reads the dice left (and any bonus) from the state itself.
function legalOf(s: GameState, color: Color): LegalMove[] {
  return (legalMoves as (st: GameState, c: Color) => LegalMove[])(s, color);
}

// Old saved or published states carried one die: give them the new fields.
function normalize(s: GameState): GameState {
  if (s.dice2 !== undefined && s.diceLeft && s.doublesInRow !== undefined) return s;
  return {
    ...s,
    dice2: s.dice2 ?? null,
    diceLeft: s.diceLeft ?? { a: s.phase === 'moving' ? s.dice : null, b: null },
    doublesInRow: s.doublesInRow ?? 0,
  };
}

// If the turn is waiting for a move that cannot exist, pass the turn.
function settle(s: GameState): GameState {
  if (s.phase !== 'moving') return s;
  if (legalOf(s, s.turn).length === 0) return nextTurn(s);
  return s;
}

function actorColor(s: GameState, playerId: string): Color | null {
  if (playerId.startsWith('bot:')) {
    const c = playerId.slice(4) as Color;
    return COLORS.includes(c) ? c : null;
  }
  const seat = s.seats.find((x) => x.playerId === playerId);
  return seat ? seat.color : null;
}

function reduce(state: GameState, a: Action, now: number): GameState {
  switch (a.type) {
    case 'join': {
      const existing = state.seats.find((x) => x.playerId === a.playerId);
      if (existing) {
        if (existing.connected) return state;
        return setSeat(state, existing.color, { connected: true, lastSeen: now });
      }
      if (state.phase !== 'lobby') return state;
      const free = state.seats.find((x) => !x.playerId && !x.isBot);
      if (!free) return state;
      const name = a.name.trim().slice(0, 14) || CHARACTERS[free.color].name;
      const first = humanCount(state) === 0;
      return setSeat(state, free.color, {
        playerId: a.playerId, name, isBot: false, ready: first, connected: true, lastSeen: now,
      });
    }
    case 'leave': {
      const seat = state.seats.find((x) => x.playerId === a.playerId);
      if (!seat) return state;
      if (state.phase === 'rolling' || state.phase === 'moving') {
        return setSeat(state, seat.color, { playerId: null, isBot: true, ready: true, connected: true });
      }
      return setSeat(state, seat.color, emptySeat(seat.color));
    }
    case 'ready': {
      if (state.phase !== 'lobby') return state;
      const seat = state.seats.find((x) => x.playerId === a.playerId);
      if (!seat || seat.ready === a.ready) return state;
      return setSeat(state, seat.color, { ready: a.ready });
    }
    case 'addBot': {
      if (state.phase !== 'lobby') return state;
      const seat = state.seats.find((x) => x.color === a.color);
      if (!seat || seat.playerId || seat.isBot) return state;
      return setSeat(state, a.color, {
        playerId: null, isBot: true, name: CHARACTERS[a.color].name, ready: true, connected: true, lastSeen: now,
      });
    }
    case 'kick': {
      if (state.phase !== 'lobby') return state;
      const seat = state.seats.find((x) => x.color === a.color);
      const host = hostSeat(state);
      if (!seat || (!seat.playerId && !seat.isBot) || (host && host.color === a.color)) return state;
      return setSeat(state, a.color, emptySeat(a.color));
    }
    case 'start': {
      if (state.phase !== 'lobby' || !canStart(state)) return state;
      const base = createInitialState(state.roomCode);
      return {
        ...base,
        seats: state.seats.map((x) => ({ ...x, ready: true })),
        phase: 'rolling',
        turn: COLORS[0],
        startedAt: now,
        rematchCount: state.rematchCount,
        version: state.version,
      };
    }
    case 'roll': {
      if (state.phase !== 'rolling') return state;
      if (actorColor(state, a.playerId) !== state.turn) return state;
      if (!Number.isFinite(a.value) || a.value < 1 || a.value > 6) return state;
      if (!Number.isFinite(a.value2) || a.value2 < 1 || a.value2 > 6) return state;
      return settle(applyRoll(state, Math.floor(a.value), Math.floor(a.value2)));
    }
    case 'move': {
      if (state.phase !== 'moving') return state;
      if (actorColor(state, a.playerId) !== state.turn) return state;
      const chosen = legalOf(state, state.turn).find(
        (m) => m.pieceIndex === a.pieceIndex && (a.use === undefined || m.use === a.use),
      );
      if (!chosen) return state;
      return settle(applyMove(state, a.pieceIndex, chosen.use));
    }
    case 'emote': {
      if (state.phase === 'lobby') return state;
      const color = actorColor(state, a.playerId);
      if (!color) return state;
      const last = [...state.emotes].reverse().find((e) => e.color === color);
      if (last && now - last.at < EMOTE_COOLDOWN_MS) return state;
      const id = state.emotes.reduce((m, e) => Math.max(m, e.id), 0) + 1;
      return { ...state, emotes: [...state.emotes, { id, color, emote: a.emote, at: now }].slice(-12) };
    }
    case 'heartbeat': {
      const seat = state.seats.find((x) => x.playerId === a.playerId);
      if (!seat || seat.connected) return state;
      return setSeat(state, seat.color, { connected: true, lastSeen: now });
    }
    case 'rematch': {
      if (state.phase !== 'over') return state;
      const base = createInitialState(state.roomCode);
      return {
        ...base,
        seats: state.seats.map((x) =>
          x.playerId || x.isBot
            ? { ...x, ready: true }
            : { ...x, isBot: true, name: CHARACTERS[x.color].name, ready: true, connected: true },
        ),
        phase: 'rolling',
        turn: COLORS[0],
        startedAt: now,
        rematchCount: state.rematchCount + 1,
        version: state.version,
      };
    }
    default:
      return state;
  }
}

function randomDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function legalFor(s: GameState | null, color: Color | null): LegalMove[] {
  if (!s || !color || s.phase !== 'moving' || s.turn !== color) return [];
  return legalOf(s, color);
}

async function writeHistory(rec: MatchRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list: MatchRecord[] = raw ? JSON.parse(raw) : [];
    if (list.some((m) => m.id === rec.id)) return;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([rec, ...list].slice(0, HISTORY_LIMIT)));
  } catch {
    // history is a nice-to-have: never break the game for it
  }
}

// ---------- hook ----------

export function useGame(profile: Profile): GameStore {
  const [state, setState] = useState<GameState | null>(null);
  const [pid, setPid] = useState('');
  const [practice, setPractice] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<JoinError | null>(null);
  const [pending, setPending] = useState(false);
  const [tick, setTick] = useState(0);

  const stateRef = useRef<GameState | null>(null);
  const transportRef = useRef<RoomTransport | null>(null);
  const codeRef = useRef('');
  const pidRef = useRef('');
  const practiceRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const profileRef = useRef(profile);
  const fallbackIdRef = useRef('');
  const changedAtRef = useRef(Date.now());
  const lastSeenRef = useRef<Map<string, number>>(new Map());
  const takeoverRef = useRef<Set<Color>>(new Set());
  const lastEmoteRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadSeatRef = useRef(false);
  const recordedRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  profileRef.current = profile;

  const myPlayerId = useCallback((): string => {
    const id = profileRef.current.playerId;
    if (id) return id;
    if (!fallbackIdRef.current) fallbackIdRef.current = 'p' + Math.random().toString(36).slice(2, 10);
    return fallbackIdRef.current;
  }, []);

  const adopt = useCallback((s: GameState | null) => {
    const n = s ? normalize(s) : s;
    stateRef.current = n;
    changedAtRef.current = Date.now();
    setState(n);
  }, []);

  const clearPending = useCallback(() => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
    setPending(false);
  }, []);

  const markPending = useCallback(() => {
    setPending(true);
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      setPending(false);
    }, PENDING_TIMEOUT_MS);
  }, []);

  const amHost = useCallback((): boolean => {
    const cur = stateRef.current;
    if (!cur) return false;
    const h = hostSeat(cur);
    return !!h && h.playerId === pidRef.current;
  }, []);

  // Host-only: reduce, bump version, publish.
  const commit = useCallback((fn: (s: GameState) => GameState) => {
    const cur = stateRef.current;
    if (!cur) return;
    const raw = fn(cur);
    if (raw === cur) return;
    const next: GameState = { ...raw, version: cur.version + 1 };
    adopt(next);
    const t = transportRef.current;
    const code = codeRef.current;
    if (t && code) {
      t.publish(code, next).catch(() => {
        if (!practiceRef.current) setStatus('reconnecting');
      });
    }
  }, [adopt]);

  const handleActions = useCallback((list: Action[]) => {
    if (!list.length || !amHost()) return;
    const now = Date.now();
    const cur = stateRef.current;
    if (!cur) return;
    let bumped = false;
    for (const a of list) {
      const id = 'playerId' in a ? a.playerId : null;
      if (id && !id.startsWith('bot:')) {
        lastSeenRef.current.set(id, now);
        const seat = cur.seats.find((x) => x.playerId === id);
        if (seat && takeoverRef.current.delete(seat.color)) bumped = true;
      }
    }
    if (bumped) setTick((t) => t + 1);
    commit((s) => list.reduce((acc, a) => reduce(acc, a, now), s));
  }, [amHost, commit]);

  const sendAction = useCallback((a: Action) => {
    const t = transportRef.current;
    const code = codeRef.current;
    if (!t || !code) return;
    t.send(code, a).catch(() => {
      setStatus('reconnecting');
      clearPending();
    });
  }, [clearPending]);

  // Route an action by role: host reduces locally, guests send it to the host.
  const dispatch = useCallback((a: Action) => {
    if (amHost()) {
      handleActions([a]);
    } else if (!practiceRef.current) {
      sendAction(a);
    }
  }, [amHost, handleActions, sendAction]);

  const teardown = useCallback(() => {
    if (unsubRef.current) {
      try { unsubRef.current(); } catch { /* ignore */ }
    }
    unsubRef.current = null;
    transportRef.current = null;
    codeRef.current = '';
    practiceRef.current = false;
    takeoverRef.current = new Set();
    lastSeenRef.current = new Map();
    hadSeatRef.current = false;
    clearPending();
    stateRef.current = null;
    setState(null);
    setPractice(false);
    setStatus('online');
    AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
  }, [clearPending]);

  const enterRoom = useCallback((
    s: GameState, t: RoomTransport, isPractice: boolean, id: string, restored: boolean,
  ) => {
    if (unsubRef.current) {
      try { unsubRef.current(); } catch { /* ignore */ }
      unsubRef.current = null;
    }
    pidRef.current = id;
    setPid(id);
    transportRef.current = t;
    codeRef.current = s.roomCode;
    practiceRef.current = isPractice;
    setPractice(isPractice);
    takeoverRef.current = new Set();
    lastSeenRef.current = new Map();
    hadSeatRef.current = s.seats.some((x) => x.playerId === id);
    setError(null);
    setStatus(restored && !isPractice ? 'reconnecting' : 'online');
    adopt(s);
    if (isPractice) return;
    unsubRef.current = t.subscribe(
      s.roomCode,
      (incoming) => {
        if (incoming.roomCode !== codeRef.current) return;
        const cur = stateRef.current;
        if (cur && incoming.version <= cur.version) return;
        adopt(incoming);
        clearPending();
      },
      (actions) => handleActions(actions),
      (st) => setStatus(st),
      amHost,
    );
  }, [adopt, clearPending, handleActions, amHost]);

  // Make sure the host is seated and ready.
  const ensureHost = useCallback((s: GameState, id: string, name: string): GameState => {
    const now = Date.now();
    let st = s;
    if (!st.seats.some((x) => x.playerId === id)) st = reduce(st, { type: 'join', playerId: id, name }, now);
    const seat = st.seats.find((x) => x.playerId === id);
    if (seat && (!seat.ready || !seat.connected)) st = setSeat(st, seat.color, { ready: true, connected: true, lastSeen: now });
    return st === s ? s : { ...st, version: s.version + 1 };
  }, []);

  // ---------- public actions ----------

  const createRoom = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const id = myPlayerId();
      const name = profileRef.current.name.trim() || 'Pirata';
      const t = createTransport();
      const created = await t.create({ playerId: id, name });
      const st = ensureHost(created, id, name);
      enterRoom(st, t, false, id, false);
      if (st !== created) {
        t.publish(st.roomCode, st).catch(() => setStatus('reconnecting'));
      }
    } catch {
      setError('network');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [enterRoom, ensureHost, myPlayerId]);

  const joinRoom = useCallback(async (code: string, name: string): Promise<boolean> => {
    if (busyRef.current) return false;
    const c = normalizeCode(code);
    if (c.length < 5) {
      setError('not_found');
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const id = myPlayerId();
      const clean = name.trim().slice(0, 14) || profileRef.current.name.trim() || 'Pirata';
      // a new join never inherits an old saved session
      AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
      const t = createTransport();
      const res = await t.join(c, { playerId: id, name: clean });
      if (res.error || !res.state) {
        setError(res.error ?? 'not_found');
        return false;
      }
      let st = normalize(res.state);
      if (!st.seats.some((x) => x.playerId === id)) {
        if (st.phase !== 'lobby') {
          setError('started');
          return false;
        }
        const seated = reduce(st, { type: 'join', playerId: id, name: clean }, Date.now());
        if (!seated.seats.some((x) => x.playerId === id)) {
          setError(st.phase === 'lobby' ? 'full' : 'started');
          return false;
        }
        // optimistic seat: same version so the host's authoritative state replaces it
        st = { ...seated, version: st.version };
      }
      enterRoom(st, t, false, id, false);
      t.send(st.roomCode, { type: 'join', playerId: id, name: clean }).catch(() => setStatus('reconnecting'));
      return true;
    } catch {
      setError('network');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [enterRoom, myPlayerId]);

  const startPractice = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const id = myPlayerId();
      const name = profileRef.current.name.trim() || 'Pirata';
      const t = createLocalTransport();
      let created: GameState;
      try {
        created = await t.create({ playerId: id, name });
      } catch {
        created = createInitialState(makeRoomCode());
      }
      const now = Date.now();
      let st = ensureHost(created, id, name);
      for (const c of COLORS) {
        const seat = st.seats.find((x) => x.color === c);
        if (seat && seat.playerId !== id) st = reduce(st, { type: 'addBot', color: c }, now);
      }
      st = reduce(st, { type: 'start' }, now);
      st = { ...st, version: created.version + 1 };
      enterRoom(st, t, true, id, false);
      t.publish(st.roomCode, st).catch(() => undefined);
    } catch {
      setError('network');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [enterRoom, ensureHost, myPlayerId]);

  const setReady = useCallback((ready: boolean) => {
    dispatch({ type: 'ready', playerId: pidRef.current, ready });
  }, [dispatch]);

  const addBot = useCallback((color: Color) => {
    if (amHost()) handleActions([{ type: 'addBot', color }]);
  }, [amHost, handleActions]);

  const kick = useCallback((color: Color) => {
    if (amHost()) handleActions([{ type: 'kick', color }]);
  }, [amHost, handleActions]);

  const start = useCallback(() => {
    if (amHost()) handleActions([{ type: 'start' }]);
  }, [amHost, handleActions]);

  const roll = useCallback(() => {
    const cur = stateRef.current;
    if (!cur || cur.phase !== 'rolling') return;
    const mine = cur.seats.find((x) => x.playerId === pidRef.current);
    if (!mine || mine.color !== cur.turn) return;
    const a: Action = { type: 'roll', playerId: pidRef.current, value: randomDie(), value2: randomDie() };
    if (amHost()) {
      handleActions([a]);
    } else if (!practiceRef.current) {
      markPending();
      sendAction(a);
    }
  }, [amHost, handleActions, markPending, sendAction]);

  const move = useCallback((pieceIndex: number, use?: DieUse) => {
    const cur = stateRef.current;
    if (!cur) return;
    const mine = cur.seats.find((x) => x.playerId === pidRef.current);
    if (!mine) return;
    if (!legalFor(cur, mine.color).some((m) => m.pieceIndex === pieceIndex && (use === undefined || m.use === use))) return;
    const a: Action = { type: 'move', playerId: pidRef.current, pieceIndex, use };
    if (amHost()) {
      handleActions([a]);
    } else if (!practiceRef.current) {
      markPending();
      sendAction(a);
    }
  }, [amHost, handleActions, markPending, sendAction]);

  const emote = useCallback((e: EmoteId) => {
    const now = Date.now();
    if (now - lastEmoteRef.current < EMOTE_COOLDOWN_MS) return;
    const cur = stateRef.current;
    if (!cur || cur.phase === 'lobby') return;
    lastEmoteRef.current = now;
    dispatch({ type: 'emote', playerId: pidRef.current, emote: e });
  }, [dispatch]);

  const rematch = useCallback(() => {
    const cur = stateRef.current;
    if (!cur || cur.phase !== 'over') return;
    dispatch({ type: 'rematch' });
  }, [dispatch]);

  const leave = useCallback(() => {
    const cur = stateRef.current;
    const t = transportRef.current;
    const code = codeRef.current;
    if (cur && t && code && !practiceRef.current) {
      const id = pidRef.current;
      if (amHost()) {
        const next: GameState = { ...reduce(cur, { type: 'leave', playerId: id }, Date.now()), version: cur.version + 1 };
        if (humanCount(next) === 0) {
          t.close(code).catch(() => undefined);
        } else {
          t.publish(code, next).catch(() => undefined);
        }
      } else {
        t.send(code, { type: 'leave', playerId: id }).catch(() => undefined);
      }
    } else if (t && code && practiceRef.current) {
      t.close(code).catch(() => undefined);
    }
    teardown();
  }, [amHost, teardown]);

  // ---------- effects ----------

  // Restore the running game after the app was closed.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SESSION_KEY)
      .then(async (raw) => {
        if (!alive || !raw || stateRef.current) return;
        const saved = JSON.parse(raw) as SavedSession;
        if (!saved || !saved.state || Date.now() - saved.savedAt > SESSION_MAX_AGE_MS) {
          AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
          return;
        }
        if (saved.state.phase === 'over' || !saved.state.seats.some((x) => x.playerId === saved.pid)) {
          AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
          return;
        }
        if (saved.practice) {
          enterRoom(saved.state, createLocalTransport(), true, saved.pid, true);
          return;
        }
        const t = createTransport();
        const mine = saved.state.seats.find((x) => x.playerId === saved.pid);
        try {
          // ask the room for its published state: the saved copy may be out of date
          const res = await t.join(saved.code, { playerId: saved.pid, name: mine?.name ?? '' });
          if (!alive || stateRef.current || busyRef.current) return;
          if (res.state) {
            const published = normalize(res.state);
            if (published.phase === 'over' || !published.seats.some((x) => x.playerId === saved.pid)) {
              AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
              return;
            }
            enterRoom(published, t, false, saved.pid, true);
            return;
          }
          if (res.error === 'not_found') {
            AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
            return;
          }
        } catch {
          // offline: fall back to the saved copy below
        }
        if (!alive || stateRef.current || busyRef.current) return;
        enterRoom(saved.state, t, false, saved.pid, true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (unsubRef.current) {
      try { unsubRef.current(); } catch { /* ignore */ }
    }
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  const myColor: Color | null = useMemo(() => {
    if (!state || !pid) return null;
    return state.seats.find((x) => x.playerId === pid)?.color ?? null;
  }, [state, pid]);

  const hostSeatNow = state ? hostSeat(state) : null;
  const isHost = !!hostSeatNow && !!pid && hostSeatNow.playerId === pid;

  // Persist the session so a reopened app returns to the seat.
  useEffect(() => {
    if (!state || !pid) return;
    const saved: SavedSession = { code: state.roomCode, practice, pid, savedAt: Date.now(), state };
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(saved)).catch(() => undefined);
  }, [state, pid, practice]);

  // Kicked out of the lobby: back to the start.
  useEffect(() => {
    if (!state || !pid) return;
    const seated = state.seats.some((x) => x.playerId === pid);
    if (seated) hadSeatRef.current = true;
    else if (hadSeatRef.current && state.phase === 'lobby') teardown();
  }, [state, pid, teardown]);

  // Guests: heartbeat so the host knows we are here.
  useEffect(() => {
    if (!state || isHost || practice || !pid) return;
    const code = state.roomCode;
    const beat = () => {
      const t = transportRef.current;
      if (t) t.send(code, { type: 'heartbeat', playerId: pid }).catch(() => undefined);
    };
    beat();
    const h = setInterval(beat, HEARTBEAT_MS);
    // back from another app or tab: say we are here at once, not on the next tick
    const back = () => beat();
    const env = globalThis as unknown as {
      addEventListener?: (n: string, f: () => void) => void;
      removeEventListener?: (n: string, f: () => void) => void;
      document?: { visibilityState?: string; addEventListener?: (n: string, f: () => void) => void; removeEventListener?: (n: string, f: () => void) => void };
    };
    const onVis = () => {
      if (!env.document || env.document.visibilityState === 'visible') beat();
    };
    let sub: { remove: () => void } | null = null;
    try {
      env.addEventListener?.('focus', back);
      env.addEventListener?.('online', back);
      env.document?.addEventListener?.('visibilitychange', onVis);
      sub = AppState.addEventListener('change', (st) => { if (st === 'active') beat(); });
    } catch {
      sub = null;
    }
    return () => {
      clearInterval(h);
      try {
        env.removeEventListener?.('focus', back);
        env.removeEventListener?.('online', back);
        env.document?.removeEventListener?.('visibilitychange', onVis);
        sub?.remove();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.roomCode, isHost, practice, pid]);

  // Host: mark silent players disconnected; after 60 s offline in their turn a bot plays for them.
  useEffect(() => {
    if (!state || !isHost || practice) return;
    const h = setInterval(() => {
      const cur = stateRef.current;
      if (!cur || !amHost()) return;
      const now = Date.now();
      const lost: Color[] = [];
      for (const seat of cur.seats) {
        if (!isHumanSeat(seat) || seat.playerId === pidRef.current || !seat.playerId) continue;
        let ls = lastSeenRef.current.get(seat.playerId);
        if (ls === undefined) {
          ls = now;
          lastSeenRef.current.set(seat.playerId, now);
        }
        if (seat.connected && now - ls > DISCONNECT_AFTER_MS) lost.push(seat.color);
      }
      if (lost.length) {
        commit((s) => lost.reduce((acc, c) => setSeat(acc, c, { connected: false, lastSeen: now }), s));
      }
      const live = stateRef.current;
      if (live && (live.phase === 'rolling' || live.phase === 'moving')) {
        const seat = live.seats.find((x) => x.color === live.turn);
        if (seat && isHumanSeat(seat) && seat.playerId !== pidRef.current && !seat.connected && seat.playerId) {
          const ls = lastSeenRef.current.get(seat.playerId) ?? 0;
          const base = Math.max(ls, changedAtRef.current);
          if (now - base > OFFLINE_BOT_AFTER_MS && !takeoverRef.current.has(seat.color)) {
            takeoverRef.current.add(seat.color);
            setTick((t) => t + 1);
          }
        }
      }
    }, 1000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.roomCode, isHost, practice]);

  // Host: drive bots (and offline players taken over by a bot).
  useEffect(() => {
    if (!state || !isHost) return;
    if (state.phase !== 'rolling' && state.phase !== 'moving') return;
    const seat = state.seats.find((x) => x.color === state.turn);
    if (!seat) return;
    if (!seat.isBot && !takeoverRef.current.has(seat.color)) return;
    const version = state.version;
    const color = seat.color;
    const timer = setTimeout(() => {
      const cur = stateRef.current;
      if (!cur || cur.version !== version || !amHost()) return;
      const botId = `bot:${color}`;
      if (cur.phase === 'rolling') {
        handleActions([{ type: 'roll', playerId: botId, value: randomDie(), value2: randomDie() }]);
      } else if (cur.phase === 'moving') {
        const choice = chooseBotMoveWithUse(cur, color) as unknown;
        let idx: number | null = null;
        let use: DieUse | undefined;
        if (typeof choice === 'number') {
          idx = choice;
        } else if (choice && typeof choice === 'object' && typeof (choice as { pieceIndex?: unknown }).pieceIndex === 'number') {
          const c = choice as { pieceIndex: number; use?: DieUse };
          idx = c.pieceIndex;
          use = c.use;
        }
        if (idx === null) commit((s) => nextTurn(s));
        else handleActions([{ type: 'move', playerId: botId, pieceIndex: idx, use }]);
      }
    }, botDelayMs());
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.version, isHost, tick]);

  // Write the match to the history once, when it ends.
  useEffect(() => {
    if (!state || state.phase !== 'over' || !state.winner || !myColor) return;
    const id = `${state.roomCode}-${state.startedAt}`;
    if (recordedRef.current.has(id)) return;
    recordedRef.current.add(id);
    const rec: MatchRecord = {
      id,
      date: Date.now(),
      roomCode: state.roomCode,
      myColor,
      winner: state.winner,
      captures: state.captures[myColor] ?? 0,
      piecesHome: state.pieces[myColor].filter((p) => p === GOAL).length,
      durationSec: Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)),
    };
    void writeHistory(rec);
  }, [state, myColor]);

  const legal = useMemo(() => legalFor(state, myColor), [state, myColor]);

  const canRoll = !!state && !!myColor && state.phase === 'rolling' && state.turn === myColor
    && !pending && status !== 'offline';

  return {
    state,
    myColor,
    isHost,
    status,
    legal,
    canRoll,
    busy,
    error,
    createRoom,
    joinRoom,
    startPractice,
    setReady,
    addBot,
    kick,
    start,
    roll,
    move,
    emote,
    rematch,
    leave,
  };
}
