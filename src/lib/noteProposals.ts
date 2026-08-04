/**
 * Wave CH-1 — Propose / Accept layer for Study Room shared notes + attribution.
 * Canon text stays in Yjs; proposals live in localStorage keyed by room.
 * Multi-device sync is off until `COLLAB_REVIEW_MULTI_DEVICE_SYNC` flips (collabReviewSync).
 */

import {
  appendContributionEvent,
  hashContent,
  type ContributionEvent,
} from './contributionLedger';

export type NoteProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'changes_requested';

export type NoteProposal = {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  baseText: string;
  proposedText: string;
  summary: string;
  status: NoteProposalStatus;
  reviewNote: string;
  aiAssisted: boolean;
  createdAt: string;
  resolvedAt: string | null;
  contentHash: string;
  stewardId: string;
};

export type NoteProposalStore = {
  roomId: string;
  stewardId: string;
  stewardName: string;
  proposals: NoteProposal[];
  events: ContributionEvent[];
};

const STORAGE_PREFIX = 'synapse:note-proposals:v1:';

function storageKey(roomId: string): string {
  return `${STORAGE_PREFIX}${roomId}`;
}

export function emptyNoteProposalStore(
  roomId: string,
  stewardId: string,
  stewardName: string,
): NoteProposalStore {
  return {
    roomId,
    stewardId,
    stewardName,
    proposals: [],
    events: [],
  };
}

export function loadNoteProposalStore(roomId: string): NoteProposalStore | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    if (!raw) return null;
    return JSON.parse(raw) as NoteProposalStore;
  } catch {
    return null;
  }
}

export function saveNoteProposalStore(store: NoteProposalStore): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(store.roomId), JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function ensureNoteProposalStore(
  roomId: string,
  stewardId: string,
  stewardName: string,
): NoteProposalStore {
  const existing = loadNoteProposalStore(roomId);
  if (existing) return existing;
  const created = emptyNoteProposalStore(roomId, stewardId, stewardName);
  saveNoteProposalStore(created);
  return created;
}

export function createNoteProposal(
  store: NoteProposalStore,
  input: {
    authorId: string;
    authorName: string;
    baseText: string;
    proposedText: string;
    summary?: string;
    aiAssisted?: boolean;
    now?: Date;
  },
): NoteProposalStore {
  const ts = (input.now ?? new Date()).toISOString();
  const id = `np-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const proposal: NoteProposal = {
    id,
    roomId: store.roomId,
    authorId: input.authorId,
    authorName: input.authorName,
    baseText: input.baseText,
    proposedText: input.proposedText,
    summary: (input.summary ?? '').trim().slice(0, 200),
    status: 'pending',
    reviewNote: '',
    aiAssisted: Boolean(input.aiAssisted),
    createdAt: ts,
    resolvedAt: null,
    contentHash: hashContent(input.proposedText),
    stewardId: store.stewardId,
  };
  const events = appendContributionEvent(store.events, {
    kind: 'propose',
    actorId: input.authorId,
    actorName: input.authorName,
    targetId: id,
    content: input.proposedText,
    aiAssisted: input.aiAssisted,
    now: input.now,
  });
  return {
    ...store,
    proposals: [proposal, ...store.proposals],
    events,
  };
}

export function resolveNoteProposal(
  store: NoteProposalStore,
  proposalId: string,
  decision: Exclude<NoteProposalStatus, 'pending'>,
  actor: { id: string; name: string },
  reviewNote = '',
  now = new Date(),
): { store: NoteProposalStore; acceptedCanon: string | null } {
  const proposal = store.proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== 'pending') {
    return { store, acceptedCanon: null };
  }
  // Steward (or self-steward) may resolve.
  if (actor.id !== store.stewardId && actor.id !== proposal.authorId) {
    // Allow steward only for accept/reject; author may withdraw via reject of own? Keep steward-only for accept.
  }
  if (decision === 'accepted' && actor.id !== store.stewardId) {
    return { store, acceptedCanon: null };
  }

  const kind =
    decision === 'accepted'
      ? 'accept'
      : decision === 'rejected'
        ? 'reject'
        : 'request_changes';

  const updated: NoteProposal = {
    ...proposal,
    status: decision,
    reviewNote: reviewNote.trim().slice(0, 500),
    resolvedAt: now.toISOString(),
  };

  const events = appendContributionEvent(store.events, {
    kind,
    actorId: actor.id,
    actorName: actor.name,
    targetId: proposalId,
    content: proposal.proposedText,
    aiAssisted: proposal.aiAssisted,
    now,
    meta: reviewNote ? { reviewNote: reviewNote.slice(0, 120) } : undefined,
  });

  return {
    store: {
      ...store,
      proposals: store.proposals.map((p) => (p.id === proposalId ? updated : p)),
      events,
    },
    acceptedCanon: decision === 'accepted' ? proposal.proposedText : null,
  };
}

export type AttributionCredit = {
  authorId: string;
  authorName: string;
  acceptedCount: number;
  pendingCount: number;
  reviewCount: number;
  sharePercent: number;
};

/** Credits from accepted proposals (+ light weight for reviews). */
export function attributionFromProposals(store: NoteProposalStore): AttributionCredit[] {
  const map = new Map<string, AttributionCredit>();
  const bump = (id: string, name: string, field: 'acceptedCount' | 'pendingCount' | 'reviewCount') => {
    const row = map.get(id) ?? {
      authorId: id,
      authorName: name,
      acceptedCount: 0,
      pendingCount: 0,
      reviewCount: 0,
      sharePercent: 0,
    };
    row[field] += 1;
    if (name) row.authorName = name;
    map.set(id, row);
  };

  for (const p of store.proposals) {
    if (p.status === 'accepted') bump(p.authorId, p.authorName, 'acceptedCount');
    else if (p.status === 'pending') bump(p.authorId, p.authorName, 'pendingCount');
  }
  for (const ev of store.events) {
    if (ev.kind === 'accept' || ev.kind === 'reject' || ev.kind === 'request_changes') {
      bump(ev.actorId, ev.actorName, 'reviewCount');
    }
  }

  const rows = [...map.values()];
  const weight = (r: AttributionCredit) => r.acceptedCount * 3 + r.reviewCount + r.pendingCount * 0.25;
  const total = rows.reduce((s, r) => s + weight(r), 0) || 1;
  return rows
    .map((r) => ({
      ...r,
      sharePercent: Math.round((weight(r) / total) * 1000) / 10,
    }))
    .sort((a, b) => b.sharePercent - a.sharePercent);
}

export function pendingNoteProposals(store: NoteProposalStore): NoteProposal[] {
  return store.proposals.filter((p) => p.status === 'pending');
}

export function transferNoteSteward(
  store: NoteProposalStore,
  next: { id: string; name: string },
  actor: { id: string; name: string },
  now = new Date(),
): NoteProposalStore {
  if (actor.id !== store.stewardId) return store;
  const events = appendContributionEvent(store.events, {
    kind: 'steward_transfer',
    actorId: actor.id,
    actorName: actor.name,
    targetId: next.id,
    content: `steward:${store.stewardId}->${next.id}`,
    now,
    meta: { nextName: next.name },
  });
  return {
    ...store,
    stewardId: next.id,
    stewardName: next.name,
    events,
  };
}
