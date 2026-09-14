import { describe, expect, it } from 'vitest';
import { visiblePickWindow } from '@/components/PickBoard';

describe('visiblePickWindow', () => {
  it('keeps the current pick at the end so past picks stay visible', () => {
    expect(visiblePickWindow(1, 100, 5)).toEqual({ start: 1, end: 5 });
    expect(visiblePickWindow(3, 100, 3)).toEqual({ start: 1, end: 3 });
    expect(visiblePickWindow(4, 100, 5)).toEqual({ start: 1, end: 5 });
    expect(visiblePickWindow(50, 100, 8)).toEqual({ start: 43, end: 50 });
    expect(visiblePickWindow(98, 100, 5)).toEqual({ start: 94, end: 98 });
    expect(visiblePickWindow(100, 100, 5)).toEqual({ start: 96, end: 100 });
  });
});
