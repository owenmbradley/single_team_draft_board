import { describe, expect, it } from 'vitest';
import {
  clampRating,
  formatOverall,
  formatRating,
  overall,
  parsePosition,
  pipFill,
} from '@/lib/ratings';

describe('ratings', () => {
  it('adds talent and vibes into a total out of 10', () => {
    expect(overall(5, 4)).toBe(9);
    expect(overall(2, 4)).toBe(6);
    expect(overall(4.5, 3.2)).toBe(7.7);
    expect(formatOverall(5, 5)).toBe('10.0/10');
    expect(formatOverall(4.5, 3.2)).toBe('7.7/10');
  });

  it('keeps one decimal on the 1-5 scale', () => {
    expect(clampRating(0)).toBe(1);
    expect(clampRating(9)).toBe(5);
    expect(clampRating(3.24)).toBe(3.2);
    expect(clampRating(3.25)).toBe(3.3);
    expect(clampRating(Number.NaN)).toBe(3);
    expect(formatRating(4)).toBe('4');
    expect(formatRating(4.5)).toBe('4.5');
  });

  it('fills rating circles in proportion to the decimal', () => {
    expect(pipFill(3.7, 0)).toBe(1);
    expect(pipFill(3.7, 2)).toBe(1);
    expect(pipFill(3.7, 3)).toBeCloseTo(0.7);
    expect(pipFill(3.7, 4)).toBe(0);
    expect(pipFill(1, 0)).toBe(1);
  });

  it('treats only goalie labels as Goalie and everything else as Skater', () => {
    expect(parsePosition('G')).toBe('Goalie');
    expect(parsePosition('goaltender')).toBe('Goalie');
    expect(parsePosition('F')).toBe('Skater');
    expect(parsePosition('')).toBe('Skater');
  });
});
