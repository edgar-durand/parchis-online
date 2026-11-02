// ILLUSTRATION SYSTEM: semi-realistic vector, top-left light, bevelled wood, soft shadows, glossy pawns.
// Pictures draw ONLY from these constants. No JSX here.
export const hues = {
  red: { base: '#D7322F', tint: '#F26B66', shade: '#8E1D1B', glow: 'rgba(215,50,47,0.55)' },
  yellow: { base: '#F2C230', tint: '#FFE27A', shade: '#B8901A', glow: 'rgba(242,194,48,0.55)' },
  green: { base: '#2FA35B', tint: '#6FD596', shade: '#1C6B3A', glow: 'rgba(47,163,91,0.55)' },
  blue: { base: '#2F7FD1', tint: '#6FB1F2', shade: '#1B4F8C', glow: 'rgba(47,127,209,0.55)' },
} as const;
export const wood = { light: '#D9A55F', base: '#B97F3C', dark: '#7A4F22', grain: 'rgba(60,32,10,0.18)', bevelHi: 'rgba(255,236,196,0.55)', bevelLo: 'rgba(40,20,5,0.45)' };
export const parchment = { base: '#F6EBD0', edge: '#DCCBA3', ink: '#3A2A12', cell: '#FBF3DD', safe: '#F2B33D' };
export const gold = { base: '#F2B33D', tint: '#FFD97A', shade: '#A8741A' };
export const sea = { sky: ['#0B1E33', '#12304F', '#1B4A74'], water: ['#1B4A74', '#12304F', '#0B1E33'], foam: 'rgba(246,235,208,0.18)', moon: '#FFF3C9' };
export const light = { x: -0.5, y: -0.7 };
export const shadow = { color: 'rgba(5,12,22,0.45)', offsetX: 2, offsetY: 4, blur: 6 };
export const loops = { wave: 6000, bob: 3200, glow: 1400, shimmer: 2400 };
// PIRATE HARBOUR CITY: cobblestones, planks, roofs, lanterns, docks and harbour water used by the board.
export const cobble = {
  light: '#CBBFA6',
  base: '#A99C84',
  dark: '#6F6450',
  gap: 'rgba(40,32,22,0.55)',
  hi: 'rgba(255,248,230,0.45)',
  lo: 'rgba(30,22,12,0.4)',
  moss: 'rgba(86,120,70,0.35)',
};
export const plank = {
  light: '#E2B574',
  base: '#C58B45',
  dark: '#7F5226',
  nail: '#3A2410',
  seam: 'rgba(50,28,8,0.5)',
  hi: 'rgba(255,236,196,0.5)',
};
export const roofs = {
  tile: { red: '#B7352B', yellow: '#D9A62B', green: '#2B8A52', blue: '#2A6DB5' },
  wall: '#EFDDB6',
  wallShade: '#C9B488',
  timber: '#5B3A1C',
  window: '#FFD97A',
  door: '#4A2C14',
  chimney: '#7A5A44',
};
export const lantern = {
  frame: '#2E2418',
  glass: '#FFD97A',
  glassCore: '#FFF3C9',
  flame: '#FFB347',
  halo: 'rgba(255,217,122,0.45)',
  pole: '#3B2D1D',
};
export const anchor = { iron: '#2C3A4A', ironHi: '#5B7189', rope: '#C9A66B' };
export const dock = {
  plank: '#8C5E2E',
  plankLight: '#A8743A',
  plankDark: '#5E3C1B',
  post: '#4A2E14',
  postTop: '#7A5230',
  rope: '#CDB07A',
  edge: 'rgba(20,10,2,0.5)',
};
export const water = {
  deep: '#0B2A47',
  mid: '#14527E',
  shallow: '#2A7FA8',
  foam: 'rgba(240,248,255,0.55)',
  foamSoft: 'rgba(240,248,255,0.22)',
  glint: 'rgba(255,255,255,0.35)',
  shore: 'rgba(214,236,244,0.5)',
};
export const plaza = {
  stone: '#D8CCB0',
  stoneDark: '#9C8F74',
  ring: '#7A5A2E',
  compass: '#A8741A',
  beacon: '#FFE9A8',
  tower: '#F1E7D0',
  towerStripe: '#C9453A',
};
export const harbour = {
  ground: '#B8AA8E',
  groundShade: '#8E8068',
  wallTop: '#E8D8B4',
  wallSide: '#7E6B4C',
  lane: { red: '#E9A19B', yellow: '#F7DC87', green: '#9BD6B0', blue: '#9CC4EC' },
  laneEdge: 'rgba(40,24,10,0.45)',
  cell: 52,
  cobbleStep: 9,
  cornerRadius: 10,
};
export const ink = { stroke: 2, cap: 'round' as const, join: 'round' as const };
// CHARACTER PAWNS: a round glossy base in the player's colour with the character bust standing on it.
export const pawnBase = {
  rim: 'rgba(255,255,255,0.7)',
  rimDark: 'rgba(20,10,2,0.55)',
  shadow: 'rgba(5,12,22,0.5)',
  gloss: 'rgba(255,255,255,0.55)',
  ring: 2,
  discRatio: 0.82,
  bustRatio: 0.92,
  bustLift: 0.12,
  fan: { spread: 0.34, scale: 0.8, tilt: 6 },
  movableGlow: 'rgba(255,233,168,0.9)',
};
export const crew = {
  red: { skin: '#F2C9A0', skinShade: '#D9A67A', hair: '#1F1A17', hat: '#E8C766', hatBand: '#C9302C', cloth: '#C9302C', scar: '#A8402E' },
  yellow: { skin: '#F5D0A6', skinShade: '#DDAF84', hair: '#F2D45A', hairShade: '#C9A92F', cloth: '#1F2A3A', tie: '#F2C230', brow: '#8A6A1A' },
  green: { skin: '#E8BE92', skinShade: '#CD9C70', hair: '#3E8F4F', hairShade: '#27663A', cloth: '#F1E7D0', sash: '#2FA35B', earring: '#F2B33D' },
  blue: { skin: '#6FA0C9', skinShade: '#4F7FA8', hair: '#1B3A66', hairShade: '#10264A', cloth: '#2F7FD1', fin: '#4F7FA8', eye: '#10264A' },
  eye: '#1A1410',
  eyeWhite: '#FFFFFF',
  mouth: '#7A2E22',
  line: 'rgba(30,18,8,0.75)',
  cheek: 'rgba(230,120,100,0.35)',
};
// MORE HARBOUR DETAILS: barrels, crates, flags, bollards, mooring rope and window glow.
export const props = {
  barrel: { body: '#8A5A2B', band: '#3A2A1A', top: '#B07A3E' },
  crate: { face: '#B8873F', edge: '#6E4A20', cross: '#8A6128' },
  flag: { pole: '#3B2D1D', cloth: '#1B1B22', skull: '#F1E7D0' },
  bollard: { body: '#4A2E14', top: '#7A5230' },
  mooring: { rope: '#CDB07A', ropeShade: '#8E7448' },
  lanternGlow: { inner: 'rgba(255,243,201,0.85)', outer: 'rgba(255,217,122,0)', radius: 0.9 },
  windowGlow: 'rgba(255,217,122,0.55)',
  puddle: 'rgba(120,170,200,0.28)',
  wake: 'rgba(240,248,255,0.35)',
};
// ONE PIECE STAGE: bright adventure sky, living sea, wooden pier and pirate ships. Same top-left light as everywhere else.
export const sky = {
  gradient: ['#4FB4F2', '#7CCBF7', '#BCE6FA', '#FFF1CF'],
  gradientStops: [0, 0.38, 0.72, 1],
  sun: { core: '#FFF8DA', mid: '#FFE27A', halo: 'rgba(255,226,122,0.38)', haloFar: 'rgba(255,226,122,0)', x: 0.16, y: 0.12, radius: 0.07 },
  rays: 'rgba(255,248,214,0.16)',
  cloud: { top: '#FFFFFF', mid: '#F3F8FD', bottom: '#C9DCEE', shadow: 'rgba(90,130,170,0.25)' },
  cloudFar: { top: 'rgba(255,255,255,0.7)', bottom: 'rgba(214,232,246,0.6)' },
  bird: 'rgba(40,52,70,0.7)',
  island: { far: '#9CB9C9', mid: '#7EA3B3', grass: '#6FA98A', rock: '#8B8F94', rockShade: '#5E6670' },
  horizon: 'rgba(255,241,207,0.65)',
};
export const ocean = {
  layers: [
    { color: '#58B6D6', amp: 5, length: 140, speed: 0.6, y: 0.0, alpha: 0.9 },
    { color: '#3C9CC4', amp: 7, length: 180, speed: 0.9, y: 0.18, alpha: 0.92 },
    { color: '#2680AE', amp: 9, length: 220, speed: 1.2, y: 0.4, alpha: 0.95 },
    { color: '#16618C', amp: 11, length: 260, speed: 1.5, y: 0.65, alpha: 1 },
  ],
  deep: '#0E4468',
  crest: 'rgba(255,255,255,0.85)',
  foam: 'rgba(255,255,255,0.6)',
  foamSoft: 'rgba(255,255,255,0.24)',
  sparkle: 'rgba(255,255,255,0.8)',
  shoreFoam: 'rgba(240,252,255,0.75)',
  underside: 'rgba(8,40,66,0.45)',
};
export const pier = {
  deck: { light: '#E0AE66', base: '#C48B48', dark: '#8A5C2A', seam: 'rgba(60,34,10,0.55)', hi: 'rgba(255,238,200,0.5)', nail: '#3A2410' },
  rail: { top: '#E8BE7A', post: '#7A4F22', postHi: '#B98040', beam: '#9A6630', shade: 'rgba(40,20,5,0.4)' },
  rope: { base: '#D8BE86', shade: '#8E7448', sag: 0.18, thickness: 3 },
  piling: { body: '#5A3A1C', hi: '#8A6030', waterline: 'rgba(8,40,66,0.55)', moss: 'rgba(70,120,80,0.45)' },
  barrel: { body: '#9A6530', band: '#3A2A1A', top: '#C48B48', hi: 'rgba(255,236,196,0.45)' },
  crate: { face: '#C0904A', edge: '#6E4A20', cross: '#8A6128' },
  tile: 28,
  depth: 10,
};
export const ship = {
  hull: { top: '#8A5226', mid: '#6E3E1B', bottom: '#43250E', stripe: '#E8C766', hi: 'rgba(255,226,170,0.45)' },
  deck: '#C99552',
  mast: '#5B3A1C',
  sail: { cloth: '#F6EFDC', shade: '#D6C8A2', seam: 'rgba(80,60,30,0.35)', patch: '#E8D9B0' },
  rope: '#CDB07A',
  porthole: { ring: '#C9A25A', glass: '#2A5878', glint: 'rgba(255,255,255,0.6)' },
  cannon: { body: '#2C3440', hi: '#5B6878' },
  figurehead: { body: '#F1E7D0', mane: '#D9A62B' },
  nest: { rim: '#E8C766', inner: '#5B3A1C' },
  bow: { wave: 'rgba(255,255,255,0.8)' },
  sailColor: { red: '#D7322F', yellow: '#F2C230', green: '#2FA35B', blue: '#2F7FD1' },
};
export const jollyRoger = {
  cloth: '#17171F',
  clothShade: '#0C0C12',
  skull: '#F6EFDC',
  skullShade: '#C9BFA6',
  bone: '#F6EFDC',
  hat: '#E8C766',
  hatBand: '#C9302C',
  waveSpeed: 1.4,
  waveAmp: 0.1,
};
export const lighthouse = {
  body: '#F6EFDC',
  stripe: '#C9453A',
  stripeShade: '#8E2A22',
  roof: '#3A4A5C',
  roofHi: '#6B8197',
  lamp: '#FFF3C9',
  beam: 'rgba(255,243,201,0.32)',
  beamFar: 'rgba(255,243,201,0)',
  rock: '#7A8088',
  rockShade: '#4C535C',
  sweep: 5200,
};
// PARALLAX: layer depth factors (0 = fixed, 1 = moves with the pointer/tilt). Far layers lighter and slower.
export const parallax = {
  sky: 0.0,
  sun: 0.02,
  cloudsFar: 0.05,
  islands: 0.08,
  cloudsNear: 0.12,
  sea: 0.2,
  ships: 0.3,
  pier: 0.45,
  maxShift: 14,
  cloudDrift: [90000, 60000],
  seaScroll: [14000, 9000, 6500, 4500],
};
export const stageLight = {
  vignette: 'rgba(8,28,48,0.28)',
  sunWarm: 'rgba(255,226,150,0.12)',
  boardShadow: 'rgba(6,24,40,0.45)',
  boardGlow: 'rgba(255,241,207,0.2)',
};
// WALK: Kingdom-Rush-style step animation, all times in ms, distances as a fraction of the cell size.
export const walk = {
  stepMs: 240,
  stepMsFast: 170,
  hop: 0.34,
  sway: 7,
  lean: 6,
  squashLand: { x: 1.18, y: 0.82 },
  stretchAir: { x: 0.9, y: 1.12 },
  squashMs: 90,
  anticipationMs: 70,
  settleMs: 160,
  overshoot: 1.06,
  legSwing: 26,
  armSwing: 22,
  headBob: 0.06,
  idleBob: { amp: 0.035, ms: 1800 },
  flipMs: 120,
  facing: { left: -1, right: 1 },
  stopFaceFront: true,
  dust: { count: 5, life: 420, size: 0.14, spread: 0.32, rise: 0.26, color: 'rgba(240,226,196,0.75)', colorShade: 'rgba(190,168,128,0.55)' },
  shadow: { base: 0.42, air: 0.26, scaleAir: 0.7 },
  reduced: { stepMs: 140, hop: 0, sway: 0, lean: 0, squash: false, dust: false, parallax: false },
};
export const actions = {
  exit: { jumpMs: 520, jumpHeight: 1.1, spin: 360, squash: 0.78, ringColor: 'rgba(255,233,168,0.9)', ringMs: 480 },
  capture: { flyMs: 760, arc: 2.2, spin: 720, hitFlash: 'rgba(255,255,255,0.95)', hitStar: '#FFE27A', hitMs: 220, shakeMs: 260, shakePx: 6, stars: 8 },
  goal: { jumpMs: 640, jumps: 2, height: 0.9, confetti: 18, confettiColors: ['#F2B33D', '#FFD97A', '#D7322F', '#2FA35B', '#2F7FD1', '#F6EFDC'], ringColor: 'rgba(255,217,122,0.95)' },
  select: { bobMs: 700, bobAmp: 0.08, glowMs: 1100 },
  stack: { offset: 0.26, scale: 0.82, maxVisible: 3 },
};
// SOUND: synthesised effects (no files). Each cue is a short list of tones; master volume and fallbacks live in the player.
export const sfx = {
  master: 0.6,
  step: [{ f: 180, to: 110, type: 'triangle', dur: 0.07, gain: 0.35 }, { f: 900, to: 400, type: 'square', dur: 0.02, gain: 0.05 }],
  diceRoll: [{ f: 220, to: 160, type: 'square', dur: 0.04, gain: 0.18, repeat: 7, gap: 0.055 }],
  diceLand: [{ f: 140, to: 70, type: 'triangle', dur: 0.14, gain: 0.4 }],
  exit: [{ f: 330, to: 660, type: 'sine', dur: 0.18, gain: 0.3 }, { f: 660, to: 990, type: 'triangle', dur: 0.16, gain: 0.22, delay: 0.1 }],
  capture: [{ f: 200, to: 50, type: 'sawtooth', dur: 0.28, gain: 0.35 }, { f: 1200, to: 300, type: 'square', dur: 0.08, gain: 0.2 }],
  goal: [{ f: 523, to: 523, type: 'triangle', dur: 0.14, gain: 0.3 }, { f: 659, to: 659, type: 'triangle', dur: 0.14, gain: 0.3, delay: 0.12 }, { f: 784, to: 784, type: 'triangle', dur: 0.26, gain: 0.3, delay: 0.24 }],
  win: [{ f: 523, to: 523, type: 'triangle', dur: 0.16, gain: 0.3 }, { f: 659, to: 659, type: 'triangle', dur: 0.16, gain: 0.3, delay: 0.16 }, { f: 784, to: 784, type: 'triangle', dur: 0.16, gain: 0.3, delay: 0.32 }, { f: 1047, to: 1047, type: 'triangle', dur: 0.5, gain: 0.34, delay: 0.48 }],
  emote: [{ f: 600, to: 900, type: 'sine', dur: 0.12, gain: 0.22 }],
  turn: [{ f: 740, to: 740, type: 'sine', dur: 0.1, gain: 0.2 }, { f: 988, to: 988, type: 'sine', dur: 0.14, gain: 0.2, delay: 0.1 }],
  tap: [{ f: 480, to: 420, type: 'sine', dur: 0.05, gain: 0.15 }],
  fightHit: [{ f: 160, to: 70, type: 'triangle', dur: 0.09, gain: 0.4 }, { f: 1400, to: 500, type: 'square', dur: 0.04, gain: 0.14 }],
  fightImpact: [{ f: 220, to: 40, type: 'sawtooth', dur: 0.34, gain: 0.42 }, { f: 1600, to: 260, type: 'square', dur: 0.1, gain: 0.22 }, { f: 90, to: 45, type: 'sine', dur: 0.3, gain: 0.45, delay: 0.04 }],
};
// FIGHT: capture brawl timeline (ms from the moment the attacker lands). Phases run in order: face -> brawl -> launch.
// The defeated pawn is not movable and nobody can move while the fight plays (total = fight.totalMs).
export const fight = {
  faceMs: 260,
  brawlMs: 720,
  launchMs: 760,
  totalMs: 1740,
  reducedTotalMs: 420,
  faceOffset: 0.3,
  faceLean: 10,
  faceScale: 1.08,
  hits: [
    { at: 0.1, side: 'left', power: 0.6 },
    { at: 0.28, side: 'right', power: 0.7 },
    { at: 0.46, side: 'left', power: 0.8 },
    { at: 0.64, side: 'right', power: 0.9 },
    { at: 0.86, side: 'both', power: 1 },
  ],
  hitSfxGap: 0.14,
  impactAt: 0.86,
  shake: { px: 5, freq: 38, decay: 0.8 },
  jitter: { px: 0.05, rot: 7 },
  cloud: {
    puffs: 7,
    radius: 0.42,
    spread: 0.38,
    swirlMs: 520,
    colors: ['rgba(246,239,220,0.92)', 'rgba(214,200,166,0.88)', 'rgba(255,255,255,0.8)'],
    shade: 'rgba(120,100,70,0.45)',
  },
  spark: { count: 10, life: 360, size: 0.16, colors: ['#FFE27A', '#FFFFFF', '#FFB347', '#F26B66'], star: '#FFE27A' },
  flash: { color: 'rgba(255,255,255,0.95)', ms: 140, ring: 'rgba(255,233,168,0.9)' },
  impactText: ['POW', 'BAM', 'ZAP'],
  impactFont: '#FFE27A',
  impactStroke: '#7A2E22',
  launch: { arc: 2.4, spin: 900, squash: 0.8, trail: 'rgba(255,255,255,0.45)', trailCount: 5, landDust: 6, landBounce: 0.2 },
  winnerPose: { hop: 0.22, ms: 320, puff: 1.12 },
  haptic: { hit: 'light', impact: 'heavy' },
};
// NEST RELIEF: each start house is a raised platform with thickness, steps, bevel, cast shadow and sunken token pockets.
// Top-left light: highlights on the top/left edges, shade on the right/bottom edges.
export const nest = {
  radius: 14,
  thickness: 0.2,
  tiers: [
    { inset: 0, lift: 0, hi: 0.5, lo: 0.4 },
    { inset: 0.07, lift: 0.07, hi: 0.55, lo: 0.4 },
    { inset: 0.14, lift: 0.13, hi: 0.6, lo: 0.4 },
  ],
  stepRows: 3,
  stepDepth: 0.045,
  bevel: { width: 0.035, hi: 'rgba(255,248,226,0.7)', lo: 'rgba(30,16,6,0.5)', corner: 'rgba(255,255,255,0.35)' },
  side: { light: '#A9774A', mid: '#8A5C2E', dark: '#5A3A1C', rivet: '#2C1A0A', rivetHi: 'rgba(255,230,180,0.6)' },
  castShadow: { color: 'rgba(5,12,22,0.5)', dx: 0.07, dy: 0.1, blur: 0.12 },
  contactShadow: 'rgba(5,12,22,0.28)',
  floor: { light: '#E8D9B4', base: '#D8C79B', dark: '#B5A276', speck: 'rgba(90,70,40,0.18)', seam: 'rgba(60,40,18,0.3)' },
  pocket: {
    ratio: 0.3,
    gap: 0.06,
    rim: 'rgba(255,248,226,0.55)',
    inner: 'rgba(20,10,2,0.5)',
    innerDeep: 'rgba(10,4,0,0.65)',
    wall: 'rgba(40,22,8,0.45)',
    floorTint: 0.35,
    ring: 2,
  },
  trim: { width: 0.05, stud: 0.032, studCount: 5, studHi: 'rgba(255,255,255,0.65)' },
  banner: { w: 0.22, h: 0.12, fold: 'rgba(0,0,0,0.25)', pole: '#3B2D1D', poleHi: '#7A5230' },
  corner: { post: 0.1, cap: 0.075, capHi: 'rgba(255,255,255,0.6)' },
  gate: { w: 0.2, h: 0.1, arrow: 'rgba(255,255,255,0.75)', step: 'rgba(40,24,10,0.3)' },
  ambient: { glowMs: 3200, glowAlpha: 0.18 },
};
// BOARD RELIEF: a light raised bevel on circuit squares and home lanes, same top-left light.
export const relief = {
  square: { hi: 'rgba(255,255,255,0.55)', lo: 'rgba(40,24,10,0.3)', width: 1.5, lift: 1.5, drop: 'rgba(5,12,22,0.22)' },
  lane: { hi: 'rgba(255,255,255,0.45)', lo: 'rgba(30,16,6,0.32)', inset: 'rgba(30,16,6,0.14)', width: 1.5, stripe: 'rgba(255,255,255,0.28)' },
  safe: { glow: 'rgba(255,217,122,0.55)', ring: '#A8741A', star: '#F2B33D', starHi: '#FFE9A8' },
  goal: { rim: '#A8741A', rimHi: '#FFD97A', floor: 'rgba(255,248,226,0.6)' },
  light: { x: -0.5, y: -0.7 },
};
// CHARACTER BUSTS (semi-realistic): extra shading, cloth folds, gloss and proportions used with `crew`.
// Proportions are fractions of the bust box (0..1, origin top-left).
export const bust = {
  frame: { w: 1, h: 1 },
  head: { cx: 0.5, cy: 0.38, rx: 0.2, ry: 0.235 },
  jaw: { taper: 0.82, chin: 0.62 },
  neck: { w: 0.16, top: 0.58, bottom: 0.7 },
  shoulders: { y: 0.7, w: 0.78, slope: 0.07, bottom: 0.98 },
  eyes: { y: 0.38, gap: 0.105, w: 0.062, h: 0.05, pupil: 0.026, glint: 'rgba(255,255,255,0.9)', lid: 'rgba(30,18,8,0.55)' },
  brow: { y: 0.335, w: 0.085, thickness: 0.016, tilt: 4 },
  nose: { y: 0.435, len: 0.04, shade: 'rgba(120,70,40,0.35)' },
  mouth: { y: 0.5, w: 0.1, smile: 0.018 },
  ear: { y: 0.4, w: 0.04, h: 0.07 },
  shade: { face: 'rgba(120,70,40,0.35)', faceDeep: 'rgba(90,50,26,0.45)', under: 'rgba(0,0,0,0.22)', hairHi: 'rgba(255,255,255,0.4)', rim: 'rgba(255,255,255,0.35)' },
  gloss: { skin: 'rgba(255,255,255,0.28)', hair: 'rgba(255,255,255,0.35)', cloth: 'rgba(255,255,255,0.18)' },
  fold: { line: 'rgba(0,0,0,0.22)', hi: 'rgba(255,255,255,0.2)', count: 3 },
  outline: { color: 'rgba(30,18,8,0.7)', width: 1.4 },
  detail: {
    red: {
      hatBrim: 0.34, hatCrown: 0.17, hatHi: 'rgba(255,248,210,0.6)', hatShade: '#B8943A', hatWeave: 'rgba(120,84,20,0.35)',
      scarCx: -0.075, scarCy: 0.025, scarLen: 0.05, vest: '#C9302C', vestShade: '#8E1D1B', vestOpen: 0.1, chest: '#E6B88C',
      grin: true, stitch: 'rgba(255,255,255,0.5)',
    },
    yellow: {
      fringeSweep: 0.55, curl: 0.045, curlBrow: '#8A6A1A', suit: '#1F2A3A', suitHi: '#3A4D66', shirt: '#F6EFDC', tie: '#F2C230', tieShade: '#B8901A',
      lapel: 'rgba(255,255,255,0.18)', cigarette: '#F6EFDC', cigaretteTip: '#FF8A3D', smoke: 'rgba(255,255,255,0.35)', hideEye: true,
    },
    green: {
      spikes: 7, spikeLen: 0.075, hairHi: '#6FC084', bandana: '#1F5A33', robe: '#F1E7D0', robeShade: '#CDBF9C', sash: '#2FA35B', sashShade: '#1C6B3A',
      earrings: 3, earringGap: 0.022, earringHi: '#FFE9A8', scarEye: 'rgba(150,40,30,0.85)', eyeNarrow: 0.8,
    },
    blue: {
      finTop: 0.12, finCount: 3, finHi: '#8DB8DA', brow: 0.9, jaw: 0.9, tooth: '#FFFFFF', shirt: '#2F7FD1', shirtShade: '#1B4F8C', gillLines: 3,
      gill: 'rgba(16,38,74,0.4)', muscle: 'rgba(16,38,74,0.25)', sash: '#F1E7D0', mouthWide: 1.25,
    },
  },
  emblem: { ring: 'rgba(255,255,255,0.55)', ringDark: 'rgba(20,10,2,0.45)', vignette: 'rgba(0,0,0,0.25)', bgLight: 0.35, scale: 1.06, cropY: 0.04 },
  onBoard: { baseShadow: 'rgba(5,12,22,0.5)', baseGloss: 'rgba(255,255,255,0.55)', lift: 0.14, scale: 0.94, rimLight: 'rgba(255,255,255,0.45)' },
};
