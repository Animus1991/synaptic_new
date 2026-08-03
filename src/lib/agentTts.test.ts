import { describe, expect, it } from 'vitest';
import { plainTextForSpeech } from './agentTts';

describe('plainTextForSpeech', () => {
  it('strips markdown for natural speech', () => {
    expect(plainTextForSpeech('**Hello** `world` [link](https://x.test)')).toBe('Hello world link');
    expect(plainTextForSpeech('```\ncode\n```\nNext')).toContain('Next');
  });
});
