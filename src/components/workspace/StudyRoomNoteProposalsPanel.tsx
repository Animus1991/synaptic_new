/**
 * Wave CH-1 UI — Propose / review shared-note changes + attribution.
 * Storage is device-local until collab review sync ships (see collabReviewSync).
 */
import { useEffect, useMemo, useState } from 'react';
import { t, type Lang } from '../../lib/i18n';
import {
  attributionFromProposals,
  createNoteProposal,
  ensureNoteProposalStore,
  pendingNoteProposals,
  resolveNoteProposal,
  saveNoteProposalStore,
  type NoteProposalStore,
} from '../../lib/noteProposals';
import { checkDailyProposalCap } from '../../lib/collabPeerReview';
import { verifyContributionChain } from '../../lib/contributionLedger';
import { AllCapsLabel } from '../ui/AllCapsLabel';
import { CollabDeviceLocalBanner } from './CollabDeviceLocalBanner';

type Props = {
  lang: Lang;
  roomId: string;
  memberId: string;
  displayName: string;
  canonText: string;
  onApplyCanon: (next: string) => void;
};

export function StudyRoomNoteProposalsPanel({
  lang,
  roomId,
  memberId,
  displayName,
  canonText,
  onApplyCanon,
}: Props) {
  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);
  const [store, setStore] = useState<NoteProposalStore>(() =>
    ensureNoteProposalStore(roomId, memberId, displayName || 'Steward'),
  );
  const [draft, setDraft] = useState('');
  const [summary, setSummary] = useState('');
  const [aiAssisted, setAiAssisted] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    setStore(ensureNoteProposalStore(roomId, memberId, displayName || 'Steward'));
  }, [roomId, memberId, displayName]);

  const pending = useMemo(() => pendingNoteProposals(store), [store]);
  const credits = useMemo(() => attributionFromProposals(store), [store]);
  const chainOk = verifyContributionChain(store.events).ok;
  const isSteward = store.stewardId === memberId;
  const cap = checkDailyProposalCap(
    store.proposals.filter((p) => p.authorId === memberId).map((p) => p.createdAt),
  );

  const persist = (next: NoteProposalStore) => {
    saveNoteProposalStore(next);
    setStore(next);
  };

  const submit = () => {
    if (!draft.trim() || !cap.allowed) return;
    const next = createNoteProposal(store, {
      authorId: memberId,
      authorName: displayName || tr('collabAnonymous'),
      baseText: canonText,
      proposedText: draft.trim(),
      summary,
      aiAssisted,
    });
    persist(next);
    setDraft('');
    setSummary('');
    setAiAssisted(false);
  };

  const resolve = (id: string, decision: 'accepted' | 'rejected' | 'changes_requested') => {
    const { store: next, acceptedCanon } = resolveNoteProposal(
      store,
      id,
      decision,
      { id: memberId, name: displayName || tr('collabAnonymous') },
      reviewNote,
    );
    persist(next);
    if (acceptedCanon != null) onApplyCanon(acceptedCanon);
    setReviewNote('');
  };

  return (
    <div className="space-y-2 rounded-lg border border-border-subtle/80 bg-surface-card/40 p-2.5" data-testid="study-room-note-proposals">
      <div className="flex items-center justify-between gap-2">
        <p className="ws-field-label"><AllCapsLabel>{tr('collabProposeTitle')}</AllCapsLabel></p>
        <span className="type-caption text-text-muted" data-testid="collab-note-verify">
          {chainOk ? tr('collabVerified') : tr('collabLedgerBroken')}
        </span>
      </div>
      <CollabDeviceLocalBanner lang={lang} surface="proposals" />
      <p className="type-caption text-text-muted">{tr('collabProposeHint')}</p>
      <p className="type-caption text-text-muted">
        {tr('collabSteward')}: {store.stewardName}
        {isSteward ? ` (${tr('collabYou')})` : ''}
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        className="ws-field-input text-xs resize-y min-h-[4rem]"
        placeholder={tr('collabProposePlaceholder')}
        data-testid="collab-note-proposal-draft"
      />
      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="ws-field-input text-xs"
        placeholder={tr('collabProposalSummary')}
        data-testid="collab-note-proposal-summary"
      />
      <label className="flex items-center gap-2 type-caption text-text-secondary">
        <input
          type="checkbox"
          checked={aiAssisted}
          onChange={(e) => setAiAssisted(e.target.checked)}
          data-testid="collab-note-ai-assisted"
        />
        {tr('collabAiAssisted')}
      </label>
      <button
        type="button"
        disabled={!draft.trim() || !cap.allowed}
        onClick={submit}
        className="ws-empty-cta-secondary w-full justify-center text-xs min-h-11 disabled:opacity-50"
        data-testid="collab-note-proposal-submit"
      >
        {cap.allowed
          ? tr('collabSubmitProposal')
          : tr('collabDailyCap').replace('{used}', String(cap.used)).replace('{max}', String(cap.max))}
      </button>

      {pending.length > 0 && (
        <div className="space-y-2" data-testid="collab-note-pending-list">
          <p className="type-caption font-medium text-text-secondary">{tr('collabPending')}</p>
          {pending.map((p) => (
            <div key={p.id} className="rounded-md border border-border-subtle/60 p-2 space-y-1.5" data-testid={`collab-note-proposal-${p.id}`}>
              <p className="type-caption text-text-muted">
                {p.authorName}
                {p.aiAssisted ? ` · ${tr('collabAiAssistedBadge')}` : ` · ${tr('collabHumanBadge')}`}
              </p>
              {p.summary ? <p className="text-[11px] text-text-secondary">{p.summary}</p> : null}
              <pre className="text-[11px] whitespace-pre-wrap text-text-primary max-h-24 overflow-auto">{p.proposedText}</pre>
              {isSteward && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className="ws-chrome-btn type-caption px-2 py-1" data-testid={`collab-note-accept-${p.id}`} onClick={() => resolve(p.id, 'accepted')}>
                    {tr('collabAccept')}
                  </button>
                  <button type="button" className="ws-chrome-btn type-caption px-2 py-1" data-testid={`collab-note-changes-${p.id}`} onClick={() => resolve(p.id, 'changes_requested')}>
                    {tr('collabRequestChanges')}
                  </button>
                  <button type="button" className="ws-chrome-btn type-caption px-2 py-1" data-testid={`collab-note-reject-${p.id}`} onClick={() => resolve(p.id, 'rejected')}>
                    {tr('collabReject')}
                  </button>
                </div>
              )}
            </div>
          ))}
          {isSteward && (
            <input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="ws-field-input text-xs"
              placeholder={tr('collabReviewNote')}
              data-testid="collab-note-review-note"
            />
          )}
        </div>
      )}

      {credits.length > 0 && (
        <div data-testid="collab-note-attribution">
          <p className="type-caption font-medium text-text-secondary">{tr('collabAttribution')}</p>
          <ul className="mt-1 space-y-0.5">
            {credits.map((c) => (
              <li key={c.authorId} className="type-caption text-text-muted">
                {c.authorName}: {c.sharePercent}%
                {c.acceptedCount ? ` · ${c.acceptedCount} ${tr('collabMerged')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
