/**
 * Synapse MCP tool registry.
 *
 * Every tool is user-scoped through the authenticated account carried on the
 * MCP context, mirroring the isolation of the REST API. Tools read/write the
 * same stores the web app uses (library, RAG index) so external AI clients see
 * exactly the signed-in user's data — nothing more.
 */
import { randomUUID } from 'node:crypto';
import { getLibraryAsync, saveLibraryAsync } from '../store/libraryStore';
import { searchGlobalLibraryGraph } from '../lib/ragServer';
import { upstreamFetch, estimateTokens, type UpstreamUsage } from '../lib/upstream';
import { addUsageAsync } from '../store/accounts';
import { config } from '../config';
import type { McpToolDefinition, McpToolResult, McpContext } from './types';

// ---------------------------------------------------------------------------
// Minimal structural views over the library's `unknown[]` payloads.
// ---------------------------------------------------------------------------

interface StoredLesson {
  id?: string;
  title?: string;
  status?: string;
}
interface StoredTopic {
  id?: string;
  title?: string;
  mastery?: number;
  isLocked?: boolean;
  lessons?: StoredLesson[];
}
interface McpFlashcard {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  source: 'mcp';
}
interface McpAnnotation {
  id: string;
  text: string;
  note?: string;
  createdAt: string;
  source: 'mcp';
}
interface StoredCourse {
  id?: string;
  title?: string;
  subject?: string;
  mastery?: number;
  totalLessons?: number;
  completedLessons?: number;
  examDate?: string;
  status?: string;
  topics?: StoredTopic[];
  /** Flashcards created via MCP write tools (per-account, persisted in library). */
  mcpFlashcards?: McpFlashcard[];
  /** Annotations created via MCP write tools. */
  mcpAnnotations?: McpAnnotation[];
}
interface GlossaryEntry {
  term?: string;
  definition?: string;
  courseId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function textResult(text: string, structured?: Record<string, unknown>): McpToolResult {
  return { content: [{ type: 'text', text }], ...(structured ? { structuredContent: structured } : {}) };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

async function loadCourses(accountId: string): Promise<StoredCourse[]> {
  const library = await getLibraryAsync(accountId);
  return (library.generatedCourses ?? []) as StoredCourse[];
}

function masteryPct(m: number | undefined): string {
  return `${Math.round(Math.max(0, Math.min(1, m ?? 0)) * 100)}%`;
}

function daysUntil(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return undefined;
  return Math.ceil((then - Date.now()) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function echoHandler(args: Record<string, unknown>): Promise<McpToolResult> {
  const message = str(args.message) ?? '';
  return textResult(message, { message });
}

async function listCoursesHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const statusFilter = str(args.status);
  let courses = await loadCourses(ctx.account.id);
  if (statusFilter) courses = courses.filter((c) => c.status === statusFilter);

  const rows = courses.map((c) => ({
    id: c.id ?? '',
    title: c.title ?? 'Untitled course',
    subject: c.subject ?? '',
    mastery: Math.round((c.mastery ?? 0) * 100) / 100,
    totalLessons: c.totalLessons ?? 0,
    completedLessons: c.completedLessons ?? 0,
    status: c.status ?? 'ready',
    examDate: c.examDate,
    daysToExam: daysUntil(c.examDate),
  }));

  if (rows.length === 0) {
    return textResult('You have no Synapse courses yet. Upload notes in the app to generate one.', {
      courses: [],
    });
  }

  const lines = rows.map(
    (r) =>
      `• ${r.title}${r.subject ? ` (${r.subject})` : ''} — mastery ${masteryPct(r.mastery)}, ` +
      `${r.completedLessons}/${r.totalLessons} lessons` +
      (r.daysToExam !== undefined ? `, exam in ${r.daysToExam}d` : '') +
      ` [${r.status}] · id=${r.id}`,
  );
  return textResult(`You have ${rows.length} course(s):\n${lines.join('\n')}`, { courses: rows });
}

async function getCourseOutlineHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const courseId = str(args.courseId);
  if (!courseId) return errorResult('courseId is required.');
  const course = (await loadCourses(ctx.account.id)).find((c) => c.id === courseId);
  if (!course) return errorResult(`No course found with id "${courseId}".`);

  const topics = (course.topics ?? []).map((t) => ({
    id: t.id ?? '',
    title: t.title ?? 'Untitled topic',
    mastery: Math.round((t.mastery ?? 0) * 100) / 100,
    locked: Boolean(t.isLocked),
    lessons: (t.lessons ?? []).map((l) => ({
      id: l.id ?? '',
      title: l.title ?? 'Untitled lesson',
      status: l.status ?? 'available',
    })),
  }));

  const lines = topics.map((t) => {
    const head = `▸ ${t.title} — mastery ${masteryPct(t.mastery)}${t.locked ? ' (locked)' : ''}`;
    const subs = t.lessons.map((l) => `    - ${l.title} [${l.status}] · id=${l.id}`);
    return [head, ...subs].join('\n');
  });

  return textResult(
    `Outline of "${course.title ?? courseId}":\n${lines.join('\n') || '(no topics)'}`,
    { courseId, title: course.title, topics },
  );
}

async function searchLibraryHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const query = str(args.query);
  if (!query) return errorResult('query is required.');
  const topK = clampInt(args.topK, 1, 20, 5);
  const courseId = str(args.courseId);

  try {
    const { hits, indexedChunks, graphExpanded } = await searchGlobalLibraryGraph(ctx.account.id, query, {
      topK,
      courseId,
    });
    await addUsageAsync(ctx.account, estimateTokens(query), 0);

    if (indexedChunks === 0) {
      return textResult(
        'Your library has no indexed content yet. Open the app and sync/index your uploads first.',
        { results: [], indexedChunks: 0 },
      );
    }
    if (hits.length === 0) {
      return textResult(`No relevant passages found for "${query}".`, { results: [], indexedChunks });
    }

    const results = hits.map((h) => ({
      text: h.text,
      score: Math.round(h.score * 1000) / 1000,
      fileName: h.fileName,
      heading: h.heading,
    }));
    const lines = results.map(
      (r, i) =>
        `${i + 1}. [${r.fileName}${r.heading ? ` › ${r.heading}` : ''}] (score ${r.score})\n   ${r.text.slice(0, 400)}`,
    );
    return textResult(
      `Top ${results.length} passage(s) for "${query}"${graphExpanded ? ' (graph-expanded)' : ''}:\n${lines.join('\n\n')}`,
      { results, indexedChunks, graphExpanded },
    );
  } catch {
    return errorResult('Library search failed. Try again later.');
  }
}

async function getProgressHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const courseId = str(args.courseId);
  let courses = await loadCourses(ctx.account.id);
  if (courseId) courses = courses.filter((c) => c.id === courseId);

  if (courses.length === 0) {
    return textResult(courseId ? `No course found with id "${courseId}".` : 'No courses to report on yet.', {
      courses: [],
    });
  }

  const perCourse = courses.map((c) => {
    const weakTopics = (c.topics ?? [])
      .map((t) => ({ title: t.title ?? 'Untitled', mastery: t.mastery ?? 0 }))
      .filter((t) => t.mastery < 0.5)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3);
    return {
      id: c.id ?? '',
      title: c.title ?? 'Untitled course',
      mastery: Math.round((c.mastery ?? 0) * 100) / 100,
      completedLessons: c.completedLessons ?? 0,
      totalLessons: c.totalLessons ?? 0,
      daysToExam: daysUntil(c.examDate),
      weakTopics,
    };
  });

  const overall =
    perCourse.reduce((s, c) => s + c.mastery, 0) / (perCourse.length || 1);

  const lines = perCourse.map((c) => {
    const weak = c.weakTopics.length
      ? ` · weak: ${c.weakTopics.map((w) => `${w.title} (${masteryPct(w.mastery)})`).join(', ')}`
      : '';
    return `• ${c.title}: mastery ${masteryPct(c.mastery)}, ${c.completedLessons}/${c.totalLessons} lessons${
      c.daysToExam !== undefined ? `, exam in ${c.daysToExam}d` : ''
    }${weak}`;
  });

  return textResult(
    `Overall mastery ${masteryPct(overall)} across ${perCourse.length} course(s):\n${lines.join('\n')}`,
    { overallMastery: Math.round(overall * 100) / 100, courses: perCourse },
  );
}

async function listGlossaryHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const search = str(args.search)?.toLowerCase();
  const courseId = str(args.courseId);
  const limit = clampInt(args.limit, 1, 100, 25);

  const library = await getLibraryAsync(ctx.account.id);
  let entries = (library.glossaryEntries ?? []) as GlossaryEntry[];
  if (courseId) entries = entries.filter((e) => !e.courseId || e.courseId === courseId);
  if (search) {
    entries = entries.filter(
      (e) =>
        (e.term ?? '').toLowerCase().includes(search) ||
        (e.definition ?? '').toLowerCase().includes(search),
    );
  }
  const rows = entries.slice(0, limit).map((e) => ({ term: e.term ?? '', definition: e.definition ?? '' }));

  if (rows.length === 0) {
    return textResult('No glossary terms matched.', { terms: [] });
  }
  const lines = rows.map((r) => `• ${r.term}: ${r.definition}`);
  return textResult(`${rows.length} glossary term(s):\n${lines.join('\n')}`, { terms: rows });
}

async function markLessonCompleteHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const courseId = str(args.courseId);
  const lessonId = str(args.lessonId);
  if (!courseId || !lessonId) return errorResult('courseId and lessonId are required.');

  const library = await getLibraryAsync(ctx.account.id);
  const courses = (library.generatedCourses ?? []) as StoredCourse[];
  const course = courses.find((c) => c.id === courseId);
  if (!course) return errorResult(`No course found with id "${courseId}".`);

  let lesson: StoredLesson | undefined;
  for (const topic of course.topics ?? []) {
    lesson = (topic.lessons ?? []).find((l) => l.id === lessonId);
    if (lesson) break;
  }
  if (!lesson) return errorResult(`No lesson found with id "${lessonId}" in course "${courseId}".`);

  const alreadyDone = lesson.status === 'completed';
  lesson.status = 'completed';
  const completedLessons = (course.topics ?? []).reduce(
    (sum, t) => sum + (t.lessons ?? []).filter((l) => l.status === 'completed').length,
    0,
  );
  course.completedLessons = completedLessons;

  await saveLibraryAsync(ctx.account.id, {
    uploadedFiles: library.uploadedFiles ?? [],
    glossaryEntries: library.glossaryEntries ?? [],
    generatedCourses: courses as unknown[],
  });

  return textResult(
    `${alreadyDone ? 'Lesson was already complete.' : 'Marked lesson complete.'} ` +
      `"${course.title ?? courseId}" now at ${completedLessons}/${course.totalLessons ?? completedLessons} lessons.`,
    { courseId, lessonId, completedLessons, totalLessons: course.totalLessons ?? completedLessons, alreadyDone },
  );
}

async function persistCourses(accountId: string, courses: StoredCourse[]): Promise<void> {
  const library = await getLibraryAsync(accountId);
  await saveLibraryAsync(accountId, {
    uploadedFiles: library.uploadedFiles ?? [],
    glossaryEntries: library.glossaryEntries ?? [],
    generatedCourses: courses as unknown[],
  });
}

async function createFlashcardHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const courseId = str(args.courseId);
  const front = str(args.front);
  const back = str(args.back);
  if (!courseId || !front || !back) return errorResult('courseId, front and back are required.');

  const library = await getLibraryAsync(ctx.account.id);
  const courses = (library.generatedCourses ?? []) as StoredCourse[];
  const course = courses.find((c) => c.id === courseId);
  if (!course) return errorResult(`No course found with id "${courseId}".`);

  const card: McpFlashcard = {
    id: `mcpfc-${randomUUID()}`,
    front,
    back,
    createdAt: new Date().toISOString(),
    source: 'mcp',
  };
  course.mcpFlashcards = [...(course.mcpFlashcards ?? []), card];
  await persistCourses(ctx.account.id, courses);

  return textResult(
    `Created flashcard in "${course.title ?? courseId}" (${course.mcpFlashcards.length} MCP card(s) total).`,
    { flashcard: card, totalMcpFlashcards: course.mcpFlashcards.length },
  );
}

async function addAnnotationHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  const courseId = str(args.courseId);
  const text = str(args.text);
  const note = str(args.note);
  if (!courseId || !text) return errorResult('courseId and text are required.');

  const library = await getLibraryAsync(ctx.account.id);
  const courses = (library.generatedCourses ?? []) as StoredCourse[];
  const course = courses.find((c) => c.id === courseId);
  if (!course) return errorResult(`No course found with id "${courseId}".`);

  const annotation: McpAnnotation = {
    id: `mcpann-${randomUUID()}`,
    text,
    ...(note ? { note } : {}),
    createdAt: new Date().toISOString(),
    source: 'mcp',
  };
  course.mcpAnnotations = [...(course.mcpAnnotations ?? []), annotation];
  await persistCourses(ctx.account.id, courses);

  return textResult(
    `Added annotation to "${course.title ?? courseId}" (${course.mcpAnnotations.length} MCP annotation(s) total).`,
    { annotation, totalMcpAnnotations: course.mcpAnnotations.length },
  );
}

async function generateQuizHandler(args: Record<string, unknown>, ctx: McpContext): Promise<McpToolResult> {
  if (!config.upstreamApiKey) {
    return errorResult('Quiz generation requires a server-side LLM key (OPENAI_API_KEY). It is not configured.');
  }
  const topic = str(args.topic);
  const courseId = str(args.courseId);
  const count = clampInt(args.count, 1, 20, 5);
  const lang = str(args.lang) === 'el' ? 'el' : str(args.lang) === 'en' ? 'en' : undefined;

  // Ground the quiz in the user's own material via RAG.
  const courses = await loadCourses(ctx.account.id);
  const course = courseId ? courses.find((c) => c.id === courseId) : undefined;
  if (courseId && !course) return errorResult(`No course found with id "${courseId}".`);

  const retrievalQuery = topic ?? course?.title ?? 'key concepts';
  let context = '';
  try {
    const { hits } = await searchGlobalLibraryGraph(ctx.account.id, retrievalQuery, {
      topK: 6,
      courseId,
    });
    context = hits.map((h) => h.text).join('\n---\n').slice(0, 6000);
  } catch {
    context = '';
  }
  if (!context) {
    return errorResult(
      'No indexed source material found to ground the quiz. Sync/index your library in the app first.',
    );
  }

  const outputLang = lang ?? 'the same language as the source material';
  const system =
    'You are a rigorous exam author. Generate quiz questions ONLY from the provided source material. ' +
    'Never invent facts not present in the source. Return STRICT JSON.';
  const user =
    `Source material:\n"""\n${context}\n"""\n\n` +
    `Create ${count} multiple-choice questions${topic ? ` about "${topic}"` : ''} in ${outputLang}. ` +
    'Return JSON only, shaped as: ' +
    '{"questions":[{"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]}';

  let upstream: Response;
  try {
    upstream = await upstreamFetch('/chat/completions', {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
  } catch {
    return errorResult('Upstream LLM request failed.');
  }
  if (!upstream.ok) {
    return errorResult(`Upstream LLM error (${upstream.status}).`);
  }

  const data = (await upstream.json()) as {
    usage?: UpstreamUsage;
    choices?: { message?: { content?: string } }[];
  };
  await addUsageAsync(ctx.account, data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0);

  const raw = data.choices?.[0]?.message?.content ?? '';
  let parsed: { questions?: unknown[] } | null = null;
  try {
    parsed = JSON.parse(raw) as { questions?: unknown[] };
  } catch {
    parsed = null;
  }
  const questions = Array.isArray(parsed?.questions) ? parsed!.questions : [];
  if (questions.length === 0) {
    return errorResult('The model did not return usable quiz questions. Try again.');
  }

  const summary = questions
    .map((q, i) => {
      const qq = q as { question?: string; options?: string[] };
      const opts = Array.isArray(qq.options) ? qq.options.map((o, j) => `   ${String.fromCharCode(65 + j)}) ${o}`).join('\n') : '';
      return `${i + 1}. ${qq.question ?? ''}\n${opts}`;
    })
    .join('\n\n');

  return textResult(`Generated ${questions.length} question(s) from your material:\n\n${summary}`, {
    questions,
    courseId,
    topic,
  });
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'echo',
    description: 'Connectivity check — returns the message you send. Use to verify the Synapse MCP connection.',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string', description: 'Text to echo back.' } },
      required: ['message'],
    },
    handler: echoHandler,
  },
  {
    name: 'list_courses',
    description: "List the signed-in user's Synapse courses with mastery, lesson counts, and exam dates.",
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Optional status filter (e.g. ready, in-progress, completed).',
        },
      },
    },
    handler: listCoursesHandler,
  },
  {
    name: 'get_course_outline',
    description: 'Get the topic/lesson outline of one course, including per-topic mastery and lock state.',
    inputSchema: {
      type: 'object',
      properties: { courseId: { type: 'string', description: 'The course id (from list_courses).' } },
      required: ['courseId'],
    },
    handler: getCourseOutlineHandler,
  },
  {
    name: 'search_library',
    description:
      "Semantic (Graph-RAG) search over the user's own uploaded notes and documents. Returns grounded passages.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for.' },
        topK: { type: 'number', description: 'Number of passages to return (1-20, default 5).' },
        courseId: { type: 'string', description: 'Optional: restrict to one course.' },
      },
      required: ['query'],
    },
    handler: searchLibraryHandler,
  },
  {
    name: 'get_progress',
    description: 'Report overall and per-course learning progress, including the weakest topics.',
    inputSchema: {
      type: 'object',
      properties: { courseId: { type: 'string', description: 'Optional: one course only.' } },
    },
    handler: getProgressHandler,
  },
  {
    name: 'list_glossary',
    description: "List the user's glossary terms and definitions, optionally filtered by text or course.",
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional case-insensitive filter on term/definition.' },
        courseId: { type: 'string', description: 'Optional: one course only.' },
        limit: { type: 'number', description: 'Max terms to return (1-100, default 25).' },
      },
    },
    handler: listGlossaryHandler,
  },
  {
    name: 'mark_lesson_complete',
    description: 'Mark a lesson as completed and update the course lesson-completion count.',
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'The course id.' },
        lessonId: { type: 'string', description: 'The lesson id (from get_course_outline).' },
      },
      required: ['courseId', 'lessonId'],
    },
    handler: markLessonCompleteHandler,
  },
  {
    name: 'generate_quiz',
    description:
      "Generate multiple-choice questions grounded ONLY in the user's own indexed source material. Requires a server LLM key.",
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Optional: restrict source to one course.' },
        topic: { type: 'string', description: 'Optional topic focus for the questions.' },
        count: { type: 'number', description: 'Number of questions (1-20, default 5).' },
        lang: { type: 'string', enum: ['en', 'el'], description: 'Optional output language.' },
        stream: {
          type: 'boolean',
          description: 'When true with Accept: text/event-stream, progress is streamed via SSE (MCP-01).',
        },
      },
    },
    handler: generateQuizHandler,
  },
  {
    name: 'create_flashcard',
    description: "Create a flashcard (front/back) attached to one of the user's courses.",
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'The course id to attach the card to.' },
        front: { type: 'string', description: 'Front of the card (question/term).' },
        back: { type: 'string', description: 'Back of the card (answer/definition).' },
      },
      required: ['courseId', 'front', 'back'],
    },
    handler: createFlashcardHandler,
  },
  {
    name: 'add_annotation',
    description: "Save an annotation/highlight note against one of the user's courses.",
    inputSchema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'The course id to annotate.' },
        text: { type: 'string', description: 'The highlighted or referenced text.' },
        note: { type: 'string', description: 'Optional personal note about the text.' },
      },
      required: ['courseId', 'text'],
    },
    handler: addAnnotationHandler,
  },
];

export const MCP_TOOL_MAP = new Map(MCP_TOOLS.map((t) => [t.name, t]));

/** Public tool descriptors for `tools/list` (schema without the handler). */
export function listToolDescriptors() {
  return MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}
