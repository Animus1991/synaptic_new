import { describe, expect, it } from 'vitest';
import { buildMasteryGraph } from '../../components/Analytics';
import { createEmptyLearnerModel } from '../../lib/emptyLearnerState';
import type { Course, Topic } from '../../types';

function topic(id: string, title: string, prerequisites: string[] = []): Topic {
  return {
    id,
    title,
    description: '',
    lessons: [],
    mastery: 50,
    prerequisites,
    order: 0,
    isLocked: false,
    estimatedMinutes: 10,
    conceptCount: 1,
    retentionPrediction: 0.7,
  };
}

function course(id: string, topics: Topic[]): Course {
  return {
    id,
    title: `Course ${id}`,
    description: '',
    subject: 'science',
    color: '#123456',
    icon: 'book',
    totalLessons: 0,
    completedLessons: 0,
    mastery: 50,
    difficulty: 'mixed',
    topics,
    createdAt: '2026-08-01T00:00:00.000Z',
    estimatedHours: 1,
    sourceFiles: [],
    status: 'ready',
    sourceMode: 'strict',
    conceptCount: topics.length,
    glossaryCount: 0,
    exerciseCount: 0,
  };
}

describe('Analytics mastery graph identity', () => {
  it('keeps Greek labels and repeated topic ids collision-free across courses', () => {
    const graph = buildMasteryGraph(createEmptyLearnerModel(), [
      course('physics-a', [topic('t1', 'Δύναμη'), topic('t2', 'Ενέργεια', ['Δύναμη'])]),
      course('physics-b', [topic('t1', 'Δύναμη')]),
    ]);

    expect(graph.nodes).toHaveLength(3);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(3);
    expect(graph.nodes.filter((node) => node.label === 'Δύναμη')).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual({
      from: 'topic:physics-a:t1',
      to: 'topic:physics-a:t2',
      relation: 'prerequisite',
    });
  });
});
