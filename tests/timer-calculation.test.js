import { describe, expect, it } from 'vitest';
import { calculateActiveSeconds, calculateRemainingSeconds } from '../src/main/timer-calculation.js';

describe('timer calculations', () => {
  it('excludes multiple pauses', () => {
    expect(calculateActiveSeconds({ startedAt: 0, finishedAt: 100000, pauses: [{ pausedAt: 10000, resumedAt: 30000 }, { pausedAt: 50000, resumedAt: 65000 }] })).toBe(65);
  });
  it('excludes an open pause and never returns negative remaining time', () => {
    expect(calculateActiveSeconds({ startedAt: 0, finishedAt: 40000, pauses: [{ pausedAt: 15000, resumedAt: null }] })).toBe(15);
    expect(calculateRemainingSeconds(5, 9)).toBe(0);
  });
});
