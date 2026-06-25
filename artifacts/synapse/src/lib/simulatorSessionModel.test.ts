import { describe, expect, it } from 'vitest';
import {
  buildSimulatorSessionContent,
  filterNumericCues,
} from './simulatorSessionModel';
import type { NumericCue } from './numericCues';

const GREEK_ECON_PASSAGE = `
Η χώρα μας εξάγει φασόλια, ημεδαπή παραγωγή 100 μονάδες εργασίας.
Εισάγει μπανάνες και χαβιάρι από το εξωτερικό.
Το εμπόριο βασίζεται σε συγκριτικά πλεονεκτήματα· η ελαστικότητα είναι 50%.
`.trim();

describe('simulatorSessionModel', () => {
  it('builds passage-grounded session for generic Introduction concept', () => {
    const session = buildSimulatorSessionContent({
      concept: 'Introduction',
      text: GREEK_ECON_PASSAGE,
      lang: 'en',
      sectionLabel: 'Ricardo trade theory',
      hasSource: true,
    });

    expect(session.hasActionableContent).toBe(true);
    expect(session.passageGrounded).toBe(true);
    expect(session.weakExtraction).toBe(true);
    expect(session.sectionLabel).toBe('Ricardo trade theory');
  });

  it('returns empty session when no source uploaded', () => {
    const session = buildSimulatorSessionContent({
      concept: 'Elasticity',
      text: '',
      lang: 'en',
      hasSource: false,
    });

    expect(session.numericCues).toEqual([]);
    expect(session.hasActionableContent).toBe(false);
    expect(session.weakExtraction).toBe(true);
    expect(session.hasSource).toBe(false);
  });

  it('filters numeric cues by label and context', () => {
    const cues: NumericCue[] = [
      {
        id: 'c0',
        label: '50%',
        baseline: 50,
        min: 20,
        max: 80,
        unit: '%',
        context: 'Price elasticity is 50% when demand shifts.',
      },
      {
        id: 'c1',
        label: '100',
        baseline: 100,
        min: 60,
        max: 140,
        context: 'Labor units of production.',
      },
    ];

    expect(filterNumericCues(cues, 'elasticity')).toHaveLength(1);
    expect(filterNumericCues(cues, '100')).toHaveLength(1);
    expect(filterNumericCues(cues, '')).toEqual(cues);
  });
});
