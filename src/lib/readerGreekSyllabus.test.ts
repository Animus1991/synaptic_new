/**
 * Acceptance harness for Greek university syllabus PDFs (Greek university).
 * Composes unit-tested recognition modules into an end-to-end checklist.
 */

import { describe, expect, it } from 'vitest';
import {
  buildReaderSegments,
  detectEnumeratedItems,
  isFrontMatterBlock,
  readerSegmentsToParagraphs,
} from './readerDocumentLayout';
import { collapsePageSections } from './sectionMerger';
import { detectDocumentSections, normalizeDocumentText, PAGE_BREAK_MARKER } from './textSegmentation';
import { buildReaderSectionNavFromSegments } from './readerSectionNav';
import { findTextSpanInFiles } from './findTextSpanInSource';
import type { UploadedFile } from '../types';

const FRONT_MATTER_BODY = [
  '1 ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ',
  '2 E-class Μαθήματος: https://eclass.uoa.gr/courses/ECON196',
  '3 E-mail Επικοινωνίας: nstoupo@econ.uoa.gr',
  '4 Ώρες Διδασκαλίας: Δευτέρα 12:00 - 15:00',
].join('\n');

const LECTURE1_BODY = [
  'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ',
  'Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.',
  'Indicator        Value',
  'Inflation        3.2%',
  'Unemployment     6.1%',
  'Growth           1.8%',
].join('\n');

function buildGreekSyllabusFixture(): string {
  const lecture2 = [
    'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ',
    '$$',
    'E_d = \\frac{\\%\\Delta Q}{\\%\\Delta P}',
    '$$',
    'Inline: $E_d < 0$ για κανονικά αγαθά.',
  ].join('\n');

  const bibliography = [
    'Βιβλιογραφία',
    '[1] Krugman, P. (2018). International Economics. Pearson.',
    '[2] Melitz, M. J. (2003). Econometrica, 71(6), pp. 1695–1725.',
  ].join('\n');

  const filler = Array.from({ length: 8 }, (_, i) => `Σελίδα ${i + 1}`).join('\f');

  return [
    `ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ\n${FRONT_MATTER_BODY}`,
    LECTURE1_BODY,
    lecture2,
    bibliography,
    filler,
  ].join('\f');
}

describe('Greek syllabus recognition (acceptance)', () => {
  const normalized = normalizeDocumentText(buildGreekSyllabusFixture());

  it('detects Greek admin front-matter as ordered enumerated syllabus', () => {
    const items = detectEnumeratedItems(FRONT_MATTER_BODY);
    expect(items).toHaveLength(4);
    expect(isFrontMatterBlock(undefined, FRONT_MATTER_BODY)).toBe(true);
    const segments = buildReaderSegments(FRONT_MATTER_BODY);
    expect(segments.some((s) => s.kind === 'front-matter' || s.kind === 'list')).toBe(true);
  });

  it('merges multi-page PDF sections into lecture units (sectionMerger)', () => {
    const sections = [
      { text: 'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ', boundaryKind: 'page' as const },
      { text: LECTURE1_BODY, boundaryKind: 'page' as const },
      { text: 'Συνέχεια διάλεξης 1.', boundaryKind: 'page' as const },
      { text: 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ\nΑπόλυτα πλεονεκτήματα.', boundaryKind: 'page' as const },
      { text: 'Συνέχεια διάλεξης 2.', boundaryKind: 'page' as const },
      ...Array.from({ length: 8 }, (_, i) => ({
        text: `Σελίδα filler ${i}`,
        boundaryKind: 'page' as const,
      })),
    ];
    const merged = collapsePageSections(sections);
    expect(merged.length).toBeLessThan(sections.length);
    expect(merged.some((s) => /ΔΙΑΛΕΞΗ 1/i.test(s.text) && /Inflation/i.test(s.text))).toBe(true);
  });

  it('emits table segment for fixed-gap macro indicators', () => {
    const segments = buildReaderSegments(LECTURE1_BODY);
    expect(segments.some((s) => s.kind === 'table')).toBe(true);
    expect(segments.some((s) => s.kind === 'heading' && /ΔΙΑΛΕΞΗ 1/i.test(s.content))).toBe(true);
  });

  it('emits math and bibliography in combined syllabus text', () => {
    const segments = buildReaderSegments(normalized);
    expect(segments.some((s) => s.kind === 'math')).toBe(true);
    expect(segments.some((s) => s.kind === 'bibliography')).toBe(true);
    expect(segments.filter((s) => /ΔΙΑΛΕΞΗ/i.test(s.content)).length).toBeGreaterThanOrEqual(2);
  });

  it('builds lecture-only section nav (not per-page §N)', () => {
    const segments = buildReaderSegments(normalized);
    const nav = buildReaderSectionNavFromSegments(segments);
    expect(nav.length).toBeGreaterThanOrEqual(2);
    expect(nav.every((n) => /ΔΙΑΛΕΞΗ/i.test(n.label))).toBe(true);
    expect(nav.some((n) => n.label.includes('§'))).toBe(false);
  });

  it('preserves char offsets for RAG source lookup', () => {
    const segments = buildReaderSegments(normalized);
    const paras = readerSegmentsToParagraphs(segments);
    const file: UploadedFile = {
      id: 'greek-syllabus',
      name: 'diethnis-oikonomiki.pdf',
      type: 'pdf',
      size: normalized.length,
      uploadedAt: new Date().toISOString(),
      status: 'analyzed',
      extractedText: normalized,
      pipelineVersion: '2.2.0',
    };
    const span = findTextSpanInFiles([file], 'Inflation');
    expect(span).not.toBeNull();
    expect(normalized.slice(span!.charStart, span!.charEnd)).toContain('Inflation');
    expect(paras.some((p) => p.paragraph.includes('Krugman') || p.paragraph.includes('Econometrica'))).toBe(true);
  });

  it('preserves form-feed page markers in normalized syllabus text', () => {
    expect(normalized.includes(PAGE_BREAK_MARKER)).toBe(true);
    const raw = detectDocumentSections(normalized);
    expect(raw.length).toBeGreaterThanOrEqual(3);
  });
});
