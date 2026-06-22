import { useState, useMemo, useRef, useEffect } from 'react';
import { Sparkles, Bot, Loader2, Download, Printer, Mic, MicOff } from 'lucide-react';
import { computeRubric, weakestDimensions, type RubricDimension } from '../../lib/feynmanRubric';
import { detectFeynmanGaps } from '../../lib/feynmanGapDetect';
import { startFeynmanVoiceInput } from '../../lib/feynmanVoice';
import { generateFeynmanCoachFeedbackAsync, isLlmAvailable } from '../../lib/llmClient';
import type { CoachFeedback } from '../../lib/feynmanCoach';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';
import type { UserSettings } from '../../types';
import { BookOpen } from 'lucide-react';
import {
  buildFeynmanRubricHtml,
  downloadFeynmanRubricReport,
  printFeynmanRubricReport,
} from '../../lib/feynmanRubricExport';

const RUBRIC_LABELS: Record<RubricDimension, string> = {
  accuracy: 'Accuracy',
  completeness: 'Completeness',
  simplicity: 'Simplicity',
  structure: 'Structure',
};

function rubricGapHint(dim: RubricDimension, concept: string, lang: 'en' | 'el'): string {
  const t = (en: string, el: string) => (lang === 'el' ? el : en);
  const map: Record<RubricDimension, string> = {
    accuracy: t(`Use precise terms for «${concept}» from your notes.`, `Χρησιμοποίησε ακριβείς όρους για «${concept}» από τις σημειώσεις.`),
    completeness: t('Cover mechanism, importance, and one example from your material.', 'Κάλυψε μηχανισμό, σημασία και ένα παράδειγμα από το υλικό σου.'),
    simplicity: t('One idea per sentence — reduce jargon.', 'Μία ιδέα ανά πρόταση — λιγότερο jargon.'),
    structure: t('Use a clear arc: idea → why → example → takeaway.', 'Δομή: ιδέα → γιατί → παράδειγμα → σύνοψη.'),
  };
  return map[dim];
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
}
export function FeynmanCheck({
  concept = 'Study concept',
  onFocusConcept,
  onOpenInReader,
  settings,
  onOpenAgent,
  outline: outlineProp,
  placeholder: placeholderProp,
  gapHints,
  gapTerms = [],
  referenceNotes = '',
  glossary,
  extraTerms,
}: Props) {
  const { t, lang } = useI18n();
  const [text, setText] = useState('');
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback | null>(null);
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

  const toggleVoice = () => {
    if (voiceActive) {
      voiceStopRef.current?.();
      voiceStopRef.current = null;
      setVoiceActive(false);
      return;
    }
    const stop = startFeynmanVoiceInput(lang, (chunk) => setText(chunk));
    if (!stop) return;
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-1 text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          {t('feynmanCheck')} — {concept}
        </h3>
        <p className="mb-3 text-xs text-text-tertiary">{t('feynmanHint')}</p>

        <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
          <div className="space-y-3">
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
              onChange={(e) => { setText(e.target.value); setCoachFeedback(null); }}
              rows={7}
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
                {onOpenAgent && (
                  <button type="button" onClick={onOpenAgent} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:border-brand-500/30">
                    Agent →
                  </button>
                )}
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
                  <div className="flex gap-1">
                    <button
                      type="button"
                      data-testid="feynman-export-rubric"
                      onClick={() => exportRubric('download')}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 px-2 py-0.5 text-[9px] text-brand-300 hover:bg-brand-600/10"
                    >
                      <Download className="w-3 h-3" />
                      {lang === 'el' ? 'Αναφορά' : 'Report'}
                    </button>
                    <button
                      type="button"
                      data-testid="feynman-print-rubric"
                      onClick={() => exportRubric('print')}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-0.5 text-[9px] text-text-muted hover:text-text-secondary"
                    >
                      <Printer className="w-3 h-3" />
                      PDF
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {rubricDims.map((dim) => (
                    <div key={dim}>
                      <div className="mb-0.5 flex justify-between text-[10px]">
                        <span>{RUBRIC_LABELS[dim]}</span>
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
                    <p className="font-medium text-text-primary">{RUBRIC_LABELS[dim]}</p>
                    <p className="mt-0.5">{gapHints?.[0] ?? rubricGapHint(dim, concept, lang)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
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
