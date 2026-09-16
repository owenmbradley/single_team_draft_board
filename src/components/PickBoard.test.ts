import { describe, expect, it } from 'vitest';
import { visiblePickWindow } from '@/components/PickBoard';

describe('visiblePickWindow', () => {
  it('keeps the current pick visible and includes later occupied picks after a gap', () => {
    expect(visiblePickWindow(1, 100, 5)).toEqual({ start: 1, end: 5 });
    expect(visiblePickWindow(3, 100, 3)).toEqual({ start: 1, end: 3 });
    expect(visiblePickWindow(4, 100, 5)).toEqual({ start: 1, end: 5 });
    expect(visiblePickWindow(50, 100, 8)).toEqual({ start: 43, end: 50 });
    expect(visiblePickWindow(5, 100, 8, 12)).toEqual({ start: 5, end: 12 });
    expect(visiblePickWindow(100, 100, 5)).toEqual({ start: 96, end: 100 });
  });
});
