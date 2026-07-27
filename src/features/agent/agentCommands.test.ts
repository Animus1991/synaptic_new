import { describe, expect, it } from 'vitest';
import {
  parseAgentCommand,
  buildNoAnswerHintPrompt,
  buildLowRetrievalClarification,
} from './agentCommands';

describe('parseAgentCommand', () => {
  it('returns null for normal text', () => {
    expect(parseAgentCommand('Explain elasticity')).toBeNull();
  });

  it('expands /quiz with topic', () => {
    const parsed = parseAgentCommand('/quiz tariffs');
    expect(parsed?.command).toBe('quiz');
    expect(parsed?.args).toBe('tariffs');
    expect(parsed?.expandedPrompt).toContain('tariffs');
    expect(parsed?.expandedPrompt).toContain('quiz');
  });

  it('expands /compare with vs separator', () => {
    const parsed = parseAgentCommand('/compare monopoly vs perfect competition');
    expect(parsed?.command).toBe('compare');
    expect(parsed?.expandedPrompt).toContain('monopoly');
    expect(parsed?.expandedPrompt).toContain('perfect competition');
  });

  it('supports Greek compare separator', () => {
    const parsed = parseAgentCommand('/compare α και β', 'el');
    expect(parsed?.command).toBe('compare');
    expect(parsed?.expandedPrompt).toContain('α');
    expect(parsed?.expandedPrompt).toContain('β');
  });

  it('expands /explain and /summarize', () => {
    expect(parseAgentCommand('/explain GDP')?.command).toBe('explain');
    expect(parseAgentCommand('/summarize chapter 3')?.command).toBe('summarize');
  });
});

describe('hint builders', () => {
  it('builds bilingual no-answer hint', () => {
    expect(buildNoAnswerHintPrompt('en')).toContain("Don't give me");
    expect(buildNoAnswerHintPrompt('el')).toContain('Μη μου δώσεις');
  });

  it('builds low retrieval clarification', () => {
    expect(buildLowRetrievalClarification('en')).toContain('clarifying');
    expect(buildLowRetrievalClarification('el')).toContain('διευκρινιστικές');
  });
});
