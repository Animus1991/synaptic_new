import { describe, expect, it } from 'vitest';
import {
  formatCalendarDate,
  formatDateTime,
  formatHeatmapDayTooltip,
  formatRelativeTime,
  localeTag,
} from './localeFormat';

const NOW = new Date('2026-06-23T15:00:00').getTime();

describe('localeFormat', () => {
  it('maps lang to BCP-47 locale tags', () => {
    expect(localeTag('en')).toBe('en-US');
    expect(localeTag('el')).toBe('el-GR');
  });

  it('formats relative time in Greek', () => {
    expect(formatRelativeTime('2026-06-23T14:59:30', 'el', NOW)).toBe('Μόλις τώρα');
    expect(formatRelativeTime('2026-06-23T14:30:00', 'el', NOW)).toBe('πριν 30 λεπτά');
    expect(formatRelativeTime('2026-06-23T10:00:00', 'el', NOW)).toBe('πριν 5 ώρες');
    expect(formatRelativeTime('2026-06-22T15:00:00', 'el', NOW)).toBe('Χθες');
    expect(formatRelativeTime('2026-06-20T15:00:00', 'el', NOW)).toBe('πριν 3 μέρες');
  });

  it('formats relative time in English', () => {
    expect(formatRelativeTime('2026-06-23T14:30:00', 'en', NOW)).toBe('30 min ago');
    expect(formatRelativeTime('2026-06-22T15:00:00', 'en', NOW)).toBe('Yesterday');
  });

  it('formats heatmap tooltips with locale calendar labels', () => {
    const el = formatHeatmapDayTooltip('2026-06-23', 45, 'el');
    const en = formatHeatmapDayTooltip('2026-06-23', 45, 'en');
    expect(el).toContain('45 λεπτά');
    expect(en).toContain('45 min');
    expect(el).not.toBe(en);
  });

  it('formats date-time with el-GR locale', () => {
    const formatted = formatDateTime('2026-06-23T09:30:00', 'el');
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/23/);
  });

  it('formats calendar dates without UTC shift', () => {
    const label = formatCalendarDate('2026-01-15', 'en');
    expect(label).toMatch(/15/);
    expect(label).toMatch(/Jan/i);
  });
});
