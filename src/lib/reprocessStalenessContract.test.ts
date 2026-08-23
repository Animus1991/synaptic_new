/**
 * Staleness contract: what happens to each data store when a course is reprocessed.
 *
 * Contract:
 *  - Concept bus entries for course file/concept scopes → CLEARED
 *    (signals anchor to source text that changed; old signals would map to wrong content)
 *  - Step schedules → preserved (text-independent memory intervals)
 *  - Quiz attempt histories → preserved (learning history; stale artifact flag blocks new sessions)
 *  - Leitner deck states → preserved (scheduling data; stale flag handles content refresh)
 *  - Quiz/Leitner/Simulator artifact flags → STALE (via markCourseArtifactsStale)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadConceptBus,
  saveConceptBus,
  clearConceptBusForScopes,
} from '../features/workspace/workspacePersistence';
import {
  markCourseArtifactsStale,
  isToolArtifactStale,
  getCourseArtifactStaleness,
} from './artifactStaleness';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

const FAKE_BUS_ENTRY = {
  concept: 'Elasticity',
  key: 'elasticity',
  tools: ['quiz'] as const,
  signals: [],
  firstAt: 1,
  lastAt: 2,
  lastTool: 'quiz' as const,
  struggleScore: 0,
  toolHitCounts: {},
};

describe('Reprocess staleness contract', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    });
  });

  describe('clearConceptBusForScopes', () => {
    it('removes entries for the specified scope keys', () => {
      saveConceptBus('lecture.pdf', { elasticity: FAKE_BUS_ENTRY });
      saveConceptBus('file-abc-123', { supply: { ...FAKE_BUS_ENTRY, concept: 'Supply' } });
      saveConceptBus('concept:Demand', { demand: { ...FAKE_BUS_ENTRY, concept: 'Demand' } });

      clearConceptBusForScopes(['lecture.pdf', 'file-abc-123', 'concept:Demand']);

      expect(loadConceptBus('lecture.pdf')).toBeNull();
      expect(loadConceptBus('file-abc-123')).toBeNull();
      expect(loadConceptBus('concept:Demand')).toBeNull();
    });

    it('preserves concept bus entries for unrelated scopes', () => {
      saveConceptBus('other-course-file.pdf', { gdp: { ...FAKE_BUS_ENTRY, concept: 'GDP' } });
      saveConceptBus('lecture.pdf', { elasticity: FAKE_BUS_ENTRY });

      clearConceptBusForScopes(['lecture.pdf']);

      expect(loadConceptBus('other-course-file.pdf')).not.toBeNull();
    });

    it('is a no-op when the scope does not exist', () => {
      expect(() => clearConceptBusForScopes(['nonexistent-scope'])).not.toThrow();
    });

    it('is a no-op for empty input', () => {
      saveConceptBus('lecture.pdf', { elasticity: FAKE_BUS_ENTRY });
      clearConceptBusForScopes([]);
      expect(loadConceptBus('lecture.pdf')).not.toBeNull();
    });
  });

  describe('markCourseArtifactsStale', () => {
    it('marks quiz, leitner, and simulator as stale', () => {
      markCourseArtifactsStale('course-123', CONTENT_PIPELINE_VERSION);

      expect(isToolArtifactStale('course-123', 'quiz')).toBe(true);
      expect(isToolArtifactStale('course-123', 'leitner')).toBe(true);
      expect(isToolArtifactStale('course-123', 'simulator')).toBe(true);
    });

    it('records the pipeline version at the time of staling', () => {
      markCourseArtifactsStale('course-456', CONTENT_PIPELINE_VERSION);
      const rec = getCourseArtifactStaleness('course-456');
      expect(rec?.processingVersion).toBe(CONTENT_PIPELINE_VERSION);
    });

    it('does not affect other courses', () => {
      markCourseArtifactsStale('course-target', CONTENT_PIPELINE_VERSION);
      expect(isToolArtifactStale('course-other', 'quiz')).toBe(false);
    });
  });
});
