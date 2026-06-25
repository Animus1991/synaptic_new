import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Bot, Loader2, Download, Printer, Mic, MicOff, BookOpen, AlertTriangle } from 'lucide-react';
import { computeRubric, weakestDimensions, type RubricDimension } from '../../lib/feynmanRubric';
import { detectFeynmanGaps } from '../../lib/feynmanGapDetect';
import { startFeynmanVoiceInput } from '../../lib/feynmanVoice';
import { generateFeynmanCoachFeedbackAsync, isLlmAvailable } from '../../lib/llmClient';
import type { CoachFeedback } from '../../lib/feynmanCoach';
import { useI18n, type I18nKey } from '../../lib/i18n';
import { cn } from '../../utils/cn';
import type { UserSettings } from '../../types';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import type { FeynmanKeyTerm } from '../../lib/feynmanSessionModel';
import { saveFeynmanDraft } from '../../lib/feynmanDraftStore';
import { buildFeynmanWeakDimensionPrompt } from '../../lib/feynmanAgentPrompts';
import {
  buildFeynmanRubricHtml,
  downloadFeynmanRubricReport,
  printFeynmanRubricReport,
} from '../../lib/feynmanRubricExport';

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

function rubricGapHint(dim: RubricDimension, concept: string, t: (k: I18nKey) => string, lang: 'en' | 'el'): string {
  if (dim === 'accuracy') {
    return lang === 'el'
      ? `Χρησιμοποίησε ακριβείς όρους για «${concept}» από τις σημειώσεις.`
      : `Use precise terms for «${concept}» from your notes.`;
  }
  return t(RUBRIC_GAP_KEYS[dim]);
}

const DEFAULT_OUTLINE = (concept: string, lang: 'en' | 'el') =>
  lang === 'el'
    ? [`Ποια είναι η βασική ιδέα του «${concept}»;`, 'Γιατί έχει σημασία;', 'Ποια παρανόηση να αποφύγεις;', 'Παράδειγμα από τις σημειώσεις σου.']
    : [`What is the core idea of ${concept}?`, 'Why does it matter?', 'What misconception to avoid?', 'One example from your notes.'];

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
}
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
}: Props) {
  const { t, lang } = useI18n();
  const [text, setText] = useState(initialDraft);  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback | null>(null);
  const [coachUsedLlm, setCoachUsedLlm] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const voiceStopRef = useRef<(() => void) | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const outline = outlineProp ?? DEFAULT_OUTLINE(concept, lang);
  const placeholder = placeholderProp ?? (
    lang === 'el'
      ? `Εξήγησε την έννοια «${concept}» με δικά σου λόγια, βασιζόμενος/η στις σημειώσεις σου…`
      : `Explain ${concept} in your own words, using your uploaded notes…`
  );
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
    ? 'AI Coach · LLM'
    : isLlmAvailable(settings)
      ? 'AI Coach · offline rubric'
      : 'AI Coach · offline (add API key in Settings)';

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

  if (!hasSource) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? placeholder}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="feynman-check">
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-1 text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          {t('feynmanCheck')} — {concept}
        </h3>
        <p className="mb-3 text-xs text-text-tertiary">{t('feynmanHint')}</p>

        {sectionLabel && (
          <p className="mb-2 text-[10px] text-text-muted" data-testid="feynman-section-label">
            {lang === 'el' ? 'Ενότητα:' : 'Section:'}{' '}
            <span className="text-text-secondary">{sectionLabel}</span>
          </p>
        )}

        {weakExtraction && (
          <div
            className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
            data-testid="feynman-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              {lang === 'el'
                ? 'Αδύναμη εξαγωγή εννοιών — το outline βασίζεται στο απόσπασμα. Δοκίμασε Reprocess για καλύτερα αποτελέσματα.'
                : 'Weak concept extraction — outline is passage-grounded. Try Reprocess for richer structure.'}
            </p>
          </div>
        )}

        {keyTerms.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5" data-testid="feynman-key-terms">
            <span className="text-[10px] text-text-muted w-full">
              {lang === 'el' ? 'Όροι από το υλικό:' : 'Terms from your material:'}
            </span>
            {keyTerms.map((kt) => (
              <button
                key={kt.term}
                type="button"
                title={kt.definition}
                onClick={() => onOpenInReader?.(kt.term)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
              >
                {kt.term}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">          <div className="space-y-3">
            <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{t('outline')}</p>
              <ul className="space-y-1 text-[11px] text-text-secondary">
                {outline.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}              rows={7}
              placeholder={placeholder}
              className="w-full rounded-xl border border-border-subtle bg-surface-primary p-3 text-sm leading-6 outline-none placeholder:text-text-muted focus:border-brand-500/40"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-text-tertiary">{wordCount} {t('words')}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="feynman-voice-input"
                  onClick={toggleVoice}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border',
                    voiceActive ? 'border-accent-rose/40 bg-accent-rose/15 text-accent-rose' : 'border-border-subtle text-text-muted',
                  )}
                >
                  {voiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {lang === 'el' ? 'Φωνή' : 'Voice'}
                </button>
                <button
                  type="button"
                  disabled={!rubric || coachLoading}
                  onClick={() => void requestCoach()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 disabled:opacity-50"
                >
                  {coachLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  {coachLoading ? t('coachThinking') : t('getCoachFeedback')}
                </button>
                {(onAskAgent ?? onOpenAgent) && (
                  <button
                    type="button"
                    data-testid="feynman-ask-agent"
                    onClick={onAskAgent ?? onOpenAgent}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/15"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {lang === 'el' ? 'Ρώτα Agent' : 'Ask Agent'}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="feynman-export-rubric"
                  disabled={!rubric}
                  onClick={() => exportRubric('download')}
                  title={lang === 'el' ? 'Κατέβασε αναφορά αξιολόγησης' : 'Download rubric report'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-500/30 bg-brand-600/10 text-brand-300 hover:bg-brand-600/20 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  {lang === 'el' ? 'Εξαγωγή' : 'Export report'}
                </button>
                <button
                  type="button"
                  data-testid="feynman-print-rubric"
                  disabled={!rubric}
                  onClick={() => exportRubric('print')}
                  title={lang === 'el' ? 'Εκτύπωση / PDF' : 'Print / save as PDF'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-muted hover:text-text-secondary disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {coachFeedback && (
              <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-brand-300">{coachFeedback.headline}</p>
                <p className="text-[10px] text-text-muted">{coachEngineLabel}</p>
                <div>
                  <p className="text-[10px] font-semibold text-accent-emerald mb-1">Strengths</p>
                  <ul className="text-[11px] text-text-secondary space-y-0.5">
                    {coachFeedback.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-accent-amber mb-1">Improve</p>
                  <ul className="text-[11px] text-text-secondary space-y-0.5">
                    {coachFeedback.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                {coachFeedback.rewrite && (
                  <p className="text-[11px] text-text-secondary whitespace-pre-wrap border-t border-border-subtle pt-2">{coachFeedback.rewrite}</p>
                )}
                <p className="text-[10px] text-brand-400 font-medium">{coachFeedback.nextStep}</p>
              </div>
            )}

            {autoGaps.length > 0 && (
              <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/8 p-3" data-testid="feynman-auto-gaps">
                <p className="text-[10px] font-semibold text-accent-amber mb-2">
                  {lang === 'el' ? 'Αυτόματα κενά (rubric)' : 'Auto-detected gaps'}
                </p>
                <ul className="space-y-2">
                  {autoGaps.slice(0, 3).map((g) => (
                    <li key={g.dimension} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="text-text-secondary">{g.hint}</span>
                      {onOpenInReader && (
                        <button
                          type="button"
                          onClick={() => onOpenInReader(g.searchTerm)}
                          className="shrink-0 text-brand-400 hover:text-brand-300 text-[10px]"
                        >
                          Reader →
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rubric && (
              <div className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Rubric</p>
                </div>
                <div className="space-y-2">
                  {rubricDims.map((dim) => (
                    <div key={dim}>
                      <div className="mb-0.5 flex justify-between text-[10px]">
                        <span>{t(RUBRIC_LABEL_KEYS[dim])}</span>
                        <span className="font-mono text-brand-300">{rubric.scores[dim]}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${rubric.scores[dim]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rubric && rubric.weak.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Gaps to fix</p>
                {rubric.weak.map((dim) => (
                  <div key={dim} className="rounded-lg border border-border-subtle bg-surface-primary/50 p-2.5 text-[11px] leading-5 text-text-secondary">
                    <p className="font-medium text-text-primary">{t(RUBRIC_LABEL_KEYS[dim])}</p>
                    <p className="mt-0.5">{gapHints?.[0] ?? rubricGapHint(dim, concept, t, lang)}</p>
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
                          className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-1 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/15"
                        >
                          <Sparkles className="w-3 h-3" />
                          {lang === 'el' ? `Agent → ${t(RUBRIC_LABEL_KEYS[dim])}` : `Agent → fix ${t(RUBRIC_LABEL_KEYS[dim])}`}
                        </button>
                      )}
                      {onOpenInReader && (
                        <button
                          type="button"
                          onClick={() => onOpenInReader(gapSearchTerm(dim, concept, gapTerms))}
                          className="flex items-center gap-1 text-[10px] font-medium text-accent-cyan hover:text-accent-cyan/80"
                        >
                          <BookOpen className="w-3 h-3" />
                          {lang === 'el' ? 'Άνοιγμα στον αναγνώστη' : 'Read in source'}
                        </button>
                      )}
                      {onFocusConcept && (
                        <button type="button" onClick={() => onFocusConcept('concept-map')}
                          className="text-[10px] font-medium text-brand-400 hover:text-brand-300">
                          {lang === 'el' ? 'Χάρτης εννοιών →' : 'Concept map →'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
