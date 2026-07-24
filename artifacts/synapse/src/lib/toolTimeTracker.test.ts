import { describe, expect, it } from 'vitest';
import {
  buildToolTimeBreakdown,
  createToolTimeState,
  formatToolTimeMinutes,
  snapshotToolTimeMs,
  switchToolTime,
} from './toolTimeTracker';

describe('toolTimeTracker (TOOL-PR-02)', () => {
  it('accumulates dwell when switching tools', () => {
    let state = createToolTimeState();
    state = switchToolTime(state, 'reader', 1_000);
    state = switchToolTime(state, 'quiz', 31_000);
    expect(state.msByTool.reader).toBe(30_000);
    expect(state.activeTool).toBe('quiz');
  });

  it('snapshots open segment', () => {
    let state = createToolTimeState();
    state = switchToolTime(state, 'simulator', 0);
    const snap = snapshotToolTimeMs(state, 90_000);
    expect(snap.simulator).toBe(90_000);
  });

  it('formats minutes', () => {
    expect(formatToolTimeMinutes(90_000)).toBe('2m');
    expect(formatToolTimeMinutes(5_000)).toBe('<1m');
  });

  it('builds sorted breakdown', () => {
    const rows = buildToolTimeBreakdown({ quiz: 120_000, reader: 60_000 });
    expect(rows[0]!.tool).toBe('quiz');
    expect(rows[0]!.minutesLabel).toBe('2m');
  });
});
