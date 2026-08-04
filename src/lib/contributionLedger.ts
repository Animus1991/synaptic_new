/**
 * Academic Collab Hub — append-only contribution ledger (CH-4).
 * Content hashes + chain links; no crypto wallets / blockchain UI.
 */

export const COLLAB_LICENCE_VERSION = 'synapse-course-scoped-v1';

export type ContributionEventKind =
  | 'propose'
  | 'accept'
  | 'reject'
  | 'request_changes'
  | 'vote'
  | 'steward_transfer'
  | 'export'
  | 'exemplar'
  | 'challenge_submit';

export type ContributionEvent = {
  id: string;
  kind: ContributionEventKind;
  actorId: string;
  actorName: string;
  targetId: string;
  contentHash: string;
  licenceVersion: string;
  aiAssisted: boolean;
  ts: string;
  prevEventHash: string | null;
  meta?: Record<string, string>;
};

/** Deterministic FNV-1a 32-bit hex — sync-safe for tests + SSR. */
export function hashContent(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

export function eventChainHash(event: Omit<ContributionEvent, 'prevEventHash'> & { prevEventHash?: string | null }): string {
  return hashContent(
    [
      event.id,
      event.kind,
      event.actorId,
      event.targetId,
      event.contentHash,
      event.ts,
      event.prevEventHash ?? '',
      event.aiAssisted ? '1' : '0',
      event.licenceVersion,
    ].join('|'),
  );
}

export function appendContributionEvent(
  events: ContributionEvent[],
  input: {
    kind: ContributionEventKind;
    actorId: string;
    actorName: string;
    targetId: string;
    content: string;
    aiAssisted?: boolean;
    meta?: Record<string, string>;
    now?: Date;
  },
): ContributionEvent[] {
  const prev = events[events.length - 1] ?? null;
  const ts = (input.now ?? new Date()).toISOString();
  const id = `cev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const contentHash = hashContent(input.content);
  const draft: ContributionEvent = {
    id,
    kind: input.kind,
    actorId: input.actorId,
    actorName: input.actorName,
    targetId: input.targetId,
    contentHash,
    licenceVersion: COLLAB_LICENCE_VERSION,
    aiAssisted: Boolean(input.aiAssisted),
    ts,
    prevEventHash: prev ? eventChainHash(prev) : null,
    meta: input.meta,
  };
  return [...events, draft];
}

export function verifyContributionChain(events: ContributionEvent[]): {
  ok: boolean;
  brokenAt: number | null;
} {
  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i]!;
    if (i === 0) {
      if (ev.prevEventHash != null) return { ok: false, brokenAt: 0 };
      continue;
    }
    const expected = eventChainHash(events[i - 1]!);
    if (ev.prevEventHash !== expected) return { ok: false, brokenAt: i };
  }
  return { ok: true, brokenAt: null };
}

export function verifyContentIntegrity(content: string, expectedHash: string): boolean {
  return hashContent(content) === expectedHash;
}
