/**
 * Wave CH-3/4 UI β€” Co-reading explanation challenges + protected peer votes.
 * Storage is device-local until collab review sync ships (see collabReviewSync).
 */
import { useEffect, useState } from 'react';
import { t, type Lang } from '../../lib/i18n';
import {
  PEER_DIMENSIONS,
  continuityOverlapScore,
  createExplanationChallenge,
  loadCoReadingHub,
  rankExplanations,
  saveCoReadingHub,
  setChallengeExemplar,
  submitExplanation,
  type CoReadingHubStore,
  type PeerDimension,
} from '../../lib/coReadingHub';
import { castPeerDimensionVote } from '../../lib/collabPeerReview';
import { AllCapsLabel } from '../ui/AllCapsLabel';
import { CollabDeviceLocalBanner } from './CollabDeviceLocalBanner';

type Props = {
  lang: Lang;
  roomId: string;
  memberId: string;
  displayName: string;
};

function dimensionLabel(dim: PeerDimension, lang: Lang): string {
  const el = lang === 'el';
  const map: Record<PeerDimension, [string, string]> = {
    clarity: ['Clarity', 'Ξ£Ξ±Ο†Ξ®Ξ½ΞµΞΉΞ±'],
    sourceGrounding: ['Source grounding', 'Ξ£Ο„Ξ®ΟΞΉΞΎΞ· ΟƒΞµ Ο€Ξ·Ξ³Ξ®'],
    completeness: ['Completeness', 'Ξ Ξ»Ξ·ΟΟΟ„Ξ·Ο„Ξ±'],
    examUsefulness: ['Exam usefulness', 'Ξ§ΟΞ·ΟƒΞΉΞΌΟΟ„Ξ·Ο„Ξ± ΞµΞΎΞµΟ„Ξ¬ΟƒΞµΟ‰Ξ½'],
  };
  return el ? map[dim][1] : map[dim][0];
}

export function CoReadingHubPanel({ lang, roomId, memberId, displayName }: Props) {
  const tr = (key: Parameters<typeof t>[0]) => t(key, lang);
  const [store, setStore] = useState<CoReadingHubStore>(() => loadCoReadingHub(roomId));
  const [excerpt, setExcerpt] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [explainDraft, setExplainDraft] = useState<Record<string, string>>({});
  // Keyed per challenge: the human/AI attribution badge feeds ranking + steward flows.
  const [aiAssisted, setAiAssisted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStore(loadCoReadingHub(roomId));
  }, [roomId]);

  const persist = (next: CoReadingHubStore) => {
    saveCoReadingHub(next);
    setStore(next);
  };

  const createChallenge = () => {
    const next = createExplanationChallenge(store, {
      sourceExcerpt: excerpt,
      sourceRef,
      createdById: memberId,
      createdByName: displayName || tr('collabAnonymous'),
    });
    persist(next);
    setExcerpt('');
    setSourceRef('');
  };

  return (
    <div className="space-y-2 rounded-lg border border-border-subtle/80 bg-surface-card/40 p-2.5" data-testid="co-reading-hub">
      <p className="ws-field-label"><AllCapsLabel>{tr('collabCoReadingTitle')}</AllCapsLabel></p>
      <CollabDeviceLocalBanner lang={lang} surface="coreading" />
      <p className="type-caption text-text-muted">{tr('collabCoReadingHint')}</p>

      <textarea
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        rows={2}
        className="ws-field-input text-xs resize-y"
        placeholder={tr('collabSourceExcerpt')}
        data-testid="co-reading-excerpt"
      />
      <input
        value={sourceRef}
        onChange={(e) => setSourceRef(e.target.value)}
        className="ws-field-input text-xs"
        placeholder={tr('collabSourceRef')}
        data-testid="co-reading-source-ref"
      />
      <button
        type="button"
        disabled={excerpt.trim().length < 8}
        onClick={createChallenge}
        className="ws-empty-cta-secondary w-full justify-center text-xs min-h-11 disabled:opacity-50"
        data-testid="co-reading-create-challenge"
      >
        {tr('collabCreateChallenge')}
      </button>

      <div className="space-y-3">
        {store.challenges.slice(0, 5).map((ch) => {
          const ranked = rankExplanations(ch);
          return (
            <div key={ch.id} className="rounded-md border border-border-subtle/60 p-2 space-y-2" data-testid={`co-reading-challenge-${ch.id}`}>
              <p className="type-caption text-text-secondary whitespace-pre-wrap">{ch.sourceExcerpt}</p>
              {ch.sourceRef ? <p className="type-caption text-text-muted">{ch.sourceRef}</p> : null}

              <textarea
                value={explainDraft[ch.id] ?? ''}
                onChange={(e) => setExplainDraft((d) => ({ ...d, [ch.id]: e.target.value }))}
                rows={2}
                className="ws-field-input text-xs resize-y"
                placeholder={tr('collabExplainPlaceholder')}
                data-testid={`co-reading-explain-draft-${ch.id}`}
              />
              <label className="flex items-center gap-2 type-caption text-text-secondary">
                <input
                  type="checkbox"
                  checked={aiAssisted[ch.id] ?? false}
                  onChange={(e) => setAiAssisted((m) => ({ ...m, [ch.id]: e.target.checked }))}
                />
                {tr('collabAiAssisted')}
              </label>
              <button
                type="button"
                className="ws-chrome-btn type-caption px-2 py-1"
                data-testid={`co-reading-submit-${ch.id}`}
                onClick={() => {
                  const text = (explainDraft[ch.id] ?? '').trim();
                  if (!text) return;
                  persist(submitExplanation(store, ch.id, {
                    authorId: memberId,
                    authorName: displayName || tr('collabAnonymous'),
                    text,
                    aiAssisted: aiAssisted[ch.id] ?? false,
                  }));
                  setExplainDraft((d) => ({ ...d, [ch.id]: '' }));
                  setAiAssisted((m) => ({ ...m, [ch.id]: false }));
                }}
              >
                {tr('collabSubmitExplanation')}
              </button>

              {ranked.map((ex) => {
                const continuity = continuityOverlapScore(ch.sourceExcerpt, ex.text);
                const isExemplar = ch.exemplarId === ex.id;
                return (
                  <div key={ex.id} className="rounded border border-border-subtle/40 bg-surface-primary/30 p-2 space-y-1" data-testid={`co-reading-explanation-${ex.id}`}>
                    <div className="flex flex-wrap items-center gap-2 type-caption text-text-muted">
                      <span>{ex.authorName}</span>
                      <span>{ex.aiAssisted ? tr('collabAiAssistedBadge') : tr('collabHumanBadge')}</span>
                      {isExemplar ? <span className="text-accent-teal">{tr('collabExemplar')}</span> : null}
                      {continuity.weak ? (
                        <span className="text-accent-amber" data-testid={`co-reading-continuity-weak-${ex.id}`}>
                          {tr('collabContinuityWeak')}
                        </span>
                      ) : (
                        <span data-testid={`co-reading-continuity-ok-${ex.id}`}>
                          {tr('collabContinuityOk').replace('{score}', String(Math.round(continuity.score * 100)))}
                        </span>
                      )}
                    </div>
                    <p className="type-caption text-text-primary whitespace-pre-wrap">{ex.text}</p>
                    <div className="flex flex-wrap gap-1">
                      {PEER_DIMENSIONS.map((dim) => (
                        <button
                          key={dim}
                          type="button"
                          className="ws-chrome-btn type-caption px-1.5 py-0.5"
                          data-testid={`co-reading-vote-${ex.id}-${dim}`}
                          onClick={() => {
                            const { store: next } = castPeerDimensionVote(
                              store,
                              ch.id,
                              ex.id,
                              { id: memberId, name: displayName || tr('collabAnonymous') },
                              dim,
                            );
                            persist(next);
                          }}
                        >
                          {dimensionLabel(dim, lang)} ({ex.votes[dim]})
                        </button>
                      ))}
                      <button
                        type="button"
                        className="ws-chrome-btn type-caption px-1.5 py-0.5"
                        data-testid={`co-reading-exemplar-${ex.id}`}
                        onClick={() => persist(setChallengeExemplar(
                          store,
                          ch.id,
                          ex.id,
                          { id: memberId, name: displayName || tr('collabAnonymous') },
                        ))}
                      >
                        {tr('collabMarkExemplar')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
