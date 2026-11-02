// Illustrated art (WebP, trimmed to the silhouette, characters facing right), served by jsDelivr
// from the public repo edgar-durand/parchis-online-voices pinned to one commit.
// `ar` = width / height of the image; `k` = the figure's height relative to its idle pose (an
// attack crouches, a cheer jumps), so every pose is drawn at the same body scale.
import type { Color } from './types';

export type ArtPose = 'idle' | 'walk' | 'walk2' | 'walk3' | 'attack' | 'hit' | 'cheer';
export const ART_BASE = 'https://cdn.jsdelivr.net/gh/edgar-durand/parchis-online-voices@4fab3a9704871d1964dfae857cca3817a6549d0a/art/';
export const ART: Record<Color, Record<ArtPose, { ar: number; k: number }>> = {"red": {"idle": {"ar": 0.3273, "k": 1.0}, "walk": {"ar": 0.4341, "k": 1.023}, "attack": {"ar": 0.8091, "k": 0.77}, "hit": {"ar": 0.6205, "k": 0.898}, "cheer": {"ar": 0.6886, "k": 0.823}, "walk2": {"ar": 0.4477, "k": 0.937}, "walk3": {"ar": 0.4455, "k": 0.988}}, "yellow": {"idle": {"ar": 0.3182, "k": 1.0}, "walk": {"ar": 0.4295, "k": 0.977}, "attack": {"ar": 0.7977, "k": 0.853}, "hit": {"ar": 0.5909, "k": 0.944}, "cheer": {"ar": 0.6909, "k": 0.772}, "walk2": {"ar": 0.4182, "k": 0.922}, "walk3": {"ar": 0.6295, "k": 0.985}}, "green": {"idle": {"ar": 0.5159, "k": 1.0}, "walk": {"ar": 0.4341, "k": 1.012}, "attack": {"ar": 0.8205, "k": 0.835}, "hit": {"ar": 0.7136, "k": 0.938}, "cheer": {"ar": 0.5818, "k": 0.902}, "walk2": {"ar": 0.4318, "k": 0.998}, "walk3": {"ar": 0.4545, "k": 0.978}}, "blue": {"idle": {"ar": 0.5932, "k": 1.0}, "walk": {"ar": 0.6045, "k": 0.993}, "attack": {"ar": 0.8886, "k": 0.811}, "hit": {"ar": 0.7455, "k": 0.951}, "cheer": {"ar": 0.6205, "k": 0.926}, "walk2": {"ar": 0.5409, "k": 0.961}, "walk3": {"ar": 0.5659, "k": 0.997}}};

export function artUrl(color: Color, pose: ArtPose): string {
  return `${ART_BASE}${color}-${pose}.webp`;
}

// The harbour around the board: ship, flag and the series' animals (ar = width / height).
export type AmbientId = 'camp-red' | 'camp-blue' | 'camp-yellow' | 'camp-green' | 'island' | 'ship' | 'flag' | 'laboon' | 'seaking' | 'newscoo' | 'dendenmushi' | 'karoo';
export const AMBIENT_AR: Record<AmbientId, number> = {"camp-red": 1, "camp-blue": 1, "camp-yellow": 1, "camp-green": 1, "island": 1, "ship": 0.8819, "flag": 1.3043, "laboon": 1.2039, "seaking": 0.6679, "newscoo": 1.4694, "dendenmushi": 1.3575, "karoo": 1.107};
export function ambientUrl(id: AmbientId): string {
  return `${ART_BASE}amb-${id}.webp`;
}
