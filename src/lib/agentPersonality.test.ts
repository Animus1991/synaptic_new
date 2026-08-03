import { describe, expect, it } from 'vitest';
import { buildConversationalCoachingBlock, inferSpeechRegister } from './agentPersonality';
import { emptyCheckIn, markGreetingSent, applyCheckInPatch } from './dailyLearningCheckIn';

describe('agentPersonality', () => {
  it('infers casual vs formal register', () => {
    expect(inferSpeechRegister(['lol idk ρε φίλε'])).toBe('casual');
    expect(inferSpeechRegister(['Could you please explain the theorem regarding elasticity?'])).toBe('formal');
    expect(inferSpeechRegister(['What is supply?'])).toBe('neutral');
  });

  it('includes check-in context and never-insult coaching rules', () => {
    let record = markGreetingSent(emptyCheckIn('2026-07-31'));
    record = applyCheckInPatch(record, { energy: 'low', availableMinutes: 10 });
    const block = buildConversationalCoachingBlock({
      settings: { language: 'el', feedbackTone: 'gentle' } as never,
      mode: 'motivation',
      checkIn: record,
      recentUserTexts: ['ουφ είμαι κουρασμένος'],
    });
    expect(block).toMatch(/Ανθρωποκεντρικό|Human-centered/);
    expect(block).toMatch(/ενέργεια|Energy/i);
    expect(block).toMatch(/Never insult|Ποτέ μην προσβάλλεις/);
  });
});
