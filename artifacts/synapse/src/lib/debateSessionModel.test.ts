import { describe, expect, it } from 'vitest';
import {
  buildDebateSessionContent,
  collectDebateTexts,
  countDebateNodes,
  filterDebateTexts,
} from './debateSessionModel';
import type { DebateNode } from './noteContentExtractors';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα μεταξύ δύο χωρών.
Ωστόσο, η προστασία των εγχώριων παραγωγών παραμένει αμφιλεγόμενη.
`.trim();

describe('debateSessionModel', () => {
  it('builds passage-grounded session for generic Introduction concept', () => {
    const session = buildDebateSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
    });

    expect(session.seedTree).not.toBeNull();
    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.nodeCount).toBeGreaterThan(0);
    expect(session.sourceExcerpt.length).toBeGreaterThan(20);
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildDebateSessionContent({
      concept: 'Elasticity',
      text: '',
      hasSource: false,
    });

    expect(session.seedTree).toBeNull();
    expect(session.weakExtraction).toBe(true);
    expect(session.hasSource).toBe(false);
    expect(session.nodeCount).toBe(0);
  });

  it('counts nodes and filters claim texts', () => {
    const tree: DebateNode = {
      id: 'root',
      type: 'claim',
      text: 'Trade creates gains',
      x: 0,
      y: 0,
      children: [
        {
          id: 's0',
          type: 'support',
          text: 'Exports of beans increase welfare',
          x: 0,
          y: 0,
        },
      ],
    };

    expect(countDebateNodes(tree)).toBe(2);
    expect(collectDebateTexts(tree)).toHaveLength(2);
    expect(filterDebateTexts(collectDebateTexts(tree), 'beans')).toEqual([
      'Exports of beans increase welfare',
    ]);
  });
});
