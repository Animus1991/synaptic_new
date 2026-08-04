import { describe, expect, it } from 'vitest';
import {
  appendContributionEvent,
  hashContent,
  verifyContributionChain,
  verifyContentIntegrity,
} from './contributionLedger';
import {
  attributionFromProposals,
  createNoteProposal,
  emptyNoteProposalStore,
  resolveNoteProposal,
} from './noteProposals';
import {
  buildRevisionTree,
  computeCanonCredits,
  createAssignmentCanonDoc,
  exportCanonMarkdown,
  proposeSectionChange,
  resolveSectionProposal,
} from './assignmentCanon';
import {
  continuityOverlapScore,
  createExplanationChallenge,
  submitExplanation,
} from './coReadingHub';
import {
  castPeerDimensionVote,
  checkDailyProposalCap,
  buildVerifyBadge,
} from './collabPeerReview';

describe('contributionLedger', () => {
  it('hashes stably and verifies chain', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
    expect(hashContent('hello')).not.toBe(hashContent('hello!'));
    let events = appendContributionEvent([], {
      kind: 'propose',
      actorId: 'a',
      actorName: 'A',
      targetId: 't1',
      content: 'alpha',
    });
    events = appendContributionEvent(events, {
      kind: 'accept',
      actorId: 'b',
      actorName: 'B',
      targetId: 't1',
      content: 'alpha',
    });
    expect(verifyContributionChain(events).ok).toBe(true);
    expect(verifyContentIntegrity('alpha', events[0]!.contentHash)).toBe(true);
    const broken = events.map((e, i) => (i === 1 ? { ...e, prevEventHash: 'nope' } : e));
    expect(verifyContributionChain(broken).ok).toBe(false);
  });
});

describe('noteProposals CH-1', () => {
  it('proposes and steward accepts into attribution', () => {
    let store = emptyNoteProposalStore('room1', 'steward', 'Steward');
    store = createNoteProposal(store, {
      authorId: 'u1',
      authorName: 'Ada',
      baseText: 'old',
      proposedText: 'new canon notes about elasticity',
      summary: 'clarify',
    });
    expect(store.proposals[0]!.status).toBe('pending');
    const resolved = resolveNoteProposal(
      store,
      store.proposals[0]!.id,
      'accepted',
      { id: 'steward', name: 'Steward' },
    );
    expect(resolved.acceptedCanon).toContain('elasticity');
    expect(resolved.store.proposals[0]!.status).toBe('accepted');
    const credits = attributionFromProposals(resolved.store);
    expect(credits.some((c) => c.authorId === 'u1' && c.acceptedCount === 1)).toBe(true);
  });

  it('blocks non-steward accept', () => {
    let store = emptyNoteProposalStore('room1', 'steward', 'Steward');
    store = createNoteProposal(store, {
      authorId: 'u1',
      authorName: 'Ada',
      baseText: '',
      proposedText: 'x',
    });
    const resolved = resolveNoteProposal(
      store,
      store.proposals[0]!.id,
      'accepted',
      { id: 'u1', name: 'Ada' },
    );
    expect(resolved.acceptedCanon).toBeNull();
  });
});

describe('assignmentCanon CH-2', () => {
  it('builds tree, merges section, exports markdown with credits', () => {
    let doc = createAssignmentCanonDoc({
      assignmentId: 'a1',
      classId: 'c1',
      title: 'Lab report',
      stewardId: 's1',
      stewardName: 'Sam',
    });
    doc = proposeSectionChange(doc, {
      sectionId: 'sec-1',
      authorId: 'u2',
      authorName: 'Bea',
      proposedText: 'This introduction cites the lecture notes on demand.',
    });
    doc = resolveSectionProposal(
      doc,
      doc.proposals[0]!.id,
      'accepted',
      { id: 's1', name: 'Sam' },
    );
    const tree = buildRevisionTree(doc);
    expect(tree[0]!.acceptedCount).toBe(1);
    expect(tree[0]!.status).toBe('stable');
    const md = exportCanonMarkdown(doc);
    expect(md).toContain('# Lab report');
    expect(md).toContain('Introduction');
    expect(md).toContain('Bea');
    const credits = computeCanonCredits(doc);
    expect(credits[0]!.sharePercent).toBeGreaterThan(0);
  });
});

describe('coReadingHub + peer review CH-3/4', () => {
  it('scores continuity and gates votes with proof-of-reading', () => {
    const overlap = continuityOverlapScore(
      'Price elasticity measures demand response to price changes in microeconomics.',
      'Elasticity of demand shows how quantity responds when price changes.',
    );
    expect(overlap.score).toBeGreaterThan(0.1);
    expect(overlap.sharedTokens.length).toBeGreaterThan(0);

    let hub = createExplanationChallenge(
      { roomId: 'r1', challenges: [] },
      {
        sourceExcerpt: 'Price elasticity measures demand response to price changes.',
        createdById: 's1',
        createdByName: 'Sam',
      },
    );
    const chId = hub.challenges[0]!.id;
    hub = submitExplanation(hub, chId, {
      authorId: 'u1',
      authorName: 'Ada',
      text: 'Elasticity describes demand sensitivity to price.',
    });
    const exId = hub.challenges[0]!.explanations[0]!.id;

    const voted = castPeerDimensionVote(
      hub,
      chId,
      exId,
      { id: 'u2', name: 'Bea' },
      'clarity',
    );
    expect(voted.result.ok).toBe(true);
    expect(voted.store.challenges[0]!.explanations[0]!.votes.clarity).toBe(1);

    const again = castPeerDimensionVote(
      voted.store,
      chId,
      exId,
      { id: 'u2', name: 'Bea' },
      'completeness',
    );
    expect(again.result.ok).toBe(false);

    expect(checkDailyProposalCap(['2026-08-03T10:00:00.000Z'], 2, new Date('2026-08-03T12:00:00.000Z')).allowed).toBe(true);
    expect(checkDailyProposalCap(
      ['2026-08-03T10:00:00.000Z', '2026-08-03T11:00:00.000Z'],
      2,
      new Date('2026-08-03T12:00:00.000Z'),
    ).allowed).toBe(false);

    const badge = buildVerifyBadge({
      content: 'x',
      contentHash: hashContent('x'),
      licenceVersion: 'synapse-course-scoped-v1',
      aiAssisted: false,
      chainOk: true,
      lang: 'en',
    });
    expect(badge.aiLabel).toBe('human');
    expect(badge.label).toMatch(/verified/i);
  });
});
