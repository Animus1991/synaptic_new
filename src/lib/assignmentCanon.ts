/**
 * Wave CH-2 — Assignment Canon + section revision tree + credits + export.
 */

import {
  appendContributionEvent,
  hashContent,
  type ContributionEvent,
} from './contributionLedger';

export type CanonSection = {
  id: string;
  title: string;
  canonText: string;
  order: number;
};

export type SectionProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'changes_requested';

export type SectionProposal = {
  id: string;
  sectionId: string;
  authorId: string;
  authorName: string;
  baseText: string;
  proposedText: string;
  summary: string;
  status: SectionProposalStatus;
  reviewNote: string;
  aiAssisted: boolean;
  createdAt: string;
  resolvedAt: string | null;
  contentHash: string;
};

export type AssignmentCanonDoc = {
  assignmentId: string;
  classId: string;
  title: string;
  stewardId: string;
  stewardName: string;
  sections: CanonSection[];
  proposals: SectionProposal[];
  events: ContributionEvent[];
  exemplarProposalIds: string[];
  updatedAt: string;
};

const STORAGE_PREFIX = 'synapse:assignment-canon:v1:';

function storageKey(classId: string, assignmentId: string): string {
  return `${STORAGE_PREFIX}${classId}:${assignmentId}`;
}

const DEFAULT_SECTIONS: Array<{ title: string }> = [
  { title: 'Introduction' },
  { title: 'Methods / Approach' },
  { title: 'Analysis' },
  { title: 'Conclusion' },
];

export function createAssignmentCanonDoc(input: {
  assignmentId: string;
  classId: string;
  title: string;
  stewardId: string;
  stewardName: string;
  sectionTitles?: string[];
  now?: Date;
}): AssignmentCanonDoc {
  const ts = (input.now ?? new Date()).toISOString();
  const titles = input.sectionTitles?.length
    ? input.sectionTitles
    : DEFAULT_SECTIONS.map((s) => s.title);
  return {
    assignmentId: input.assignmentId,
    classId: input.classId,
    title: input.title,
    stewardId: input.stewardId,
    stewardName: input.stewardName,
    sections: titles.map((title, order) => ({
      id: `sec-${order + 1}`,
      title,
      canonText: '',
      order,
    })),
    proposals: [],
    events: [],
    exemplarProposalIds: [],
    updatedAt: ts,
  };
}

export function loadAssignmentCanon(
  classId: string,
  assignmentId: string,
): AssignmentCanonDoc | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(classId, assignmentId));
    if (!raw) return null;
    return JSON.parse(raw) as AssignmentCanonDoc;
  } catch {
    return null;
  }
}

export function saveAssignmentCanon(doc: AssignmentCanonDoc): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(doc.classId, doc.assignmentId), JSON.stringify(doc));
  } catch {
    /* quota */
  }
}

export function ensureAssignmentCanon(input: {
  assignmentId: string;
  classId: string;
  title: string;
  stewardId: string;
  stewardName: string;
}): AssignmentCanonDoc {
  const existing = loadAssignmentCanon(input.classId, input.assignmentId);
  if (existing) return existing;
  const created = createAssignmentCanonDoc(input);
  saveAssignmentCanon(created);
  return created;
}

export function updateSectionCanonText(
  doc: AssignmentCanonDoc,
  sectionId: string,
  text: string,
): AssignmentCanonDoc {
  return {
    ...doc,
    sections: doc.sections.map((s) =>
      s.id === sectionId ? { ...s, canonText: text } : s,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function proposeSectionChange(
  doc: AssignmentCanonDoc,
  input: {
    sectionId: string;
    authorId: string;
    authorName: string;
    proposedText: string;
    summary?: string;
    aiAssisted?: boolean;
    now?: Date;
  },
): AssignmentCanonDoc {
  const section = doc.sections.find((s) => s.id === input.sectionId);
  if (!section) return doc;
  const ts = (input.now ?? new Date()).toISOString();
  const id = `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const proposal: SectionProposal = {
    id,
    sectionId: input.sectionId,
    authorId: input.authorId,
    authorName: input.authorName,
    baseText: section.canonText,
    proposedText: input.proposedText,
    summary: (input.summary ?? '').trim().slice(0, 200),
    status: 'pending',
    reviewNote: '',
    aiAssisted: Boolean(input.aiAssisted),
    createdAt: ts,
    resolvedAt: null,
    contentHash: hashContent(input.proposedText),
  };
  const events = appendContributionEvent(doc.events, {
    kind: 'propose',
    actorId: input.authorId,
    actorName: input.authorName,
    targetId: id,
    content: input.proposedText,
    aiAssisted: input.aiAssisted,
    now: input.now,
    meta: { sectionId: input.sectionId },
  });
  return {
    ...doc,
    proposals: [proposal, ...doc.proposals],
    events,
    updatedAt: ts,
  };
}

export function resolveSectionProposal(
  doc: AssignmentCanonDoc,
  proposalId: string,
  decision: Exclude<SectionProposalStatus, 'pending'>,
  actor: { id: string; name: string },
  reviewNote = '',
  now = new Date(),
): AssignmentCanonDoc {
  const proposal = doc.proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== 'pending') return doc;
  if (decision === 'accepted' && actor.id !== doc.stewardId) return doc;

  const kind =
    decision === 'accepted'
      ? 'accept'
      : decision === 'rejected'
        ? 'reject'
        : 'request_changes';

  let sections = doc.sections;
  if (decision === 'accepted') {
    sections = sections.map((s) =>
      s.id === proposal.sectionId ? { ...s, canonText: proposal.proposedText } : s,
    );
  }

  const events = appendContributionEvent(doc.events, {
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
    ...doc,
    sections,
    proposals: doc.proposals.map((p) =>
      p.id === proposalId
        ? {
            ...p,
            status: decision,
            reviewNote: reviewNote.trim().slice(0, 500),
            resolvedAt: now.toISOString(),
          }
        : p,
    ),
    events,
    updatedAt: now.toISOString(),
  };
}

export type CanonCredit = {
  authorId: string;
  authorName: string;
  mergedWords: number;
  acceptedProposals: number;
  reviewActions: number;
  sharePercent: number;
};

export function computeCanonCredits(doc: AssignmentCanonDoc): CanonCredit[] {
  const map = new Map<string, CanonCredit>();
  const ensure = (id: string, name: string) => {
    const row = map.get(id) ?? {
      authorId: id,
      authorName: name,
      mergedWords: 0,
      acceptedProposals: 0,
      reviewActions: 0,
      sharePercent: 0,
    };
    if (name) row.authorName = name;
    map.set(id, row);
    return row;
  };

  ensure(doc.stewardId, doc.stewardName);

  for (const p of doc.proposals) {
    if (p.status !== 'accepted') continue;
    const row = ensure(p.authorId, p.authorName);
    row.acceptedProposals += 1;
    row.mergedWords += p.proposedText.trim().split(/\s+/).filter(Boolean).length;
  }

  for (const ev of doc.events) {
    if (ev.kind === 'accept' || ev.kind === 'reject' || ev.kind === 'request_changes') {
      ensure(ev.actorId, ev.actorName).reviewActions += 1;
    }
  }

  const rows = [...map.values()];
  const weight = (r: CanonCredit) =>
    r.mergedWords + r.acceptedProposals * 40 + r.reviewActions * 15 + (r.authorId === doc.stewardId ? 25 : 0);
  const total = rows.reduce((s, r) => s + weight(r), 0) || 1;
  return rows
    .map((r) => ({
      ...r,
      sharePercent: Math.round((weight(r) / total) * 1000) / 10,
    }))
    .sort((a, b) => b.sharePercent - a.sharePercent);
}

export function exportCanonMarkdown(doc: AssignmentCanonDoc): string {
  const credits = computeCanonCredits(doc);
  const creditLine = credits
    .map((c) => `${c.authorName} (${c.sharePercent}%)`)
    .join(', ');
  const body = [...doc.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => `## ${s.title}\n\n${s.canonText.trim() || '_(empty)_'}`)
    .join('\n\n');
  return [
    `# ${doc.title}`,
    '',
    `_Assignment canon · Steward: ${doc.stewardName}_`,
    `_Credits: ${creditLine || 'n/a'}_`,
    `_Licence: course-scoped · hash-verified contributions_`,
    '',
    body,
    '',
  ].join('\n');
}

export type RevisionTreeNode = {
  sectionId: string;
  title: string;
  order: number;
  canonPreview: string;
  pendingCount: number;
  acceptedCount: number;
  status: 'empty' | 'draft' | 'active_review' | 'stable';
};

export function buildRevisionTree(doc: AssignmentCanonDoc): RevisionTreeNode[] {
  return [...doc.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const related = doc.proposals.filter((p) => p.sectionId === s.id);
      const pendingCount = related.filter((p) => p.status === 'pending').length;
      const acceptedCount = related.filter((p) => p.status === 'accepted').length;
      let status: RevisionTreeNode['status'] = 'empty';
      if (pendingCount > 0) status = 'active_review';
      else if (s.canonText.trim()) status = acceptedCount > 0 ? 'stable' : 'draft';
      return {
        sectionId: s.id,
        title: s.title,
        order: s.order,
        canonPreview: s.canonText.trim().slice(0, 120),
        pendingCount,
        acceptedCount,
        status,
      };
    });
}

export function markExemplarProposal(
  doc: AssignmentCanonDoc,
  proposalId: string,
  actor: { id: string; name: string },
  now = new Date(),
): AssignmentCanonDoc {
  const proposal = doc.proposals.find((p) => p.id === proposalId);
  if (!proposal) return doc;
  if (doc.exemplarProposalIds.includes(proposalId)) return doc;
  const events = appendContributionEvent(doc.events, {
    kind: 'exemplar',
    actorId: actor.id,
    actorName: actor.name,
    targetId: proposalId,
    content: proposal.proposedText,
    aiAssisted: proposal.aiAssisted,
    now,
  });
  return {
    ...doc,
    exemplarProposalIds: [...doc.exemplarProposalIds, proposalId],
    events,
    updatedAt: now.toISOString(),
  };
}

export function transferAssignmentSteward(
  doc: AssignmentCanonDoc,
  next: { id: string; name: string },
  actor: { id: string; name: string },
  now = new Date(),
): AssignmentCanonDoc {
  if (actor.id !== doc.stewardId) return doc;
  const events = appendContributionEvent(doc.events, {
    kind: 'steward_transfer',
    actorId: actor.id,
    actorName: actor.name,
    targetId: next.id,
    content: `steward:${doc.stewardId}->${next.id}`,
    now,
    meta: { nextName: next.name },
  });
  return {
    ...doc,
    stewardId: next.id,
    stewardName: next.name,
    events,
    updatedAt: now.toISOString(),
  };
}
