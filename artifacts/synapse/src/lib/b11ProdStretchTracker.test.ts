import { describe, expect, it } from 'vitest';
import {
  appendStretchSample,
  emptyHistory,
  evaluateStretchGateReadiness,
  median,
} from './b11ProdStretchTracker';

describe('b11ProdStretchTracker', () => {
  it('computes median for odd and even counts', () => {
    expect(median([900, 1100, 1300])).toBe(1100);
    expect(median([800, 1000, 1200, 1400])).toBe(1100);
  });

  it('requires N samples before gate readiness', () => {
    let history = emptyHistory(1200, 5);
    for (const ms of [900, 950, 1000, 1100]) {
      history = appendStretchSample(history, { elapsedMs: ms, recordedAt: 't' });
    }
    const pending = evaluateStretchGateReadiness(history, 5);
    expect(pending.ready).toBe(false);
    expect(pending.sampleCount).toBe(4);
  });

  it('marks ready when median is within stretch for N runs', () => {
    let history = emptyHistory(1200, 5);
    for (const ms of [900, 950, 1000, 1100, 1150]) {
      history = appendStretchSample(history, { elapsedMs: ms, recordedAt: 't' });
    }
    const ready = evaluateStretchGateReadiness(history, 5);
    expect(ready.ready).toBe(true);
    expect(ready.medianMs).toBe(1000);
  });

  it('trims to window size', () => {
    let history = emptyHistory(1200, 3);
    for (const ms of [5000, 900, 950, 1000]) {
      history = appendStretchSample(history, { elapsedMs: ms, recordedAt: 't' });
    }
    expect(history.samples).toHaveLength(3);
    expect(history.samples.map((s) => s.elapsedMs)).toEqual([900, 950, 1000]);
  });
});
