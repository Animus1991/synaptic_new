import { describe, expect, it } from 'vitest';
import {
  detectBibliographyItems,
  isBibliographyHeading,
  looksLikeCitationLine,
} from './readerBibliography';
import { buildReaderSegments } from './readerDocumentLayout';

describe('isBibliographyHeading', () => {
  it('recognizes Greek and English bibliography headings', () => {
    expect(isBibliographyHeading('Βιβλιογραφία')).toBe(true);
    expect(isBibliographyHeading('References')).toBe(true);
    expect(isBibliographyHeading('Suggested reading')).toBe(true);
    expect(isBibliographyHeading('ΔΙΑΛΕΞΗ 3')).toBe(false);
  });
});

describe('detectBibliographyItems', () => {
  it('detects bracket-numbered references with wrapped lines', () => {
    const body = [
      '[1] Krugman, P., Obstfeld, M. & Melitz, M. (2018). International Economics:',
      'Theory and Policy. Pearson, 11th ed.',
      '[2] Melitz, M. J. (2003). The impact of trade on intra-industry reallocations',
      'and aggregate industry productivity. Econometrica, 71(6), pp. 1695–1725.',
      '[3] Helpman, E. (2011). Understanding Global Trade. Harvard University Press.',
    ].join('\n');
    const items = detectBibliographyItems(body);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(3);
    expect(items![0]).toContain('Krugman');
    expect(items![1]).toContain('Econometrica');
  });

  it('detects author-year citation runs without explicit heading', () => {
    const body = [
      'Krugman, P., Obstfeld, M. (2018). International Economics. Pearson.',
      'Melitz, M. J. (2003). The impact of trade on productivity. Econometrica, 71(6).',
      'Helpman, E. (2011). Understanding Global Trade. Harvard University Press.',
    ].join('\n');
    expect(detectBibliographyItems(body)?.length).toBe(3);
    expect(looksLikeCitationLine(body.split('\n')[0]!)).toBe(true);
  });
});

describe('buildReaderSegments bibliography', () => {
  it('emits bibliography segments under a bibliography heading', () => {
    const text = [
      '## Βιβλιογραφία',
      '',
      '[1] Krugman, P., Obstfeld, M. (2018). International Economics. Pearson.',
      '[2] Melitz, M. J. (2003). Trade and productivity. Econometrica, 71(6), pp. 1695–1725.',
      '[3] Helpman, E. (2011). Understanding Global Trade. Harvard University Press.',
    ].join('\n');
    const segments = buildReaderSegments(text);
    const bib = segments.find((s) => s.kind === 'bibliography');
    expect(bib).toBeDefined();
    expect(bib!.listItems!.length).toBeGreaterThanOrEqual(3);
  });

  it('does not classify syllabus front-matter as bibliography', () => {
    const body = [
      '1 ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ',
      '2 E-class Μαθήματος: https://eclass.uoa.gr/courses/ECON196',
      '3 E-mail Επικοινωνίας: instructor@example.edu',
      '4 Ώρες Διδασκαλίας: Δευτέρα 12:00 - 15:00',
    ].join('\n');
    const segments = buildReaderSegments(body);
    expect(segments.some((s) => s.kind === 'bibliography')).toBe(false);
    expect(segments.some((s) => s.kind === 'front-matter' || s.kind === 'list')).toBe(true);
  });
});
