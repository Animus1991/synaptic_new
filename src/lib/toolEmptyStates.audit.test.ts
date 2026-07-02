import { describe, expect, it } from 'vitest';
import { buildLeitnerSessionContent } from './leitnerSessionModel';
import { buildCompareSessionContent } from './compareSessionModel';
import { buildDebateSessionContent } from './debateSessionModel';
import { buildSimulatorSessionContent } from './simulatorSessionModel';
import { buildFeynmanSessionContent } from './feynmanSessionModel';

/**
 * Empty-state audit (P0.1): when there is no uploaded source, every study tool
 * must yield an *empty* (upload-gated) session — never fabricated / demo rows,
 * cards, trees or parameters. This codifies the fix already applied to the quiz
 * ('- - -' fake options) so no tool can regress into showing fake content.
 */
describe('tool empty-state audit — no fabricated content when hasSource is false', () => {
  const base = { concept: 'Elasticity', text: '', lang: 'en' as const };

  it('Leitner: no cards fabricated', () => {
    const s = buildLeitnerSessionContent({ ...base, glossary: [], hasSource: false });
    expect(s.hasSource).toBe(false);
    expect(s.cards).toEqual([]);
    expect(s.weakExtraction).toBe(true);
  });

  it('Compare: no rows fabricated', () => {
    const s = buildCompareSessionContent({ ...base, glossary: [], hasSource: false });
    expect(s.hasSource).toBe(false);
    expect(s.rows).toEqual([]);
  });

  it('Debate: no argument tree fabricated', () => {
    const s = buildDebateSessionContent({ concept: base.concept, text: '', hasSource: false });
    expect(s.hasSource).toBe(false);
    expect(s.seedTree).toBeNull();
    expect(s.nodeCount).toBe(0);
  });

  it('Debate: empty tree when source has no extractable claims', () => {
    const s = buildDebateSessionContent({
      concept: base.concept,
      text: 'Plain prose without debate structure.',
      hasSource: true,
    });
    expect(s.hasSource).toBe(true);
    expect(s.seedTree).toBeNull();
    expect(s.nodeCount).toBe(0);
  });

  it('Simulator: no numeric parameters fabricated', () => {
    const s = buildSimulatorSessionContent({ ...base, hasSource: false });
    expect(s.hasSource).toBe(false);
    expect(s.numericCues).toEqual([]);
    expect(s.hasActionableContent).toBe(false);
  });

  it('Feynman: returns upload guidance, not fabricated concept content', () => {
    const s = buildFeynmanSessionContent({ ...base, glossary: [], hasSource: false });
    expect(s.weakExtraction).toBe(true);
    expect(s.keyTerms).toEqual([]);
    // Guidance must reference uploading, not present as ready-made answer content.
    expect(s.gapHints.join(' ').toLowerCase()).toContain('upload');
  });
});
