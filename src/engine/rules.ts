// Pure rules engine for Spanish Parchis (4 players, two dice). No React, no I/O, no randomness:
// the dice values come from the caller, so the host can reduce actions deterministically.
//
// Dice rules:
// - Every roll has two dice. A 5 on either die (or a sum of 5) lets a piece leave the nest, spending
//   only that 5 (or both dice when the sum is 5); the other die stays available.
// - Pieces already out move with the sum of both dice, or each die separately on different pieces.
// - Doubles grant another roll; three doubles in a row send the last moved piece home.
import {
  CAPTURE_BONUS,
  CHARACTERS,
  CIRCUIT,
  COLORS,
  EXIT_ROLL,
  GOAL,
  GOAL_BONUS,
  LANE_START,
  SAFE_SQUARES,
  START_SQUARE,
} from '../types';
import type { Color, DieUse, GameState, LegalMove, LogEntry, Seat, Square } from '../types';

const MAX_LOG = 30;
const CIRCUIT_END = 64; // last circuit progress before the lane

type Pieces = Record<Color, number[]>;
type DiceLeft = { a: number | null; b: number | null };

export function createInitialState(roomCode: string): GameState {
  const seats: Seat[] = COLORS.map((color) => ({
    color,
    playerId: null,
    name: '',
    isBot: false,
    ready: false,
    connected: false,
    lastSeen: 0,
  }));
  return {
    roomCode,
    seats,
    pieces: { red: [0, 0, 0, 0], yellow: [0, 0, 0, 0], green: [0, 0, 0, 0], blue: [0, 0, 0, 0] },
    turn: 'red',
    phase: 'lobby',
    dice: null,
    dice2: null,
    diceLeft: { a: null, b: null },
    sixesInRow: 0,
    doublesInRow: 0,
    pendingBonus: 0,
    lastMoved: null,
    winner: null,
    captures: { red: 0, yellow: 0, green: 0, blue: 0 },
    log: [],
    emotes: [],
    version: 0,
    startedAt: 0,
    rematchCount: 0,
  };
}

export function squareOf(color: Color, progress: number): Square {
  if (progress <= 0) return { kind: 'nest' };
  if (progress <= CIRCUIT_END) return { kind: 'circuit', abs: absOf(color, progress) };
  if (progress >= GOAL) return { kind: 'goal' };
  return { kind: 'lane', index: progress - LANE_START };
}

function absOf(color: Color, progress: number): number {
  return ((START_SQUARE[color] - 1 + progress - 1) % CIRCUIT) + 1;
}

function isSafe(abs: number): boolean {
  return SAFE_SQUARES.indexOf(abs) !== -1;
}

// A barrier = two or more pieces of the SAME colour on one circuit square. It blocks every colour.
function barrierAt(pieces: Pieces, abs: number): boolean {
  for (const c of COLORS) {
    let count = 0;
    for (const p of pieces[c]) {
      if (p >= 1 && p <= CIRCUIT_END && absOf(c, p) === abs) count++;
    }
    if (count >= 2) return true;
  }
  return false;
}

function opponentAt(pieces: Pieces, color: Color, abs: number): { color: Color; index: number } | null {
  for (const c of COLORS) {
    if (c === color) continue;
    for (let i = 0; i < pieces[c].length; i++) {
      const p = pieces[c][i];
      if (p >= 1 && p <= CIRCUIT_END && absOf(c, p) === abs) return { color: c, index: i };
    }
  }
  return null;
}

// With all four pieces out of the nest, a 6 counts as 7.
function effective(pieces: Pieces, color: Color, die: number): number {
  if (die === 6 && pieces[color].every((p) => p > 0)) return 7;
  return die;
}

// Dice still available. Older saved states only carried a single die.
function normDice(state: GameState): DiceLeft {
  const dl = state.diceLeft as DiceLeft | undefined | null;
  if (dl && typeof dl === 'object') {
    return { a: dl.a ?? null, b: dl.b ?? null };
  }
  const d = typeof state.dice === 'number' ? state.dice : null;
  return { a: d, b: null };
}

function exitMoves(pieces: Pieces, color: Color, use: DieUse): LegalMove[] {
  const moves: LegalMove[] = [];
  if (barrierAt(pieces, START_SQUARE[color])) return moves; // exit blocked by a barrier
  const mine = pieces[color];
  for (let i = 0; i < mine.length; i++) {
    if (mine[i] === 0) moves.push({ pieceIndex: i, from: 0, to: 1, reachesGoal: false, use });
  }
  return moves;
}

function stepMoves(pieces: Pieces, color: Color, options: Array<{ steps: number; use: DieUse }>): LegalMove[] {
  const mine = pieces[color];
  const moves: LegalMove[] = [];
  for (let i = 0; i < mine.length; i++) {
    const p = mine[i];
    if (p <= 0 || p >= GOAL) continue;
    for (const opt of options) {
      const to = p + opt.steps;
      if (to > GOAL) continue; // exact roll needed for the goal

      let blocked = false;
      for (let q = p + 1; q <= to && q <= CIRCUIT_END; q++) {
        if (barrierAt(pieces, absOf(color, q))) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      let captures: LegalMove['captures'];
      if (to <= CIRCUIT_END) {
        const abs = absOf(color, to);
        if (!isSafe(abs)) {
          const victim = opponentAt(pieces, color, abs);
          if (victim) captures = victim;
        }
      }
      const move: LegalMove = { pieceIndex: i, from: p, to, reachesGoal: to === GOAL, use: opt.use };
      if (captures) move.captures = captures;
      moves.push(move);
    }
  }
  return moves;
}

// `_legacyDice` is ignored: the dice come from the state (diceLeft / pendingBonus).
export function legalMoves(state: GameState, color: Color, _legacyDice?: number): LegalMove[] {
  if (state.phase !== 'rolling' && state.phase !== 'moving') return [];
  const pieces = state.pieces;

  if (state.pendingBonus > 0) {
    return stepMoves(pieces, color, [{ steps: state.pendingBonus, use: 'a' }]);
  }

  const left = normDice(state);
  const a = left.a;
  const b = left.b;
  if (a === null && b === null) return [];

  if (a !== null && b !== null) {
    const exitUse: DieUse | null =
      a === EXIT_ROLL ? 'a' : b === EXIT_ROLL ? 'b' : a + b === EXIT_ROLL ? 'sum' : null;
    if (exitUse) {
      const ex = exitMoves(pieces, color, exitUse);
      // Official rule: when a 5 lets a piece leave the nest, leaving is mandatory.
      if (ex.length > 0) return ex;
    }
    const ea = effective(pieces, color, a);
    const eb = effective(pieces, color, b);
    return stepMoves(pieces, color, [
      { steps: ea + eb, use: 'sum' },
      { steps: ea, use: 'a' },
      { steps: eb, use: 'b' },
    ]);
  }

  const use: DieUse = a !== null ? 'a' : 'b';
  const die = (a !== null ? a : b) as number;
  if (!Number.isFinite(die) || die <= 0) return [];
  if (die === EXIT_ROLL) {
    const ex = exitMoves(pieces, color, use);
    if (ex.length > 0) return ex;
  }
  return stepMoves(pieces, color, [{ steps: effective(pieces, color, die), use }]);
}

function nextLogId(log: LogEntry[]): number {
  return log.length ? log[log.length - 1].id + 1 : 1;
}

function withLog(log: LogEntry[], color: Color, kind: LogEntry['kind'], text: string): LogEntry[] {
  const next = log.concat([{ id: nextLogId(log), color, kind, text }]);
  return next.length > MAX_LOG ? next.slice(next.length - MAX_LOG) : next;
}

function occupied(seat: Seat): boolean {
  return seat.playerId !== null || seat.isBot;
}

// Moves the turn to the next occupied seat (no version bump).
function advance(state: GameState): GameState {
  const start = COLORS.indexOf(state.turn);
  let turn: Color = state.turn;
  for (let step = 1; step <= COLORS.length; step++) {
    const c = COLORS[(start + step) % COLORS.length];
    const seat = state.seats.find((s) => s.color === c);
    if (seat && occupied(seat)) {
      turn = c;
      break;
    }
  }
  return {
    ...state,
    turn,
    phase: 'rolling',
    sixesInRow: 0,
    doublesInRow: 0,
    pendingBonus: 0,
    diceLeft: { a: null, b: null },
  };
}

export function nextTurn(state: GameState): GameState {
  const s = advance(state);
  return { ...s, version: state.version + 1 };
}

export function applyRoll(state: GameState, value: number, value2: number): GameState {
  if (state.phase !== 'rolling') return state;
  const valid = (v: number): boolean => Number.isInteger(v) && v >= 1 && v <= 6;
  if (!valid(value) || !valid(value2)) return state;
  const color = state.turn;
  const name = CHARACTERS[color].name;

  const doubles = value === value2;
  const doublesInRow = doubles ? (state.doublesInRow || 0) + 1 : 0;
  const sixes = doubles && value === 6 ? (state.sixesInRow || 0) + 1 : 0;
  let s: GameState = {
    ...state,
    dice: value,
    dice2: value2,
    diceLeft: { a: value, b: value2 },
    sixesInRow: sixes,
    doublesInRow,
    pendingBonus: 0,
    log: withLog(state.log, color, 'roll', `${name} saca ${value} y ${value2}`),
    version: state.version + 1,
  };

  // Third double in a row: the last piece moved goes back to the nest (unless it is in the lane or goal).
  if (doubles && doublesInRow >= 3) {
    const lm = state.lastMoved;
    if (lm && lm.color === color) {
      const prog = state.pieces[color][lm.index];
      if (prog >= 1 && prog <= CIRCUIT_END) {
        const mine = state.pieces[color].slice();
        mine[lm.index] = 0;
        s = {
          ...s,
          pieces: { ...state.pieces, [color]: mine },
          log: withLog(s.log, color, 'penalty', `Tres dobles seguidos: una ficha de ${name} vuelve a casa`),
        };
        return advance(s);
      }
    }
  }

  const legal = legalMoves(s, color);
  if (legal.length === 0) {
    s = { ...s, log: withLog(s.log, color, 'skip', `${name} no puede mover: pasa el turno`) };
    if (doubles) return { ...s, phase: 'rolling', diceLeft: { a: null, b: null } }; // doubles still grant another roll
    return advance(s);
  }
  return { ...s, phase: 'moving' };
}

const USE_ORDER: DieUse[] = ['sum', 'a', 'b'];

export function applyMove(state: GameState, pieceIndex: number, use?: DieUse): GameState {
  if (state.phase !== 'moving' || state.dice === null) return state;
  const color = state.turn;
  const name = CHARACTERS[color].name;

  const candidates = legalMoves(state, color).filter((m) => m.pieceIndex === pieceIndex);
  if (candidates.length === 0) return state;
  let move: LegalMove | undefined = use ? candidates.find((m) => m.use === use) : undefined;
  if (!move) {
    for (const u of USE_ORDER) {
      move = candidates.find((m) => m.use === u);
      if (move) break;
    }
  }
  if (!move) return state;

  const wasBonus = state.pendingBonus > 0;
  const left = normDice(state);
  let diceLeft: DiceLeft = left;
  if (!wasBonus) {
    if (move.use === 'sum') diceLeft = { a: null, b: null };
    else if (move.use === 'a') diceLeft = { a: null, b: left.b };
    else diceLeft = { a: left.a, b: null };
  }

  const mine = state.pieces[color].slice();
  mine[pieceIndex] = move.to;
  let pieces: Pieces = { ...state.pieces, [color]: mine };
  let log = state.log;
  let captures = state.captures;
  let bonus = 0;

  if (move.from === 0) {
    log = withLog(log, color, 'exit', `${name} saca una ficha de casa`);
  } else if (move.reachesGoal) {
    log = withLog(log, color, 'goal', `${name} mete una ficha en la meta (+${GOAL_BONUS})`);
    bonus = GOAL_BONUS;
  } else if (move.captures) {
    const v = move.captures;
    const victim = pieces[v.color].slice();
    victim[v.index] = 0;
    pieces = { ...pieces, [v.color]: victim };
    captures = { ...captures, [color]: captures[color] + 1 };
    log = withLog(log, color, 'capture', `${name} captura una ficha de ${CHARACTERS[v.color].name} (+${CAPTURE_BONUS})`);
    bonus = CAPTURE_BONUS;
  } else {
    log = withLog(log, color, 'move', `${name} avanza ${move.to - move.from}`);
  }

  let s: GameState = {
    ...state,
    pieces,
    captures,
    log,
    diceLeft,
    lastMoved: { color, index: pieceIndex },
    pendingBonus: 0,
    version: state.version + 1,
  };

  // Victory: all four pieces in the goal.
  if (mine.every((p) => p === GOAL)) {
    return {
      ...s,
      phase: 'over',
      winner: color,
      diceLeft: { a: null, b: null },
      log: withLog(s.log, color, 'info', `${name} gana la partida`),
    };
  }

  if (bonus > 0) {
    const bonusMoves = legalMoves({ ...s, phase: 'moving', pendingBonus: bonus }, color);
    if (bonusMoves.length > 0) {
      return { ...s, phase: 'moving', pendingBonus: bonus };
    }
    s = {
      ...s,
      log: withLog(s.log, color, 'skip', `Bonus de ${bonus} perdido: ningún movimiento posible`),
    };
  }

  // Another die is still available this turn.
  if (s.diceLeft.a !== null || s.diceLeft.b !== null) {
    if (legalMoves({ ...s, phase: 'moving' }, color).length > 0) {
      return { ...s, phase: 'moving' };
    }
    s = {
      ...s,
      diceLeft: { a: null, b: null },
      log: withLog(s.log, color, 'skip', `${name} no puede usar el otro dado`),
    };
  }

  // End of the action: doubles grant another roll, otherwise the turn passes.
  const wasDoubles = state.dice !== null && state.dice === (state.dice2 ?? null);
  if (wasDoubles) return { ...s, phase: 'rolling', pendingBonus: 0, diceLeft: { a: null, b: null } };
  return advance(s);
}

export function ranking(state: GameState): Color[] {
  const score = (c: Color): number => {
    const ps = state.pieces[c];
    let goals = 0;
    let sum = 0;
    for (const p of ps) {
      if (p >= GOAL) goals++;
      sum += p;
    }
    return goals * 1000 + sum;
  };
  const order = COLORS.slice().sort((a, b) => {
    const d = score(b) - score(a);
    return d !== 0 ? d : COLORS.indexOf(a) - COLORS.indexOf(b);
  });
  if (state.winner) {
    return [state.winner].concat(order.filter((c) => c !== state.winner));
  }
  return order;
}
