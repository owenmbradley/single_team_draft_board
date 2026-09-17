import type { Position } from '../types';

export const MIN_RATING = 0;
export const MAX_RATING = 5;
export const DEFAULT_RATING = 0;
export const RATING_STEP = 0.1;
export const MAX_TOTAL = MAX_RATING * 2;

const RATING_PRECISION = 10;

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RATING;
  const rounded = Math.round(value * RATING_PRECISION) / RATING_PRECISION;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rounded));
}

export function formatRating(value: number): string {
  const rating = clampRating(value);
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

export function overall(talent: number, vibes: number): number {
  return clampRating(talent) + clampRating(vibes);
}

export function formatOverall(talent: number, vibes: number): string {
  return `${overall(talent, vibes).toFixed(1)}/${MAX_TOTAL}`;
}

export function pipFill(value: number, pipIndex: number): number {
  return Math.min(1, Math.max(0, clampRating(value) - pipIndex));
}

export function parsePosition(value: unknown): Position {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (['g', 'gk', 'goalie', 'goaltender', 'goal', 'goal tender'].includes(raw)) {
    return 'Goalie';
  }
  return 'Skater';
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
