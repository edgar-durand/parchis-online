// Illustrated character poses (WebP, figure trimmed to its silhouette, facing right), served by
// jsDelivr from the public repo edgar-durand/parchis-online-voices pinned to one commit.
// `ar` = width / height of the image; `k` = the figure's height relative to its idle pose (an
// attack crouches, a cheer jumps), so every pose is drawn at the same body scale.
import type { Color } from './types';

export type ArtPose = 'idle' | 'walk' | 'attack' | 'hit' | 'cheer';
export const ART_BASE = 'https://cdn.jsdelivr.net/gh/edgar-durand/parchis-online-voices@b23e11eda0d4a8eb857dc22610dc22fc43b2320d/art/';
export const ART: Record<Color, Record<ArtPose, { ar: number; k: number }>> = {"red": {"idle": {"ar": 0.3273, "k": 1.0}, "walk": {"ar": 0.4341, "k": 1.023}, "attack": {"ar": 0.8091, "k": 0.77}, "hit": {"ar": 0.6205, "k": 0.898}, "cheer": {"ar": 0.6886, "k": 0.823}}, "yellow": {"idle": {"ar": 0.3182, "k": 1.0}, "walk": {"ar": 0.4295, "k": 0.977}, "attack": {"ar": 0.7977, "k": 0.853}, "hit": {"ar": 0.5909, "k": 0.944}, "cheer": {"ar": 0.6909, "k": 0.772}}, "green": {"idle": {"ar": 0.5159, "k": 1.0}, "walk": {"ar": 0.4341, "k": 1.012}, "attack": {"ar": 0.8205, "k": 0.835}, "hit": {"ar": 0.7136, "k": 0.938}, "cheer": {"ar": 0.5818, "k": 0.902}}, "blue": {"idle": {"ar": 0.5932, "k": 1.0}, "walk": {"ar": 0.6045, "k": 0.993}, "attack": {"ar": 0.8886, "k": 0.811}, "hit": {"ar": 0.7455, "k": 0.951}, "cheer": {"ar": 0.6205, "k": 0.926}}};

export function artUrl(color: Color, pose: ArtPose): string {
  return `${ART_BASE}${color}-${pose}.webp`;
}
