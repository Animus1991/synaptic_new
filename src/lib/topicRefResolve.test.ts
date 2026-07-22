import { describe, expect, it } from 'vitest';
import {
  buildTopicIdTitleMap,
  isOpaqueTopicId,
  resolveTopicPrerequisiteTitles,
  resolveTopicRef,
} from './topicRefResolve';
import type { Course, Topic } from '../types';

function topic(partial: Partial<Topic> & Pick<Topic, 'id' | 'title'>): Topic {
  return {
    description: '',
    lessons: [],
    mastery: 0,
    prerequisites: [],
    order: 0,
    isLocked: false,
    estimatedMinutes: 10,
    conceptCount: 1,
    ...partial,
  };
}

describe('topicRefResolve', () => {
  it('detects opaque demo ids', () => {
    expect(isOpaqueTopicId('t1')).toBe(true);
    expect(isOpaqueTopicId('t13')).toBe(true);
    expect(isOpaqueTopicId('Supply & Demand')).toBe(false);
  });

  it('maps t1 → Supply & Demand and hides unresolved opaque ids', () => {
    const courses = [{
      id: 'c1',
      topics: [
        topic({ id: 't1', title: 'Supply & Demand' }),
        topic({ id: 't2', title: 'Consumer Theory', prerequisites: ['t1'] }),
      ],
    }] as Course[];
    const map = buildTopicIdTitleMap(courses);
    expect(resolveTopicRef('t1', map)).toBe('Supply & Demand');
    expect(resolveTopicRef('t99', map)).toBeNull();
    expect(resolveTopicPrerequisiteTitles(courses[0].topics[1], map)).toEqual(['Supply & Demand']);
  });
});
