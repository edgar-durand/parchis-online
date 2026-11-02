import { SAFE_SQUARES, CIRCUIT, COLORS } from '../types';
import type { Color, GameState, LegalMove } from '../types';
import { legalMoves, squareOf } from './rules';

function absOf(color: Color, progress: number): number | null {
  const sq = squareOf(color, progress);
  return sq.kind === 'circuit' ? sq.abs : null;
}

// True when some rival piece is 1..6 squares behind the given absolute square.
function threatened(state: GameState, color: Color, abs: number): boolean {
  if (SAFE_SQUARES.includes(abs)) return false;
  for (const other of COLORS) {
    if (other === color) continue;
    for (const prog of state.pieces[other]) {
      const oa = absOf(other, prog);
      if (oa === null) continue;
      const dist = (abs - oa + CIRCUIT) % CIRCUIT;
      if (dist >= 1 && dist <= 6) return true;
    }
  }
  return false;
}

function scoreMove(state: GameState, color: Color, m: LegalMove): number {
  let score = 0;
  if (m.reachesGoal) score += 100;
  if (m.captures) score += 80;
  if (m.from === 0) score += 60;

  const dest = squareOf(color, m.to);
  if (dest.kind === 'lane') score += 30;
  if (dest.kind === 'circuit') {
    if (SAFE_SQUARES.includes(dest.abs)) score += 25;
    else if (threatened(state, color, dest.abs)) score -= 15;
  }

  if (m.from > 0) {
    const fromAbs = absOf(color, m.from);
    if (fromAbs !== null && threatened(state, color, fromAbs)) score += 12;
  }

  score += (m.to - m.from) * 0.3 + m.to * 0.1;
  score += Math.random() * 3;
  return score;
}

// The rules engine reads the dice still available from state.diceLeft.
const legalForState = legalMoves as unknown as (s: GameState, c: Color) => LegalMove[];

// Picks the best legal option among all the ways of spending one or two dice
// (first die, second die or their sum), so the bot also chooses which die to use.
export function chooseBotMoveWithUse(state: GameState, color: Color): LegalMove | null {
  if (state.dice === null || state.dice === undefined) return null;
  const moves = legalForState(state, color);
  if (!moves || moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    let sc = scoreMove(state, color, m);
    // Spending the whole sum on a single piece is slightly better than a short hop
    // when nothing special happens; the distance term already rewards it,
    // so only break ties toward keeping the second die for another piece after an exit.
    if (m.from === 0 && m.use !== 'sum') sc += 4;
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }
  return best;
}

export function chooseBotMove(state: GameState, color: Color): number | null {
  const m = chooseBotMoveWithUse(state, color);
  return m ? m.pieceIndex : null;
}

// Bots think for 1 to 2 seconds so humans can follow what happens.
export function botDelayMs(): number {
  return 1000 + Math.floor(Math.random() * 1000);
}
