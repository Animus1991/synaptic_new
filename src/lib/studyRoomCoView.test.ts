import { describe, expect, it } from 'vitest';
import {
  coViewActionKey,
  coViewFollowActions,
  describeCoViewStatus,
  hasCoViewAction,
} from './studyRoomCoView';

describe('studyRoomCoView', () => {
  it('diffs shared viewport into follow actions', () => {
    const action = coViewFollowActions(
      { tool: 'quiz', concept: 'limits', stepIndex: 2 },
      { tool: 'reader', concept: 'limits', stepIndex: 0 },
    );
    expect(action).toEqual({ tool: 'quiz', stepIndex: 2 });
    expect(hasCoViewAction(action)).toBe(true);
    expect(coViewActionKey(action)).toBe('quiz|2|');
  });

  it('returns empty action when already in sync', () => {
    const action = coViewFollowActions(
      { tool: 'reader', concept: 'series', stepIndex: 1 },
      { tool: 'reader', concept: 'series', stepIndex: 1 },
    );
    expect(action).toEqual({});
    expect(hasCoViewAction(action)).toBe(false);
  });

  it('respects follow flags', () => {
    const action = coViewFollowActions(
      { tool: 'quiz', concept: 'epsilon', stepIndex: 4 },
      { tool: 'reader', concept: 'delta', stepIndex: 0 },
      { followTool: false, followStep: true, followConcept: false },
    );
    expect(action).toEqual({ stepIndex: 4 });
  });

  it('describes leading and following status', () => {
    expect(describeCoViewStatus('en', 'leading', { tool: 'reader', stepIndex: 0 })).toContain('Leading');
    expect(describeCoViewStatus('el', 'following', { leaderName: 'Μαρία', concept: 'όρια' })).toContain('Μαρία');
    expect(describeCoViewStatus('en', 'solo', {})).toContain('Study Room');
  });
});
