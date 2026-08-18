/**
 * Wave CH-3 — Co-reading hub: explanation challenges + peer dimensions.
 * Grounded in source excerpts (notes), not fiction multiverse.
 * Cached in localStorage; when multi-device sync is on, the Study Room server
 * is the shared copy (see collabReviewSync + /v1/study-rooms/:id/coreading).
 */

import {
  appendContributionEvent,
  hashContent,
  type ContributionEvent,
} from './contributionLedger';

export type PeerDimension =
  | 'clarity'
  | 'sourceGrounding'
  | 'completeness'
  | 'examUsefulness';

export const PEER_DIMENSIONS: PeerDimension[] = [
  'clarity',
  'sourceGrounding',
  'completeness',
  'examUsefulness',
];

export type PeerDimensionVotes = Record<PeerDimension, number>;

export type ExplanationEntry = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  aiAssisted: boolean;
  votes: PeerDimensionVotes;
  voterIds: string[];
  createdAt: string;
  contentHash: string;
  readReceiptIds: string[];
};

export type ExplanationChallenge = {
  id: string;
  roomId: string;
  sourceExcerpt: string;
  sourceRef: string;
  explanations: ExplanationEntry[];
  exemplarId: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  events: ContributionEvent[];
};

export type CoReadingHubStore = {
  roomId: string;
  challenges: ExplanationChallenge[];
};

const STORAGE_PREFIX = 'synapse:coreading:v1:';

function storageKey(roomId: string): string {
  return `${STORAGE_PREFIX}${roomId}`;
}

function emptyVotes(): PeerDimensionVotes {
  return {
    clarity: 0,
    sourceGrounding: 0,
    completeness: 0,
    examUsefulness: 0,
  };
}

export function loadCoReadingHub(roomId: string): CoReadingHubStore {
  if (typeof localStorage === 'undefined') {
    return { roomId, challenges: [] };
  }
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    if (!raw) return { roomId, challenges: [] };
    return JSON.parse(raw) as CoReadingHubStore;
  } catch {
    return { roomId, challenges: [] };
  }
}

export function saveCoReadingHub(store: CoReadingHubStore): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(store.roomId), JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function createExplanationChallenge(
  store: CoReadingHubStore,
  input: {
    sourceExcerpt: string;
    sourceRef?: string;
    createdById: string;
    createdByName: string;
    now?: Date;
  },
): CoReadingHubStore {
  const excerpt = input.sourceExcerpt.trim().slice(0, 2000);
  if (excerpt.length < 8) return store;
  const ts = (input.now ?? new Date()).toISOString();
  const id = `xc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const challenge: ExplanationChallenge = {
    id,
    roomId: store.roomId,
    sourceExcerpt: excerpt,
    sourceRef: (input.sourceRef ?? '').trim().slice(0, 120),
    explanations: [],
    exemplarId: null,
    createdById: input.createdById,
    createdByName: input.createdByName,
    createdAt: ts,
    events: [],
  };
  return {
    ...store,
    challenges: [challenge, ...store.challenges].slice(0, 40),
  };
}

export function submitExplanation(
  store: CoReadingHubStore,
  challengeId: string,
  input: {
    authorId: string;
    authorName: string;
    text: string;
    aiAssisted?: boolean;
    now?: Date;
  },
): CoReadingHubStore {
  const text = input.text.trim().slice(0, 1500);
  if (text.length < 4) return store;
  return {
    ...store,
    challenges: store.challenges.map((ch) => {
      if (ch.id !== challengeId) return ch;
      const id = `xe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const entry: ExplanationEntry = {
        id,
        authorId: input.authorId,
        authorName: input.authorName,
        text,
        aiAssisted: Boolean(input.aiAssisted),
        votes: emptyVotes(),
        voterIds: [],
        createdAt: (input.now ?? new Date()).toISOString(),
        contentHash: hashContent(text),
        readReceiptIds: [],
      };
      const events = appendContributionEvent(ch.events, {
        kind: 'challenge_submit',
        actorId: input.authorId,
        actorName: input.authorName,
        targetId: id,
        content: text,
        aiAssisted: input.aiAssisted,
        now: input.now,
      });
      return { ...ch, explanations: [entry, ...ch.explanations], events };
    }),
  };
}

export function markExplanationRead(
  store: CoReadingHubStore,
  challengeId: string,
  explanationId: string,
  readerId: string,
): CoReadingHubStore {
  return {
    ...store,
    challenges: store.challenges.map((ch) => {
      if (ch.id !== challengeId) return ch;
      return {
        ...ch,
        explanations: ch.explanations.map((ex) => {
          if (ex.id !== explanationId) return ex;
          if (ex.readReceiptIds.includes(readerId)) return ex;
          return { ...ex, readReceiptIds: [...ex.readReceiptIds, readerId] };
        }),
      };
    }),
  };
}

export function scoreExplanation(entry: ExplanationEntry): number {
  return PEER_DIMENSIONS.reduce((s, d) => s + entry.votes[d], 0);
}

export function rankExplanations(challenge: ExplanationChallenge): ExplanationEntry[] {
  return [...challenge.explanations].sort(
    (a, b) => scoreExplanation(b) - scoreExplanation(a) || a.createdAt.localeCompare(b.createdAt),
  );
}

/** Agent-side continuity heuristic: shared tokens between explanation and excerpt. */
export function continuityOverlapScore(excerpt: string, explanation: string): {
  score: number;
  sharedTokens: string[];
  weak: boolean;
} {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4);
  const a = new Set(tokenize(excerpt));
  const b = tokenize(explanation);
  const shared = [...new Set(b.filter((w) => a.has(w)))].slice(0, 12);
  const score = a.size === 0 ? 0 : Math.min(1, shared.length / Math.min(8, a.size));
  return { score, sharedTokens: shared, weak: score < 0.15 && b.length >= 6 };
}

function maxVotes(a: PeerDimensionVotes, b: PeerDimensionVotes): PeerDimensionVotes {
  return {
    clarity: Math.max(a.clarity, b.clarity),
    sourceGrounding: Math.max(a.sourceGrounding, b.sourceGrounding),
    completeness: Math.max(a.completeness, b.completeness),
    examUsefulness: Math.max(a.examUsefulness, b.examUsefulness),
  };
}

function mergeExplanation(a: ExplanationEntry, b: ExplanationEntry): ExplanationEntry {
  return {
    ...a,
    ...b,
    votes: maxVotes(a.votes, b.votes),
    voterIds: [...new Set([...a.voterIds, ...b.voterIds])],
    readReceiptIds: [...new Set([...a.readReceiptIds, ...b.readReceiptIds])],
  };
}

function mergeChallenge(a: ExplanationChallenge, b: ExplanationChallenge): ExplanationChallenge {
  const byId = new Map<string, ExplanationEntry>();
  for (const ex of [...a.explanations, ...b.explanations]) {
    const prev = byId.get(ex.id);
    byId.set(ex.id, prev ? mergeExplanation(prev, ex) : ex);
  }
  return {
    ...a,
    ...b,
    explanations: [...byId.values()],
    exemplarId: b.exemplarId ?? a.exemplarId,
    events: b.events.length >= a.events.length ? b.events : a.events,
  };
}

/** Union challenges/explanations/votes so concurrent device writes do not clobber. */
export function mergeCoReadingHubs(a: CoReadingHubStore, b: CoReadingHubStore): CoReadingHubStore {
  const roomId = a.roomId || b.roomId;
  const byId = new Map<string, ExplanationChallenge>();
  for (const ch of [...a.challenges, ...b.challenges]) {
    const prev = byId.get(ch.id);
    byId.set(ch.id, prev ? mergeChallenge(prev, ch) : ch);
  }
  return {
    roomId,
    challenges: [...byId.values()]
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
      .slice(0, 40),
  };
}

export function setChallengeExemplar(
  store: CoReadingHubStore,
  challengeId: string,
  explanationId: string,
  actor: { id: string; name: string },
  now = new Date(),
): CoReadingHubStore {
  return {
    ...store,
    challenges: store.challenges.map((ch) => {
      if (ch.id !== challengeId) return ch;
      const ex = ch.explanations.find((e) => e.id === explanationId);
      if (!ex) return ch;
      const events = appendContributionEvent(ch.events, {
        kind: 'exemplar',
        actorId: actor.id,
        actorName: actor.name,
        targetId: explanationId,
        content: ex.text,
        aiAssisted: ex.aiAssisted,
        now,
      });
      return { ...ch, exemplarId: explanationId, events };
    }),
  };
}
