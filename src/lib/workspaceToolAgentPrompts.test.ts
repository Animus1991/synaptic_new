import { describe, it, expect } from 'vitest';
import {
  TOOL_AGENT_MODES,
  buildToolDefaultAgentPrompt,
  resolveRemediationAgentMode,
  resolveScratchpadNoteAgentMode,
  resolveToolAgentMode,
} from './workspaceToolAgentPrompts';

describe('workspaceToolAgentPrompts', () => {
  it('assigns distinct modes per tool', () => {
    expect(TOOL_AGENT_MODES.quiz).toBe('error-diagnosis');
    expect(TOOL_AGENT_MODES.feynman).toBe('feynman');
    expect(TOOL_AGENT_MODES.debate).toBe('debate');
    expect(TOOL_AGENT_MODES.leitner).toBe('memory-coach');
    expect(TOOL_AGENT_MODES.timer).toBe('motivation');
  });

  it('uses socratic for reader selection', () => {
    expect(resolveToolAgentMode('reader', 'selection')).toBe('socratic');
    expect(resolveToolAgentMode('quiz', 'selection')).toBe('error-diagnosis');
  });

  it('uses feynman mode for quiz-mistake intent', () => {
    expect(resolveToolAgentMode('quiz', 'quiz-mistake')).toBe('feynman');
  });

  it('builds default prompt with concept', () => {
    const prompt = buildToolDefaultAgentPrompt('compare', 'en', 'Tariffs', 'Lecture 3');
    expect(prompt).toContain('Compare');
    expect(prompt).toContain('Tariffs');
    expect(prompt).toContain('Lecture 3');
  });

  it('maps remediation actions to modes', () => {
    expect(resolveRemediationAgentMode('explain')).toBe('beginner');
    expect(resolveRemediationAgentMode('quiz')).toBe('error-diagnosis');
    expect(resolveRemediationAgentMode('flashcards')).toBe('memory-coach');
  });

  it('uses writing-coach for scratchpad self-explanation', () => {
    expect(resolveScratchpadNoteAgentMode('self-explanation')).toBe('writing-coach');
    expect(resolveScratchpadNoteAgentMode('notes')).toBe('math-tutor');
  });

  it('uses socratic for whiteboard diagram coach intents', () => {
    expect(resolveToolAgentMode('whiteboard', 'diagram-coach')).toBe('socratic');
    expect(resolveToolAgentMode('whiteboard', 'diagram-critique')).toBe('socratic');
    expect(resolveToolAgentMode('whiteboard', 'diagram-explain')).toBe('socratic');
  });
});
