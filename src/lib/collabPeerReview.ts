/**
 * Wave CH-4 — Protected peer review, AI labels, voting gates, succession helpers.
 */

import { appendContributionEvent } from './contributionLedger';
import {
  type CoReadingHubStore,
  type PeerDimension,
  type ExplanationChallenge,
  markExplanationRead,
} from './coReadingHub';
import {
  type AssignmentCanonDoc,
  transferAssignmentSteward,
} from './assignmentCanon';
import {
  type NoteProposalStore,
  transferNoteSteward,
} from './noteProposals';

export type AiAssistLabel = 'human' | 'ai_assisted';

export function normalizeAiAssistLabel(aiAssisted: boolean): AiAssistLabel {
  return aiAssisted ? 'ai_assisted' : 'human';
}

export type VoteGateResult =
  | { ok: true }
  | { ok: false; reason: 'already_voted' | 'not_read' | 'self_vote' | 'missing' };

/**
 * Proof-of-reading gate: voter must have opened the explanation and cannot vote twice / on self.
 */
export function canCastPeerVote(
  challenge: ExplanationChallenge,
  explanationId: string,
  voterId: string,
): VoteGateResult {
  const ex = challenge.explanations.find((e) => e.id === explanationId);
  if (!ex) return { ok: false, reason: 'missing' };
  if (ex.authorId === voterId) return { ok: false, reason: 'self_vote' };
  if (ex.voterIds.includes(voterId)) return { ok: false, reason: 'already_voted' };
  if (!ex.readReceiptIds.includes(voterId)) return { ok: false, reason: 'not_read' };
  return { ok: true };
}

export function castPeerDimensionVote(
  store: CoReadingHubStore,
  challengeId: string,
  explanationId: string,
  voter: { id: string; name: string },
  dimension: PeerDimension,
  now = new Date(),
): { store: CoReadingHubStore; result: VoteGateResult } {
  const challenge = store.challenges.find((c) => c.id === challengeId);
  if (!challenge) return { store, result: { ok: false, reason: 'missing' } };

  let working = markExplanationRead(store, challengeId, explanationId, voter.id);
  const ch = working.challenges.find((c) => c.id === challengeId);
  if (!ch) return { store: working, result: { ok: false, reason: 'missing' } };

  const gate = canCastPeerVote(ch, explanationId, voter.id);
  if (!gate.ok) return { store: working, result: gate };

  const events = appendContributionEvent(ch.events, {
    kind: 'vote',
    actorId: voter.id,
    actorName: voter.name,
    targetId: explanationId,
    content: `${dimension}+1`,
    now,
    meta: { dimension },
  });

  const next: CoReadingHubStore = {
    ...working,
    challenges: working.challenges.map((c) => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        events,
        explanations: c.explanations.map((e) => {
          if (e.id !== explanationId) return e;
          return {
            ...e,
            votes: { ...e.votes, [dimension]: e.votes[dimension] + 1 },
            voterIds: [...e.voterIds, voter.id],
          };
        }),
      };
    }),
  };
  return { store: next, result: { ok: true } };
}

export type DailyProposalCap = {
  allowed: boolean;
  used: number;
  max: number;
};

/** Soft anti-spam: max pending+created proposals per author per day (room or assignment). */
export function checkDailyProposalCap(
  createdAts: string[],
  maxPerDay = 5,
  now = new Date(),
): DailyProposalCap {
  const day = now.toISOString().slice(0, 10);
  const used = createdAts.filter((ts) => ts.startsWith(day)).length;
  return { allowed: used < maxPerDay, used, max: maxPerDay };
}

export function succeedNoteSteward(
  store: NoteProposalStore,
  next: { id: string; name: string },
  actor: { id: string; name: string },
): NoteProposalStore {
  return transferNoteSteward(store, next, actor);
}

export function succeedAssignmentSteward(
  doc: AssignmentCanonDoc,
  next: { id: string; name: string },
  actor: { id: string; name: string },
): AssignmentCanonDoc {
  return transferAssignmentSteward(doc, next, actor);
}

export type VerifyBadge = {
  contentHash: string;
  licenceVersion: string;
  aiLabel: AiAssistLabel;
  chainOk: boolean;
  label: string;
};

export function buildVerifyBadge(input: {
  content: string;
  contentHash: string;
  licenceVersion: string;
  aiAssisted: boolean;
  chainOk: boolean;
  lang?: 'en' | 'el';
}): VerifyBadge {
  const el = input.lang === 'el';
  return {
    contentHash: input.contentHash,
    licenceVersion: input.licenceVersion,
    aiLabel: normalizeAiAssistLabel(input.aiAssisted),
    chainOk: input.chainOk,
    label: el
      ? input.chainOk
        ? 'Συνεισφορά επαληθεύσιμη (hash + ledger)'
        : 'Ledger ασυνεπές — έλεγχος απαιτείται'
      : input.chainOk
        ? 'Contribution verified (hash + ledger)'
        : 'Ledger inconsistent — review needed',
  };
}
