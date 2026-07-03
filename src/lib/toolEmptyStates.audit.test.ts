import { describe, expect, it } from 'vitest';
import { buildLeitnerSessionContent } from './leitnerSessionModel';
import { buildCompareSessionContent } from './compareSessionModel';
import { buildDebateSessionContent } from './debateSessionModel';
import { buildSimulatorSessionContent } from './simulatorSessionModel';
import { buildFeynmanSessionContent } from './feynmanSessionModel';
import { buildQuizSessionContent } from './quizSessionModel';
import { buildWhiteboardSessionContent } from './whiteboardSessionModel';
import { buildTimerSessionContent } from './timerSessionModel';
import { buildDashboardSessionContent } from './dashboardSessionModel';
import { buildConceptMapFromCourse } from './noteContentExtractors';

/**
 * Empty-state audit (P0.1 / Sprint C): when there is no uploaded source, every study tool
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

  it('Quiz: no items fabricated', () => {
    const s = buildQuizSessionContent({
      ...base,
      glossary: [],
      ability: 0,
      mastery: 50,
      hasSource: false,
    });
    expect(s.hasSource).toBe(false);
    expect(s.items).toEqual([]);
    expect(s.weakExtraction).toBe(true);
  });

  it('Whiteboard: no formulas fabricated', () => {
    const s = buildWhiteboardSessionContent({ ...base, hasSource: false });
    expect(s.hasSource).toBe(false);
    expect(s.formulas).toEqual([]);
    expect(s.hasReferenceContent).toBe(false);
  });

  it('Timer: upload-gated session with no suggested preset', () => {
    const s = buildTimerSessionContent({
      concept: base.concept,
      lang: 'en',
      hasSource: false,
      conceptMastery: 50,
      scopeKey: 'scope-empty',
    });
    expect(s.hasSource).toBe(false);
    expect(s.weakExtraction).toBe(true);
    expect(s.suggestBreakTool).toBeNull();
  });

  it('Dashboard: no focus tool suggested without source', () => {
    const s = buildDashboardSessionContent({
      concept: base.concept,
      hasSource: false,
      conceptMastery: 50,
      weakSpotCount: 0,
    });
    expect(s.hasSource).toBe(false);
    expect(s.weakExtraction).toBe(true);
    expect(s.suggestFocusTool).toBeNull();
  });

  it('Concept map: no nodes without course topics', () => {
    const map = buildConceptMapFromCourse([], [], [], base.concept);
    expect(map.nodes).toEqual([]);
    expect(map.edges).toEqual([]);
  });
});
