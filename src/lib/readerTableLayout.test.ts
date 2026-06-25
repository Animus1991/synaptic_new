import { describe, expect, it } from 'vitest';
import {
  extractReaderTables,
  parseFixedGapColumnTables,
  repairInterleavedTwoColumnText,
} from './readerTableLayout';
import { buildReaderSegments } from './readerDocumentLayout';

describe('parseFixedGapColumnTables', () => {
  it('detects a fixed-gutter two-column block', () => {
    const text = [
      'Country      GDP growth',
      'USA          2.1%',
      'Germany      1.4%',
      'Greece       1.8%',
    ].join('\n');
    const tables = parseFixedGapColumnTables(text);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.headers).toEqual(['Country', 'GDP growth']);
    expect(tables[0]!.rows).toHaveLength(3);
    expect(tables[0]!.rows[0]).toEqual(['USA', '2.1%']);
  });
});

describe('repairInterleavedTwoColumnText', () => {
  it('merges interleaved PDF column lines into gutter rows', () => {
    const interleaved = [
      'Exports rose',
      'Imports fell',
      'Trade balance',
      'Current account',
      'FDI inflows',
      'FDI outflows',
    ].join('\n');
    const repaired = repairInterleavedTwoColumnText(interleaved);
    expect(repaired).toContain('Exports rose');
    expect(repaired).toMatch(/Exports rose\s{3,}Imports fell/);
    const tables = extractReaderTables(repaired);
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildReaderSegments tables', () => {
  it('emits table segments for markdown pipe tables', () => {
    const text = [
      '## Trade indicators',
      '',
      '| Country | Exports | Imports |',
      '| --- | --- | --- |',
      '| USA | 2.1T | 2.8T |',
      '| DEU | 1.6T | 1.4T |',
    ].join('\n');
    const segments = buildReaderSegments(text);
    expect(segments.some((s) => s.kind === 'table')).toBe(true);
    const table = segments.find((s) => s.kind === 'table');
    expect(table?.table?.headers).toContain('Country');
    expect(table?.table?.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('emits table segments for fixed-gap PDF columns', () => {
    const text = [
      'ΔΙΑΛΕΞΗ 3 MACRO DATA',
      'Indicator        Value',
      'Inflation        3.2%',
      'Unemployment     6.1%',
      'Growth           1.8%',
    ].join('\n');
    const segments = buildReaderSegments(text);
    expect(segments.some((s) => s.kind === 'table')).toBe(true);
  });
});
