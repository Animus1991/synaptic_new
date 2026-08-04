/**
 * Wave CH-2/4 UI — Assignment Canon revision tree, proposals, credits, export.
 */
import { useEffect, useMemo, useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import {
  buildRevisionTree,
  computeCanonCredits,
  ensureAssignmentCanon,
  exportCanonMarkdown,
  markExemplarProposal,
  proposeSectionChange,
  resolveSectionProposal,
  saveAssignmentCanon,
  transferAssignmentSteward,
  updateSectionCanonText,
  type AssignmentCanonDoc,
} from '../lib/assignmentCanon';
import { checkDailyProposalCap, buildVerifyBadge } from '../lib/collabPeerReview';
import { verifyContributionChain, COLLAB_LICENCE_VERSION, hashContent } from '../lib/contributionLedger';
import { AllCapsLabel } from './ui/AllCapsLabel';

type Props = {
  lang: Lang;
  classId: string;
  assignmentId: string;
  assignmentTitle: string;
  actorId: string;
  actorName: string;
  /** Teacher can mark exemplars / act as override steward bootstrap. */
  role: 'teacher' | 'student';
};

export function AssignmentCanonPanel({
  lang,
  classId,
  assignmentId,
  assignmentTitle,
  actorId,
  actorName,
  role,
}: Props) {
  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);
  const [doc, setDoc] = useState<AssignmentCanonDoc>(() =>
    ensureAssignmentCanon({
      assignmentId,
      classId,
      title: assignmentTitle,
      stewardId: actorId,
      stewardName: actorName || 'Steward',
    }),
  );
  const [activeSectionId, setActiveSectionId] = useState(doc.sections[0]?.id ?? 'sec-1');
  const [proposalDraft, setProposalDraft] = useState('');
  const [summary, setSummary] = useState('');
  const [aiAssisted, setAiAssisted] = useState(false);
  const [successorName, setSuccessorName] = useState('');
  const [exportPreview, setExportPreview] = useState<string | null>(null);

  useEffect(() => {
    const next = ensureAssignmentCanon({
      assignmentId,
      classId,
      title: assignmentTitle,
      stewardId: actorId,
      stewardName: actorName || 'Steward',
    });
    setDoc(next);
    setActiveSectionId(next.sections[0]?.id ?? 'sec-1');
  }, [assignmentId, classId, assignmentTitle, actorId, actorName]);

  const tree = useMemo(() => buildRevisionTree(doc), [doc]);
  const credits = useMemo(() => computeCanonCredits(doc), [doc]);
  const chainOk = verifyContributionChain(doc.events).ok;
  const isSteward = doc.stewardId === actorId || role === 'teacher';
  const active = doc.sections.find((s) => s.id === activeSectionId) ?? doc.sections[0];
  const sectionPending = doc.proposals.filter(
    (p) => p.sectionId === active?.id && p.status === 'pending',
  );
  const cap = checkDailyProposalCap(
    doc.proposals.filter((p) => p.authorId === actorId).map((p) => p.createdAt),
  );

  const persist = (next: AssignmentCanonDoc) => {
    saveAssignmentCanon(next);
    setDoc(next);
  };

  const badge = buildVerifyBadge({
    content: active?.canonText ?? '',
    contentHash: hashContent(active?.canonText ?? ''),
    licenceVersion: COLLAB_LICENCE_VERSION,
    aiAssisted: false,
    chainOk,
    lang,
  });

  return (
    <div
      className="mt-3 space-y-3 rounded-xl border border-border-subtle bg-surface-card/50 p-3"
      data-testid="assignment-canon-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-text-primary">
            <AllCapsLabel>{tr('collabCanonTitle')}</AllCapsLabel>
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">{tr('collabCanonHint')}</p>
        </div>
        <span className="text-[10px] text-text-muted" data-testid="assignment-canon-verify">
          {badge.label}
        </span>
      </div>

      <p className="text-[10px] text-text-muted">
        {tr('collabSteward')}: {doc.stewardName}
        {doc.stewardId === actorId ? ` (${tr('collabYou')})` : ''}
      </p>

      <div className="flex flex-wrap gap-1.5" data-testid="assignment-revision-tree">
        {tree.map((node) => (
          <button
            key={node.sectionId}
            type="button"
            onClick={() => setActiveSectionId(node.sectionId)}
            className={`rounded-lg border px-2 py-1.5 text-[10px] min-h-11 ${
              activeSectionId === node.sectionId
                ? 'border-brand-500/40 bg-brand-500/10 text-text-primary'
                : 'border-border-subtle text-text-secondary'
            }`}
            data-testid={`assignment-tree-node-${node.sectionId}`}
          >
            {node.title}
            {node.pendingCount > 0 ? ` · ${node.pendingCount}` : ''}
            <span className="block text-[9px] text-text-muted">{node.status}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="space-y-2">
          <label className="block">
            <span className="ws-field-label"><AllCapsLabel>{active.title}</AllCapsLabel></span>
            <textarea
              value={active.canonText}
              onChange={(e) => {
                if (!isSteward) return;
                persist(updateSectionCanonText(doc, active.id, e.target.value));
              }}
              rows={4}
              readOnly={!isSteward}
              className="ws-field-input text-xs resize-y min-h-[5rem]"
              data-testid="assignment-canon-editor"
            />
          </label>

          <textarea
            value={proposalDraft}
            onChange={(e) => setProposalDraft(e.target.value)}
            rows={3}
            className="ws-field-input text-xs resize-y"
            placeholder={tr('collabProposePlaceholder')}
            data-testid="assignment-section-proposal-draft"
          />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="ws-field-input text-xs"
            placeholder={tr('collabProposalSummary')}
          />
          <label className="flex items-center gap-2 text-[10px] text-text-secondary">
            <input type="checkbox" checked={aiAssisted} onChange={(e) => setAiAssisted(e.target.checked)} />
            {tr('collabAiAssisted')}
          </label>
          <button
            type="button"
            disabled={!proposalDraft.trim() || !cap.allowed}
            className="ws-empty-cta-secondary text-xs min-h-11 disabled:opacity-50"
            data-testid="assignment-section-proposal-submit"
            onClick={() => {
              if (!active || !proposalDraft.trim()) return;
              persist(proposeSectionChange(doc, {
                sectionId: active.id,
                authorId: actorId,
                authorName: actorName || tr('collabAnonymous'),
                proposedText: proposalDraft.trim(),
                summary,
                aiAssisted,
              }));
              setProposalDraft('');
              setSummary('');
              setAiAssisted(false);
            }}
          >
            {tr('collabSubmitProposal')}
          </button>

          {sectionPending.map((p) => (
            <div key={p.id} className="rounded-md border border-border-subtle/60 p-2 space-y-1" data-testid={`assignment-proposal-${p.id}`}>
              <p className="text-[10px] text-text-muted">
                {p.authorName} · {p.aiAssisted ? tr('collabAiAssistedBadge') : tr('collabHumanBadge')}
              </p>
              <pre className="text-[11px] whitespace-pre-wrap max-h-28 overflow-auto">{p.proposedText}</pre>
              {isSteward && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className="ws-chrome-btn text-[10px] px-2 py-1" data-testid={`assignment-accept-${p.id}`} onClick={() => persist(resolveSectionProposal(doc, p.id, 'accepted', { id: doc.stewardId, name: doc.stewardName }))}>
                    {tr('collabAccept')}
                  </button>
                  <button type="button" className="ws-chrome-btn text-[10px] px-2 py-1" onClick={() => persist(resolveSectionProposal(doc, p.id, 'changes_requested', { id: doc.stewardId, name: doc.stewardName }))}>
                    {tr('collabRequestChanges')}
                  </button>
                  <button type="button" className="ws-chrome-btn text-[10px] px-2 py-1" onClick={() => persist(resolveSectionProposal(doc, p.id, 'rejected', { id: doc.stewardId, name: doc.stewardName }))}>
                    {tr('collabReject')}
                  </button>
                  <button type="button" className="ws-chrome-btn text-[10px] px-2 py-1" data-testid={`assignment-exemplar-${p.id}`} onClick={() => persist(markExemplarProposal(doc, p.id, { id: actorId, name: actorName || tr('collabAnonymous') }))}>
                    {tr('collabMarkExemplar')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div data-testid="assignment-canon-credits">
        <p className="text-[10px] font-medium text-text-secondary">{tr('collabAttribution')}</p>
        <ul className="mt-1 space-y-0.5">
          {credits.map((c) => (
            <li key={c.authorId} className="text-[10px] text-text-muted">
              {c.authorName}: {c.sharePercent}%
              {c.acceptedProposals ? ` · ${c.acceptedProposals} ${tr('collabMerged')}` : ''}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ws-empty-cta-secondary text-xs min-h-11"
          data-testid="assignment-canon-export"
          onClick={() => {
            const md = exportCanonMarkdown(doc);
            setExportPreview(md);
            try {
              void navigator.clipboard?.writeText(md);
            } catch {
              /* optional */
            }
          }}
        >
          {tr('collabExportCanon')}
        </button>
      </div>

      {doc.stewardId === actorId && (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={successorName}
            onChange={(e) => setSuccessorName(e.target.value)}
            className="ws-field-input text-xs flex-1 min-w-[8rem]"
            placeholder={tr('collabSuccessorPlaceholder')}
            data-testid="assignment-successor-name"
          />
          <button
            type="button"
            className="ws-chrome-btn text-[10px] px-2 py-1 min-h-11"
            data-testid="assignment-steward-transfer"
            disabled={!successorName.trim()}
            onClick={() => {
              const name = successorName.trim();
              if (!name) return;
              const nextId = `member-${hashContent(name).slice(-8)}`;
              persist(transferAssignmentSteward(doc, { id: nextId, name }, { id: actorId, name: actorName || tr('collabAnonymous') }));
              setSuccessorName('');
            }}
          >
            {tr('collabTransferSteward')}
          </button>
        </div>
      )}

      {exportPreview && (
        <pre className="text-[10px] whitespace-pre-wrap max-h-40 overflow-auto rounded border border-border-subtle p-2" data-testid="assignment-canon-export-preview">
          {exportPreview}
        </pre>
      )}
    </div>
  );
}
