import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../store/libraryStore', () => ({
  getLibraryAsync: vi.fn(),
  saveLibraryAsync: vi.fn(async (_id: string, data: unknown) => data),
}));
vi.mock('../lib/ragServer', () => ({ searchGlobalLibraryGraph: vi.fn() }));
vi.mock('../store/accounts', () => ({ addUsageAsync: vi.fn() }));
vi.mock('../lib/upstream', () => ({
  upstreamFetch: vi.fn(),
  estimateTokens: (t: string) => t.length,
}));
vi.mock('../config', () => ({ config: { upstreamApiKey: '' } }));

import { MCP_TOOL_MAP } from './tools';
import { getLibraryAsync, saveLibraryAsync } from '../store/libraryStore';
import { searchGlobalLibraryGraph } from '../lib/ragServer';
import { addUsageAsync } from '../store/accounts';
import { upstreamFetch } from '../lib/upstream';
import { config } from '../config';
import type { Account } from '../store/accounts';
import type { McpContext } from './types';

const ctx: McpContext = { account: { id: 'acc-1', email: 'u@example.com', plan: 'free' } as Account };

function call(name: string, args: Record<string, unknown> = {}) {
  const tool = MCP_TOOL_MAP.get(name);
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool.handler(args, ctx);
}

function library(over: Partial<{ generatedCourses: unknown[]; glossaryEntries: unknown[] }> = {}) {
  return {
    uploadedFiles: [],
    glossaryEntries: over.glossaryEntries ?? [],
    generatedCourses: over.generatedCourses ?? [],
    updatedAt: '',
  };
}

const sampleCourse = {
  id: 'c1',
  title: 'Thermodynamics',
  subject: 'Physics',
  mastery: 0.6,
  totalLessons: 4,
  completedLessons: 1,
  examDate: new Date(Date.now() + 5 * 86400000).toISOString(),
  status: 'in-progress',
  topics: [
    {
      id: 't1',
      title: 'Entropy',
      mastery: 0.3,
      isLocked: false,
      lessons: [
        { id: 'l1', title: 'Intro', status: 'completed' },
        { id: 'l2', title: 'Second law', status: 'available' },
      ],
    },
    { id: 't2', title: 'Enthalpy', mastery: 0.8, isLocked: true, lessons: [{ id: 'l3', title: 'Basics', status: 'available' }] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  config.upstreamApiKey = '';
});

describe('echo', () => {
  it('returns the message', async () => {
    const res = await call('echo', { message: 'ping-123' });
    expect(res.content[0].text).toBe('ping-123');
    expect(res.structuredContent).toEqual({ message: 'ping-123' });
  });
});

describe('list_courses', () => {
  it('lists courses with mastery and lesson counts', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('list_courses');
    expect(res.content[0].text).toContain('Thermodynamics');
    const courses = (res.structuredContent as { courses: unknown[] }).courses;
    expect(courses).toHaveLength(1);
  });

  it('filters by status', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('list_courses', { status: 'completed' });
    expect((res.structuredContent as { courses: unknown[] }).courses).toHaveLength(0);
  });

  it('handles an empty library', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library());
    const res = await call('list_courses');
    expect(res.content[0].text).toContain('no Synapse courses');
  });
});

describe('get_course_outline', () => {
  it('requires courseId', async () => {
    const res = await call('get_course_outline');
    expect(res.isError).toBe(true);
  });

  it('returns topics and lessons', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('get_course_outline', { courseId: 'c1' });
    expect(res.content[0].text).toContain('Entropy');
    expect(res.content[0].text).toContain('Second law');
    const topics = (res.structuredContent as { topics: unknown[] }).topics;
    expect(topics).toHaveLength(2);
  });

  it('errors on unknown course', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('get_course_outline', { courseId: 'nope' });
    expect(res.isError).toBe(true);
  });
});

describe('search_library', () => {
  it('requires a query', async () => {
    const res = await call('search_library', {});
    expect(res.isError).toBe(true);
  });

  it('returns grounded passages and meters usage', async () => {
    vi.mocked(searchGlobalLibraryGraph).mockResolvedValue({
      hits: [{ id: 'h1', text: 'Entropy always increases.', score: 0.91, fileName: 'notes.pdf', heading: 'Ch3' } as never],
      indexedChunks: 10,
      graphExpanded: true,
    });
    const res = await call('search_library', { query: 'entropy', topK: 3 });
    expect(res.content[0].text).toContain('Entropy always increases');
    expect(res.content[0].text).toContain('graph-expanded');
    expect(addUsageAsync).toHaveBeenCalledOnce();
  });

  it('reports when nothing is indexed', async () => {
    vi.mocked(searchGlobalLibraryGraph).mockResolvedValue({ hits: [], indexedChunks: 0, graphExpanded: false });
    const res = await call('search_library', { query: 'x' });
    expect(res.content[0].text).toContain('no indexed content');
  });
});

describe('get_progress', () => {
  it('reports overall mastery and weak topics', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('get_progress');
    expect(res.content[0].text).toContain('Overall mastery');
    expect(res.content[0].text).toContain('Entropy'); // weak topic < 0.5
    const structured = res.structuredContent as { overallMastery: number };
    expect(structured.overallMastery).toBeGreaterThan(0);
  });
});

describe('list_glossary', () => {
  it('lists and filters terms', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(
      library({
        glossaryEntries: [
          { term: 'Entropy', definition: 'Disorder measure' },
          { term: 'Enthalpy', definition: 'Heat content' },
        ],
      }),
    );
    const all = await call('list_glossary');
    expect((all.structuredContent as { terms: unknown[] }).terms).toHaveLength(2);

    const filtered = await call('list_glossary', { search: 'disorder' });
    expect((filtered.structuredContent as { terms: unknown[] }).terms).toHaveLength(1);
  });
});

describe('mark_lesson_complete', () => {
  it('requires ids', async () => {
    const res = await call('mark_lesson_complete', { courseId: 'c1' });
    expect(res.isError).toBe(true);
  });

  it('marks a lesson complete and recomputes counts', async () => {
    const course = JSON.parse(JSON.stringify(sampleCourse));
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [course] }));
    const res = await call('mark_lesson_complete', { courseId: 'c1', lessonId: 'l2' });
    expect(res.isError).toBeFalsy();
    expect(saveLibraryAsync).toHaveBeenCalledOnce();
    const structured = res.structuredContent as { completedLessons: number };
    expect(structured.completedLessons).toBe(2); // l1 + l2
  });

  it('is idempotent for already-completed lessons', async () => {
    const course = JSON.parse(JSON.stringify(sampleCourse));
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [course] }));
    const res = await call('mark_lesson_complete', { courseId: 'c1', lessonId: 'l1' });
    expect((res.structuredContent as { alreadyDone: boolean }).alreadyDone).toBe(true);
  });

  it('errors on unknown lesson', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('mark_lesson_complete', { courseId: 'c1', lessonId: 'zzz' });
    expect(res.isError).toBe(true);
  });
});

describe('create_flashcard', () => {
  it('requires courseId, front and back', async () => {
    const res = await call('create_flashcard', { courseId: 'c1', front: 'Q' });
    expect(res.isError).toBe(true);
  });

  it('creates and persists a flashcard on the course', async () => {
    const course = JSON.parse(JSON.stringify(sampleCourse));
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [course] }));
    const res = await call('create_flashcard', { courseId: 'c1', front: 'What is entropy?', back: 'Disorder' });
    expect(res.isError).toBeFalsy();
    expect(saveLibraryAsync).toHaveBeenCalledOnce();
    const structured = res.structuredContent as { totalMcpFlashcards: number };
    expect(structured.totalMcpFlashcards).toBe(1);
  });

  it('errors on unknown course', async () => {
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [sampleCourse] }));
    const res = await call('create_flashcard', { courseId: 'zzz', front: 'a', back: 'b' });
    expect(res.isError).toBe(true);
  });
});

describe('add_annotation', () => {
  it('requires courseId and text', async () => {
    const res = await call('add_annotation', { courseId: 'c1' });
    expect(res.isError).toBe(true);
  });

  it('adds and persists an annotation with optional note', async () => {
    const course = JSON.parse(JSON.stringify(sampleCourse));
    vi.mocked(getLibraryAsync).mockResolvedValue(library({ generatedCourses: [course] }));
    const res = await call('add_annotation', { courseId: 'c1', text: 'Key line', note: 'Remember this' });
    expect(res.isError).toBeFalsy();
    expect(saveLibraryAsync).toHaveBeenCalledOnce();
    const structured = res.structuredContent as { annotation: { note?: string }; totalMcpAnnotations: number };
    expect(structured.totalMcpAnnotations).toBe(1);
    expect(structured.annotation.note).toBe('Remember this');
  });
});

describe('generate_quiz', () => {
  it('errors when no upstream key is configured', async () => {
    config.upstreamApiKey = '';
    const res = await call('generate_quiz', { topic: 'entropy' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('LLM key');
  });

  it('errors when no source material is indexed', async () => {
    config.upstreamApiKey = 'sk-test';
    vi.mocked(searchGlobalLibraryGraph).mockResolvedValue({ hits: [], indexedChunks: 0, graphExpanded: false });
    const res = await call('generate_quiz', { topic: 'entropy' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('No indexed source');
  });

  it('generates grounded questions from source and meters usage', async () => {
    config.upstreamApiKey = 'sk-test';
    vi.mocked(searchGlobalLibraryGraph).mockResolvedValue({
      hits: [{ id: 'h1', text: 'Entropy is a measure of disorder.', score: 0.9, fileName: 'n.pdf' } as never],
      indexedChunks: 5,
      graphExpanded: false,
    });
    vi.mocked(upstreamFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        usage: { prompt_tokens: 100, completion_tokens: 50 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: 'What is entropy?',
                    options: ['Disorder', 'Order', 'Energy', 'Mass'],
                    correctIndex: 0,
                    explanation: 'From the source.',
                  },
                ],
              }),
            },
          },
        ],
      }),
    } as unknown as Response);

    const res = await call('generate_quiz', { topic: 'entropy', count: 1 });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('What is entropy?');
    expect((res.structuredContent as { questions: unknown[] }).questions).toHaveLength(1);
    expect(addUsageAsync).toHaveBeenCalledWith(ctx.account, 100, 50);
  });

  it('errors gracefully on upstream failure', async () => {
    config.upstreamApiKey = 'sk-test';
    vi.mocked(searchGlobalLibraryGraph).mockResolvedValue({
      hits: [{ id: 'h1', text: 'Some content.', score: 0.9, fileName: 'n.pdf' } as never],
      indexedChunks: 5,
      graphExpanded: false,
    });
    vi.mocked(upstreamFetch).mockResolvedValue({ ok: false, status: 502 } as unknown as Response);
    const res = await call('generate_quiz', { topic: 'x' });
    expect(res.isError).toBe(true);
  });
});
