// Board geometry for the Spanish Parchis (68 squares), on a 19 x 19 grid.
//
// COORDINATES: every Point is in grid units where the centre of cell (col, row) is
// (col + 0.5, row + 0.5), so the whole board spans 0..19 on both axes (x right, y down).
// To draw in pixels, multiply by (boardPixels / 19).
//
// LAYOUT (unrotated view): the cross has four arms, each 3 cells wide and 8 long, around a
// central 3 x 3 goal area (cols/rows 8..10). Red's arm is at the BOTTOM, then, counterclockwise
// on screen in circuit order: green RIGHT, yellow TOP, blue LEFT. The circuit runs counterclockwise
// (abs 1..68). Each nest sits in the corner next to its colour's exit square.
//
// ROTATION: rotatePoint turns CLOCKWISE on screen by quarterTurns about the centre of a square of
// side `size` (use size = 19 for grid units, or the pixel size for pixel points).
// To put a colour at the bottom, rotate by QUARTER_TURNS_TO_BOTTOM[color]:
// red 0, green 1, yellow 2, blue 3.
import type { Color, Point } from '../types';
import { COLORS, START_SQUARE, CIRCUIT, LANE_START, GOAL } from '../types';

const GRID = 19;
const MID = GRID / 2; // 9.5

export const QUARTER_TURNS_TO_BOTTOM: Record<Color, number> = { red: 0, green: 1, yellow: 2, blue: 3 };

/** Arm index of each colour in counterclockwise order starting from the bottom. */
const ARM: Record<Color, number> = { red: 0, green: 1, yellow: 2, blue: 3 };

/** Rotate counterclockwise on screen about the board centre, n times (grid units). */
function rotCcw(p: Point, n: number): Point {
  let dx = p.x - MID;
  let dy = p.y - MID;
  const k = ((n % 4) + 4) % 4;
  for (let i = 0; i < k; i++) {
    const nx = dy;
    const ny = -dx;
    dx = nx;
    dy = ny;
  }
  return { x: MID + dx, y: MID + dy };
}

function cell(col: number, row: number): Point {
  return { x: col + 0.5, y: row + 0.5 };
}

// ---- Circuit -------------------------------------------------------------------------------
function buildCircuit(): Point[] {
  const out: Point[] = new Array(CIRCUIT);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 17; i++) {
      // Local square of red's arm (bottom): outward down the left column, tip, inward up the right column.
      let p: Point;
      if (i < 8) p = cell(8, 11 + i);
      else if (i === 8) p = cell(9, 18);
      else p = cell(10, 18 - (i - 9));
      const abs = ((26 + 17 * j + i - 1) % CIRCUIT) + 1;
      out[abs - 1] = rotCcw(p, j);
    }
  }
  return out;
}

/** Centres of the 68 circuit squares; index = absolute square - 1. */
export const CIRCUIT_COORDS: Point[] = buildCircuit();

// ---- Lanes, homes, goal ----------------------------------------------------------------------
const LANE_CACHE: Record<Color, Point[]> = { red: [], yellow: [], green: [], blue: [] };
const HOME_CACHE: Record<Color, Point[]> = { red: [], yellow: [], green: [], blue: [] };
const GOAL_CACHE: Record<Color, Point[]> = { red: [], yellow: [], green: [], blue: [] };

for (const color of COLORS) {
  const arm = ARM[color];
  // Lane: 7 squares up the middle column of the arm (progress 65..71), from the tip inwards.
  const lane: Point[] = [];
  for (let i = 0; i < 7; i++) lane.push(rotCcw(cell(9, 17 - i), arm));
  LANE_CACHE[color] = lane;

  // Nest: four spots in the corner beside the exit square (red: bottom-right).
  const nestCentre = { x: 15, y: 15 };
  const spread = 1.5;
  const offsets: Point[] = [
    { x: -spread, y: -spread },
    { x: spread, y: -spread },
    { x: -spread, y: spread },
    { x: spread, y: spread },
  ];
  HOME_CACHE[color] = offsets.map((o) => rotCcw({ x: nestCentre.x + o.x, y: nestCentre.y + o.y }, arm));

  // Goal: four spots in the colour's triangle of the central area (red: lower triangle).
  const goalPts: Point[] = [];
  for (let i = 0; i < 4; i++) goalPts.push(rotCcw({ x: MID + (i - 1.5) * 0.4, y: 10.3 }, arm));
  GOAL_CACHE[color] = goalPts;
}

/** The 7 lane squares of a colour (progress 65..71), ordered from the circuit towards the goal. */
export function laneCoords(color: Color): Point[] {
  return LANE_CACHE[color];
}

/** The 4 nest spots of a colour, index = piece index. */
export function homeCoords(color: Color): Point[] {
  return HOME_CACHE[color];
}

/** Absolute circuit square (1..68) for a colour's progress 1..64. */
function absOf(color: Color, progress: number): number {
  return ((START_SQUARE[color] - 1 + progress - 1) % CIRCUIT) + 1;
}

/** Grid position of a piece given its progress (0 nest, 1..64 circuit, 65..71 lane, 72 goal). */
export function pointFor(color: Color, progress: number, pieceIndex: number): Point {
  const idx = Math.max(0, Math.min(3, Math.floor(pieceIndex) || 0));
  const prog = Math.floor(progress);
  if (!(prog >= 1)) return HOME_CACHE[color][idx];
  if (prog >= GOAL) return GOAL_CACHE[color][idx];
  if (prog >= LANE_START) return LANE_CACHE[color][prog - LANE_START];
  return CIRCUIT_COORDS[absOf(color, prog) - 1];
}

/** Rotate a point clockwise on screen by quarterTurns about the centre of a square of side `size`. */
export function rotatePoint(p: Point, quarterTurns: number, size: number): Point {
  const c = size / 2;
  let dx = p.x - c;
  let dy = p.y - c;
  const k = ((Math.round(quarterTurns) % 4) + 4) % 4;
  for (let i = 0; i < k; i++) {
    const nx = -dy;
    const ny = dx;
    dx = nx;
    dy = ny;
  }
  return { x: c + dx, y: c + dy };
}
