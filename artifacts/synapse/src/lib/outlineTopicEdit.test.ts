import { describe, expect, it } from 'vitest';
import { applyEditedTopicTitles, outlineTopicsWereEdited } from './outlineTopicEdit';
import type { GeneratedOutline } from './courseGenerator';

const base: GeneratedOutline = {
  title: 'Test Course',
  subject: 'General Studies',
  difficulty: 'intermediate',
  summary: 'Summary',
  topics: [
    {
      title: 'Topic A',
      description: 'Desc A',
      concepts: ['alpha'],
      prerequisites: [],
      difficulty: 'beginner',
      estimatedMinutes: 20,
    },
    {
      title: 'Topic B',
      description: 'Desc B',
      concepts: ['beta'],
      prerequisites: [],
      difficulty: 'intermediate',
      estimatedMinutes: 25,
    },
  ],
  glossary: [],
};

describe('outlineTopicEdit', () => {
  it('applies edited titles while preserving topic metadata', () => {
    const edited = applyEditedTopicTitles(base, ['Renamed A', 'Topic B']);
    expect(edited.topics[0]!.title).toBe('Renamed A');
    expect(edited.topics[0]!.concepts).toEqual(['alpha']);
    expect(edited.topics[1]!.title).toBe('Topic B');
  });

  it('detects when titles were edited', () => {
    expect(outlineTopicsWereEdited(base, ['Topic A', 'Topic B'])).toBe(false);
    expect(outlineTopicsWereEdited(base, ['New title', 'Topic B'])).toBe(true);
  });
});
