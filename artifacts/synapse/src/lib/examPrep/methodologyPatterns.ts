export type MethodologyPatternId =
  | 'binary-search'
  | 'bfs'
  | 'dfs'
  | 'stack-lifo'
  | 'queue-fifo'
  | 'sorting-bubble'
  | 'two-pointers';

export type MethodologyPattern = {
  id: MethodologyPatternId;
  titleKey: string;
  summaryKey: string;
  templateKey: string;
  tags: string[];
};

export const METHODOLOGY_PATTERNS: MethodologyPattern[] = [
  {
    id: 'binary-search',
    titleKey: 'examPrepPatternBinarySearch',
    summaryKey: 'examPrepPatternBinarySearchSummary',
    templateKey: 'examPrepPatternBinarySearchTemplate',
    tags: ['search', 'array'],
  },
  {
    id: 'bfs',
    titleKey: 'examPrepPatternBfs',
    summaryKey: 'examPrepPatternBfsSummary',
    templateKey: 'examPrepPatternBfsTemplate',
    tags: ['graph', 'queue'],
  },
  {
    id: 'dfs',
    titleKey: 'examPrepPatternDfs',
    summaryKey: 'examPrepPatternDfsSummary',
    templateKey: 'examPrepPatternDfsTemplate',
    tags: ['graph', 'recursion'],
  },
  {
    id: 'stack-lifo',
    titleKey: 'examPrepPatternStack',
    summaryKey: 'examPrepPatternStackSummary',
    templateKey: 'examPrepPatternStackTemplate',
    tags: ['stack', 'lifo'],
  },
  {
    id: 'queue-fifo',
    titleKey: 'examPrepPatternQueue',
    summaryKey: 'examPrepPatternQueueSummary',
    templateKey: 'examPrepPatternQueueTemplate',
    tags: ['queue', 'fifo'],
  },
  {
    id: 'sorting-bubble',
    titleKey: 'examPrepPatternBubbleSort',
    summaryKey: 'examPrepPatternBubbleSortSummary',
    templateKey: 'examPrepPatternBubbleSortTemplate',
    tags: ['sort', 'array'],
  },
  {
    id: 'two-pointers',
    titleKey: 'examPrepPatternTwoPointers',
    summaryKey: 'examPrepPatternTwoPointersSummary',
    templateKey: 'examPrepPatternTwoPointersTemplate',
    tags: ['array', 'two-pointers'],
  },
];

export function getMethodologyPattern(id: MethodologyPatternId): MethodologyPattern | undefined {
  return METHODOLOGY_PATTERNS.find((p) => p.id === id);
}

export function searchMethodologyPatterns(query: string): MethodologyPattern[] {
  const q = query.trim().toLowerCase();
  if (!q) return METHODOLOGY_PATTERNS;
  return METHODOLOGY_PATTERNS.filter(
    (p) => p.id.includes(q) || p.tags.some((t) => t.includes(q)),
  );
}
