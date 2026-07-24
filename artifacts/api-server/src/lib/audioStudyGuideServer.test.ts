import { describe, it, expect } from 'vitest';
import {
  flattenStudyGuideTurns,
  normalizeSectionTurns,
  voiceForPodcastSpeaker,
} from './audioStudyGuideServer';

describe('audioStudyGuideServer multi-speaker', () => {
  it('normalizes structured turns', () => {
    const turns = normalizeSectionTurns({
      title: 'Intro',
      turns: [
        { speaker: 'host', line: 'Welcome back.' },
        { speaker: 'expert', line: 'Today we cover limits.' },
      ],
    });
    expect(turns).toHaveLength(2);
    expect(turns[0]?.speaker).toBe('host');
    expect(turns[1]?.speaker).toBe('expert');
  });

  it('parses Host:/Expert: lines from legacy script', () => {
    const turns = normalizeSectionTurns({
      title: 'Topic',
      script: 'Host: Hello there.\nExpert: Great question about derivatives.',
    });
    expect(turns).toHaveLength(2);
    expect(turns[0]?.line).toContain('Hello');
    expect(turns[1]?.speaker).toBe('expert');
  });

  it('flattens sections in order', () => {
    const flat = flattenStudyGuideTurns([
      {
        title: 'A',
        turns: [{ speaker: 'host', line: 'one' }],
      },
      {
        title: 'B',
        turns: [{ speaker: 'expert', line: 'two' }],
      },
    ]);
    expect(flat).toHaveLength(2);
    expect(flat[1]?.sectionTitle).toBe('B');
  });

  it('maps host and expert to distinct default voices', () => {
    expect(voiceForPodcastSpeaker('host')).not.toBe(voiceForPodcastSpeaker('expert'));
  });
});
