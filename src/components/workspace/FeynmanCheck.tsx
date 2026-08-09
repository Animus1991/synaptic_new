import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Loader2, Download, Printer, Mic, MicOff } from '@/lib/lucide-shim';
import { PanelOverflowMenu } from './PanelOverflowMenu';
import { computeRubric, weakestDimensions, type RubricDimension } from '../../lib/feynmanRubric';
import { detectFeynmanGaps } from '../../lib/feynmanGapDetect';
import { startFeynmanVoiceInput } from '../../lib/feynmanVoice';
import { generateFeynmanCoachFeedbackAsync, isLlmAvailable } from '../../lib/llmClient';
import type { CoachFeedback } from '../../lib/feynmanCoach';
import { useI18n, type I18nKey } from '../../lib/i18n';
import type { UserSettings } from '../../types';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import type { FeynmanKeyTerm } from '../../lib/feynmanSessionModel';
import { saveFeynmanDraft } from '../../lib/feynmanDraftStore';
import { buildFeynmanWeakDimensionPrompt } from '../../lib/feynmanAgentPrompts';
import { feynmanDefaultOutline, feynmanExplainPlaceholder } from '../../lib/feynmanOutline';
import {
  buildFeynmanRubricHtml,
  downloadFeynmanRubricReport,
  printFeynmanRubricReport,
} from '../../lib/feynmanRubricExport';
import { auditFeynmanRubricExportDiscoverability } from '../../lib/feynmanRubricExportDiscoverabilityQA';
import { FeynmanRubricExportDiscoverabilityStrip } from './FeynmanRubricExportDiscoverabilityStrip';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { PrimaryCTA, SecondaryCTA } from '../ui/primitives';

const RUBRIC_LABEL_KEYS: Record<RubricDimension, I18nKey> = {
  accuracy: 'feynmanAccuracy',
  completeness: 'feynmanCompleteness',
  simplicity: 'feynmanSimplicity',
  structure: 'feynmanStructure',
};

const RUBRIC_GAP_KEYS: Record<Exclude<RubricDimension, 'accuracy'>, I18nKey> = {
  completeness: 'feynmanGapCompleteness',
  simplicity: 'feynmanGapSimplicity',
  structure: 'feynmanGapStructure',
};

function rubricGapHint(dim: RubricDimension, concept: string, t: (k: I18nKey) => string): string {
  if (dim === 'accuracy') {
    return t('feynmanGapAccuracy').replace('{concept}', concept);
  }
  return t(RUBRIC_GAP_KEYS[dim]);
}

function gapSearchTerm(dim: RubricDimension, concept: string, gapTerms: string[]): string {
  switch (dim) {
    case 'accuracy': return gapTerms[0] ?? concept;
    case 'completeness': return concept;
    case 'simplicity': return gapTerms[1] ?? gapTerms[0] ?? concept;
    case 'structure': return gapTerms[2] ?? concept;
    default: return concept;
  }
}

interface Props {
  concept?: string;
  onFocusConcept?: (conceptId: string) => void;
  /** Open reader at source span for a glossary term or concept. */
  onOpenInReader?: (query: string) => void;
  settings?: UserSettings;
  onAskAgent?: () => void;
  /** Send a tailored Agent prompt (e.g. weakest rubric dimension). */
  onAskAgentWithPrompt?: (prompt: string) => void;
  /** @deprecated use onAskAgent */
  onOpenAgent?: () => void;
  outline?: string[];
  placeholder?: string;
  gapHints?: string[];
  gapTerms?: string[];
  /** Uploaded note excerpt for coach grounding (not the user's draft). */
  referenceNotes?: string;
  /** Glossary terms from the source corpus — used to score accuracy fairly. */
  glossary?: Array<{ term: string; definition?: string }>;
  /** Additional course/topic terms that should count as keywords. */
  extraTerms?: string[];
  /** Current lesson section for context anchoring. */
  sectionLabel?: string;
  /** Key terms the learner should try to include. */
  keyTerms?: FeynmanKeyTerm[];
  /** True when concept extraction is weak (generic concept, sparse glossary). */
  weakExtraction?: boolean;
  hasSource?: boolean;
  onUpload?: () => void;
  emptyMessage?: string;
  /** Persisted draft scope (task/concept key). */
  draftScopeKey?: string;
  initialDraft?: string;
  /** Fired once when the learner submits for coach feedback (deliberate action). */
  onExplanationSubmitted?: (draft: string, overallScore?: number) => void;
  /** Jump to Dashboard for full session export (Wave 6.8l discoverability). */
  onOpenDashboard?: () => void;
  /** Open Quiz tool after rubric review (TOOL-FY-02). */
  onOpenQuiz?: () => void;
}
/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function FeynmanCheck({
  concept = 'Introduction',
  onFocusConcept,
  onOpenInReader,
  settings,
  onAskAgent,
  onAskAgentWithPrompt,
  onOpenAgent,
  outline: outlineProp,
  placeholder: placeholderProp,
  gapHints,
  gapTerms = [],
  referenceNotes = '',
  glossary,
  extraTerms,
  sectionLabel,
  keyTerms = [],
  weakExtraction = false,
  hasSource = true,
  onUpload,
  emptyMessage,
  draftScopeKey,
  initialDraft = '',
  onExplanationSubmitted,
  onOpenDashboard,
  onOpenQuiz,
}: Props) {
  const { t, lang } = useI18n();
  const [text, setText] = useState(initialDraft);  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback | null>(null);
  const [coachUsedLlm, setCoachUsedLlm] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const voiceStopRef = useRef<(() => void) | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const outline = outlineProp ?? feynmanDefaultOutline(concept, lang);
  const placeholder = placeholderProp ?? feynmanExplainPlaceholder(concept, lang);
  const rubric = useMemo(() => {
    if (wordCount < 8) return null;
    const scores = computeRubric(text, wordCount, {
      concept,
      referenceNotes,
      glossary,
      extraTerms,
    });
    return { scores, weak: weakestDimensions(scores) };
  }, [text, wordCount, concept, referenceNotes, glossary, extraTerms]);

  const autoGaps = useMemo(
    () => detectFeynmanGaps(text, concept, referenceNotes, gapTerms, glossary, extraTerms),
    [text, concept, referenceNotes, gapTerms, glossary, extraTerms],
  );

  useEffect(() => () => { voiceStopRef.current?.(); }, []);

  useEffect(() => {
    setText(initialDraft);
  }, [draftScopeKey, initialDraft]);

  const persistDraft = useCallback((draft: string) => {
    if (draftScopeKey) saveFeynmanDraft(draftScopeKey, draft);
  }, [draftScopeKey]);

  useEffect(() => {
    if (!draftScopeKey) return;
    const timer = window.setTimeout(() => persistDraft(text), 400);
    return () => window.clearTimeout(timer);
  }, [text, draftScopeKey, persistDraft]);

  const handleTextChange = (next: string) => {
    setText(next);
    setCoachFeedback(null);
  };
  const toggleVoice = () => {
    if (voiceActive) {
      voiceStopRef.current?.();
      voiceStopRef.current = null;
      setVoiceActive(false);
      return;
    }
    const stop = startFeynmanVoiceInput(lang, (chunk) => handleTextChange(chunk));    if (!stop) return;
    voiceStopRef.current = stop;
    setVoiceActive(true);
  };

  const requestCoach = async () => {
    if (!rubric) return;
    setCoachLoading(true);
    setCoachFeedback(null);
    const { feedback, usedLlm } = await generateFeynmanCoachFeedbackAsync(
      text,
      rubric.scores,
      rubric.weak,
      concept,
      settings,
      referenceNotes,
    );
    setCoachFeedback(feedback);
    setCoachUsedLlm(usedLlm);
    setCoachLoading(false);
    onExplanationSubmitted?.(text, feedback.overallScore);
  };
  const rubricDims: RubricDimension[] = ['accuracy', 'completeness', 'simplicity', 'structure'];
  const coachEngineLabel = coachUsedLlm
    ? t('feynmanCoachLlm')
    : isLlmAvailable(settings)
      ? t('feynmanCoachOffline')
      : t('feynmanCoachOfflineKey');

  const dedupedKeyTerms = useMemo(
    () => [...new Map(keyTerms.map((kt) => [kt.term.trim().toLowerCase(), kt])).values()],
    [keyTerms],
  );
  const showFeedbackSide = Boolean(coachFeedback || rubric || autoGaps.length > 0);

  const exportRubric = (mode: 'download' | 'print') => {
    if (!rubric) return;
    const html = buildFeynmanRubricHtml({
      concept,
      explanation: text,
      scores: rubric.scores,
      weak: rubric.weak,
      coach: coachFeedback,
      lang,
    });
    if (mode === 'print') printFeynmanRubricReport(html);
    else downloadFeynmanRubricReport(`feynman-${concept.slice(0, 24).replace(/\s+/g, '-')}`, html);
  };

  const exportDiscoverability = useMemo(
    () => auditFeynmanRubricExportDiscoverability({
      draft: text,
      rubricReady: Boolean(rubric),
      scores: rubric?.scores ?? null,
      hasCoachFeedback: Boolean(coachFeedback),
      lang,
    }),
    [text, rubric, coachFeedback, lang],
  );

  if (!hasSource) {
    return (
      <WorkspaceToolEmptyState
        tool="feynman"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="feynman-check" data-clarity-pass="k160">
      {/* OPT-K160 — composer-first wash chrome; text-first CTAs; no nested tip chrome */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2.5">
        <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {sectionLabel ? (
            <p className="type-caption text-text-muted" data-testid="feynman-section-label">
              {t('feynmanSectionColon')}{' '}
              <span className="font-medium text-text-secondary">{sectionLabel}</span>
            </p>
          ) : (
            <p className="type-caption font-medium text-text-secondary" data-testid="feynman-topic-label">
              {concept}
            </p>
          )}
        </div>

        <p className="mb-2 type-caption leading-snug text-text-muted">{t('feynmanHint')}</p>

        <FeynmanRubricExportDiscoverabilityStrip
          report={exportDiscoverability}
          lang={lang}
          onExportDownload={rubric ? () => exportRubric('download') : undefined}
          onExportPrint={rubric ? () => exportRubric('print') : undefined}
          onOpenDashboard={onOpenDashboard}
        />

        {weakExtraction && (
          <WorkspacePanelWarnStrip testId="feynman-weak-extraction">
            {t('panelPassageGroundedFeynman')}
          </WorkspacePanelWarnStrip>
        )}

        {/* Wave FY2 — full-bleed composer; second column only when score/feedback exists */}
        <div
          className={showFeedbackSide ? 'grid w-full gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]' : 'flex w-full flex-col gap-3'}
          data-testid="feynman-layout"
          data-side={showFeedbackSide ? 'split' : 'full'}
        >
          <div className="min-w-0 w-full space-y-3">
            <label className="sr-only" htmlFor="feynman-draft-input">
              {t('feynmanHint')}
            </label>
            <textarea
              id="feynman-draft-input"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={8}
              placeholder={placeholder}
              data-testid="feynman-draft"
              className="w-full min-h-[10rem] resize-y rounded-xl border-0 bg-surface-secondary/55 p-3.5 type-body leading-relaxed text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:min-h-[14rem]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto type-caption tabular-nums text-text-muted">
                {wordCount} {t('words')}
              </span>
              <PrimaryCTA
                type="button"
                size="md"
                disabled={!rubric || coachLoading}
                onClick={() => void requestCoach()}
                data-testid="feynman-coach-primary"
                className="ws-touch-floor min-h-8 rounded-lg"
              >
                {coachLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {coachLoading ? t('coachThinking') : t('getCoachFeedback')}
              </PrimaryCTA>
              {(onAskAgent ?? onOpenAgent) && (
                <SecondaryCTA
                  type="button"
                  size="md"
                  data-testid="feynman-ask-agent"
                  onClick={onAskAgent ?? onOpenAgent}
                  className="ws-touch-floor min-h-8"
                >
                  {t('askAgentShort')}
                </SecondaryCTA>
              )}
              <PanelOverflowMenu
                ariaLabel={t('wsMore')}
                triggerTestId="feynman-export-menu"
                summaryClassName="ws-touch-floor min-h-8 min-w-8"
                menuClassName="min-w-[11rem]"
              >
                <button
                  type="button"
                  data-testid="feynman-voice-input"
                  onClick={toggleVoice}
                  aria-pressed={voiceActive}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  {voiceActive ? <MicOff className="h-3.5 w-3.5" aria-hidden /> : <Mic className="h-3.5 w-3.5" aria-hidden />}
                  {t('feynmanVoice')}
                </button>
                <button
                  type="button"
                  data-testid="feynman-export-rubric"
                  disabled={!rubric}
                  onClick={() => exportRubric('download')}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {t('feynmanExportReport')}
                </button>
                <button
                  type="button"
                  data-testid="feynman-print-rubric"
                  disabled={!rubric}
                  onClick={() => exportRubric('print')}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  PDF
                </button>
              </PanelOverflowMenu>
            </div>

            <CollapsibleChromeSection
              title={t('feynmanOutlineChrome')}
              alwaysCollapse
              defaultOpen={wordCount === 0}
              data-testid="feynman-outline-chrome"
            >
              <ul className="space-y-1.5 px-3 pb-3 type-caption leading-snug text-text-secondary">
                {outline.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </CollapsibleChromeSection>

            {dedupedKeyTerms.length > 0 && (
              <CollapsibleChromeSection
                title={t('feynmanTermsChrome')}
                alwaysCollapse
                data-testid="feynman-terms-chrome"
              >
                <div className="flex flex-wrap gap-1.5 px-3 pb-3" data-testid="feynman-key-terms">
                  {dedupedKeyTerms.map((kt) => (
                    <button
                      key={kt.term}
                      type="button"
                      title={kt.definition}
                      onClick={() => onOpenInReader?.(kt.term)}
                      className="ws-touch-floor rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      {kt.term}
                    </button>
                  ))}
                </div>
              </CollapsibleChromeSection>
            )}
          </div>

          {showFeedbackSide ? (
          <div className="min-w-0 space-y-3">
            {coachFeedback && (
              <div className="space-y-2 rounded-xl border-0 bg-surface-secondary/45 p-3">
                <p className="type-meta font-semibold text-text-primary">{coachFeedback.headline}</p>
                <p className="type-caption text-text-muted">{coachEngineLabel}</p>
                <div>
                  <p className="mb-1 type-caption font-medium text-text-secondary">{t('feynmanCoachStrengths')}</p>
                  <ul className="space-y-0.5 type-caption text-text-secondary">
                    {coachFeedback.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 type-caption font-medium text-text-secondary">{t('feynmanCoachImprove')}</p>
                  <ul className="space-y-0.5 type-caption text-text-secondary">
                    {coachFeedback.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                {coachFeedback.rewrite && (
                  <p className="whitespace-pre-wrap pt-2 type-caption text-text-secondary">{coachFeedback.rewrite}</p>
                )}
                <p className="type-caption font-medium text-text-primary">{coachFeedback.nextStep}</p>
              </div>
            )}

            {autoGaps.length > 0 && (
              <WorkspacePanelWarnStrip layout="box" testId="feynman-auto-gaps" className="mb-0">
                <p className="mb-2 type-caption font-medium text-text-secondary">
                  {t('feynmanAutoGaps')}
                </p>
                <ul className="space-y-2">
                  {autoGaps.slice(0, 3).map((g) => (
                    <li key={g.dimension} className="flex items-start justify-between gap-2 type-caption font-normal">
                      <span className="text-text-secondary">{g.hint}</span>
                      {onOpenInReader && (
                        <button
                          type="button"
                          onClick={() => onOpenInReader(g.searchTerm)}
                          className="shrink-0 type-caption font-medium text-text-secondary hover:text-text-primary"
                        >
                          {t('feynmanOpenInReader')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </WorkspacePanelWarnStrip>
            )}

            {rubric && (
              <div className="rounded-xl border-0 bg-surface-secondary/45 p-3" data-testid="feynman-score-panel">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="type-caption font-medium text-text-secondary">{t('feynmanScoreTitle')}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      data-testid="feynman-rubric-export-download"
                      onClick={() => exportRubric('download')}
                      title={t('feynmanDownloadReport')}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border-0 bg-surface-secondary/70 px-2 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      <Download className="h-3 w-3" aria-hidden />
                      {t('exportLabel')}
                    </button>
                    <button
                      type="button"
                      data-testid="feynman-rubric-export-print"
                      onClick={() => exportRubric('print')}
                      title={t('dashPrintPdf')}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border-0 bg-surface-secondary/70 px-2 py-1 type-caption font-medium text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                    >
                      <Printer className="h-3 w-3" aria-hidden />
                      PDF
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {rubricDims.map((dim) => (
                    <div key={dim}>
                      <div className="mb-0.5 flex justify-between type-caption text-text-secondary">
                        <span>{t(RUBRIC_LABEL_KEYS[dim])}</span>
                        <span className="tabular-nums text-text-primary">{rubric.scores[dim]}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                        <div className="h-full rounded-full bg-brand-500/80 transition-all" style={{ width: `${rubric.scores[dim]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rubric && rubric.weak.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="type-caption font-medium text-text-secondary">{t('feynmanGapsTitle')}</p>
                  {onOpenQuiz && (
                    <button
                      type="button"
                      data-testid="feynman-open-quiz"
                      onClick={onOpenQuiz}
                      className="ws-touch-floor inline-flex min-h-8 items-center gap-1 rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      {t('feynmanOpenQuiz')}
                    </button>
                  )}
                </div>
                {rubric.weak.map((dim) => (
                  <div key={dim} className="rounded-xl border-0 bg-surface-secondary/40 p-2.5 type-caption leading-5 text-text-secondary">
                    <p className="font-medium text-text-primary">{t(RUBRIC_LABEL_KEYS[dim])}</p>
                    <p className="mt-0.5">{gapHints?.[0] ?? rubricGapHint(dim, concept, t)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(onAskAgentWithPrompt ?? onAskAgent ?? onOpenAgent) && (
                        <button
                          type="button"
                          data-testid={`feynman-agent-fix-${dim}`}
                          onClick={() => {
                            const prompt = buildFeynmanWeakDimensionPrompt(dim, concept, text, lang);
                            if (onAskAgentWithPrompt) onAskAgentWithPrompt(prompt);
                            else (onAskAgent ?? onOpenAgent)?.();
                          }}
                          className="inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/70 px-2 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        >
                          {t('feynmanAgentFixDim').replace('{dim}', t(RUBRIC_LABEL_KEYS[dim]))}
                        </button>
                      )}
                      {onOpenInReader && (
                        <button
                          type="button"
                          onClick={() => onOpenInReader(gapSearchTerm(dim, concept, gapTerms))}
                          className="inline-flex min-h-8 items-center type-caption font-medium text-text-secondary hover:text-text-primary"
                        >
                          {t('feynmanReadInSource')}
                        </button>
                      )}
                      {onFocusConcept && (
                        <button
                          type="button"
                          onClick={() => onFocusConcept('concept-map')}
                          className="type-caption font-medium text-text-secondary hover:text-text-primary"
                        >
                          {t('feynmanConceptMapArrow')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
