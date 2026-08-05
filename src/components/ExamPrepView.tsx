import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Timer,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Flag,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
} from '@/lib/lucide-shim';
import type { ExamQuestion } from '../lib/taskFlows';
import { cn } from '../utils/cn';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { useI18n } from '../lib/i18n';
import { AllCapsLabel } from './ui/AllCapsLabel';
import { useMinimalTheme } from '../lib/useMinimalTheme';

interface ExamPrepViewProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onComplete: () => void;
  onQuizAttempt?: (concept: string, correct: boolean, confidence: number) => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  durationSeconds?: number;
  questions?: ExamQuestion[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type ExamPhase = 'setup' | 'active' | 'review' | 'results';
type ExamMode = 'standard' | 'practice';
type AnswerState = { answer: number | null; flagged: boolean; timeSpent: number };

/* OPT-K98 — markup debt: decorative brand type -> ink */
export function ExamPrepView({
  onClose,
  onOpenAgent,
  onComplete,
  onQuizAttempt,
  taskTitle,
  courseName,
  quizConcept,
  xpReward = 80,
  durationSeconds = 180,
  questions = [],
}: ExamPrepViewProps) {
  const { t } = useI18n();
  const isMinimal = useMinimalTheme();
  const examTopic = quizConcept ?? t('examPrepFallbackTopic');
  const examCourse = courseName ?? t('examPrepFallbackCourse');
  const [phase, setPhase] = useState<ExamPhase>('setup');
  const [examMode, setExamMode] = useState<ExamMode>('standard');
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>(() =>
    questions.map(() => ({ answer: null, flagged: false, timeSpent: 0 })),
  );
  const [showExplanations, setShowExplanations] = useState(false);
  const questionStartRef = useRef(Date.now());

  const examQuestions = questions.length > 0 ? questions : [];
  const sessionTitle = taskTitle ?? t('examPrepSessionTitle').replace('{topic}', examTopic);
  const isActive = phase === 'active';
  const isReview = phase === 'review';
  const allAnswered = answers.every((a) => a.answer !== null);
  const answeredCount = answers.filter((a) => a.answer !== null).length;
  const flaggedCount = answers.filter((a) => a.flagged).length;
  const score = answers.filter((a, i) => a.answer === examQuestions[i]?.correctIndex).length;
  const scorePct = examQuestions.length > 0 ? Math.round((score / examQuestions.length) * 100) : 0;
  const avgTime = Math.round(
    answers.filter((a) => a.timeSpent > 0).reduce((sum, a) => sum + a.timeSpent, 0) / Math.max(1, answeredCount),
  );
  const currentQuestion = examQuestions[currentQ];
  const currentAnswer = answers[currentQ];

  const moduleBreakdown = useMemo(() => {
    const byBucket = new Map<string, { total: number; correct: number }>();
    examQuestions.forEach((q, i) => {
      const bucket = `Q${i + 1}`;
      const entry = byBucket.get(bucket) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (answers[i]?.answer === q.correctIndex) entry.correct += 1;
      byBucket.set(bucket, entry);
    });
    return Array.from(byBucket.entries()).map(([label, value]) => ({
      label,
      total: value.total,
      correct: value.correct,
      pct: Math.round((value.correct / Math.max(1, value.total)) * 100),
    }));
  }, [answers, examQuestions]);

  const handleSubmit = useCallback(() => {
    if (phase !== 'active') return;
    examQuestions.forEach((q, i) => {
      const correct = answers[i]?.answer === q.correctIndex;
      onQuizAttempt?.(examTopic, correct, correct ? 80 : 35);
    });
    setPhase(examMode === 'practice' ? 'review' : 'results');
    setShowExplanations(examMode === 'practice');
  }, [phase, examQuestions, answers, onQuizAttempt, examTopic, examMode]);

  const startExam = () => {
    questionStartRef.current = Date.now();
    setShowExplanations(false);
    setPhase('active');
  };

  const resetExam = () => {
    setPhase('setup');
    setCurrentQ(0);
    setTimeLeft(durationSeconds);
    setAnswers(examQuestions.map(() => ({ answer: null, flagged: false, timeSpent: 0 })));
    setShowExplanations(false);
    questionStartRef.current = Date.now();
  };

  const navigateTo = (index: number) => {
    questionStartRef.current = Date.now();
    setCurrentQ(index);
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    if (!isActive) return;
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    setAnswers((prev) => prev.map((a, i) => (
      i === questionIndex
        ? { ...a, answer: optionIndex, timeSpent: Math.max(a.timeSpent, timeSpent) }
        : a
    )));
  };

  const toggleFlag = (questionIndex: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === questionIndex ? { ...a, flagged: !a.flagged } : a)));
  };

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const id = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (isActive && timeLeft <= 0) {
      handleSubmit();
    }
  }, [timeLeft, isActive, handleSubmit]);

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-secondary/50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <p className="text-sm font-semibold">{sessionTitle}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-accent-rose" />
              {examCourse} · {t('examPrepTimedSimulation')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-mono font-semibold px-2 py-1 rounded-lg',
                timeLeft <= 30 ? 'bg-accent-rose/15 text-accent-rose' : 'bg-surface-hover text-text-secondary',
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              {formatTime(Math.max(0, timeLeft))}
            </span>
          )}
          {(isActive || isReview) && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-text-tertiary px-2 py-1 rounded-lg bg-surface-hover">
              <Target className="w-3.5 h-3.5" />
              {t('examPrepAnswered').replace('{answered}', String(answeredCount)).replace('{total}', String(examQuestions.length))}
            </span>
          )}
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle hover:border-brand-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-text-secondary" /> {t('askAgentShort')}
          </button>
          <span className="text-xs text-accent-amber font-medium">+{xpReward} XP</span>
        </div>
      </div>

      {phase === 'setup' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-accent-rose" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">{examTopic}</h2>
              <p className="text-sm text-text-secondary mt-2">
                {examCourse} · {t('examPrepSubtitleFlow')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: t('examPrepStatQuestions'), value: examQuestions.length, icon: Target },
                { label: t('examPrepStatTimeLimit'), value: formatTime(durationSeconds), icon: Clock },
                { label: t('examPrepStatReward'), value: `+${xpReward} XP`, icon: GraduationCap },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="ux-card text-center">
                    <Icon className="w-5 h-5 text-text-secondary mx-auto mb-2" />
                    <p className="ux-kpi-value">{item.value}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="ux-card space-y-3">
              <p className="text-sm font-semibold text-text-primary">{t('examPrepModeHeading')}</p>
              {([
                {
                  id: 'standard' as const,
                  label: t('examPrepModeStandard'),
                  desc: t('examPrepModeStandardDesc'),
                },
                {
                  id: 'practice' as const,
                  label: t('examPrepModePractice'),
                  desc: t('examPrepModePracticeDesc'),
                },
              ]).map((modeOption) => (
                <button
                  key={modeOption.id}
                  type="button"
                  onClick={() => setExamMode(modeOption.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                    examMode === modeOption.id
                      ? 'border-brand-500/40 bg-brand-600/10'
                      : 'border-border-subtle hover:border-brand-500/25',
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5 shrink-0',
                    examMode === modeOption.id ? 'bg-brand-400' : 'bg-surface-hover',
                  )} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{modeOption.label}</p>
                    <p className="text-xs text-text-tertiary">{modeOption.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <CollapsibleChromeSection title={t('chromeExamTip')} data-testid="exam-prep-tip-chrome">
              <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/5 text-xs text-accent-amber p-4">
                <p>{t('examPrepTipBody')}</p>
              </div>
            </CollapsibleChromeSection>

            <div className="flex justify-center">
              <button
                onClick={startExam}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-medium transition-all"
              >
                {t('examPrepBegin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === 'active' || phase === 'review') && currentQuestion && currentAnswer && (
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden sm:flex w-56 shrink-0 flex-col border-r border-border-subtle bg-surface-secondary/20 p-3 gap-3 overflow-y-auto">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider"><AllCapsLabel>{t('examPrepStatQuestions')}</AllCapsLabel></p>
            <div className="grid grid-cols-4 gap-2">
              {examQuestions.map((_, i) => {
                const answer = answers[i];
                const selected = i === currentQ;
                const correct = isReview && answer.answer === examQuestions[i]?.correctIndex;
                const wrong = isReview && answer.answer !== null && answer.answer !== examQuestions[i]?.correctIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => navigateTo(i)}
                    className={cn(
                      'w-9 h-9 rounded-lg text-xs font-semibold tabular-nums relative transition-all',
                      selected
                        ? 'bg-brand-600 text-white'
                        : correct
                          ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30'
                          : wrong
                            ? 'bg-accent-rose/15 text-accent-rose border border-accent-rose/30'
                            : answer.answer !== null
                              ? 'bg-brand-600/10 text-text-secondary border border-brand-500/25'
                              : 'bg-surface-card text-text-tertiary border border-border-subtle',
                    )}
                  >
                    {i + 1}
                    {answer.flagged && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-amber" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto space-y-2 type-caption text-text-tertiary">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-brand-600/10 border border-brand-500/25" /> {t('examPrepLegendAnswered')}</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-surface-card border border-border-subtle" /> {t('examPrepLegendNotAttempted')}</div>
              {isReview && (
                <>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-accent-emerald/15 border border-accent-emerald/30" /> {t('examPrepLegendCorrect')}</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-accent-rose/15 border border-accent-rose/30" /> {t('examPrepLegendIncorrect')}</div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div
              className={cn(
                'max-w-none w-full py-6 space-y-5',
                /* OPT-K85 — non-Minimal full column */
                isMinimal ? 'px-4 sm:px-6 lg:px-8' : 'shell-edge-balance',
              )}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
                  <span>{t('examPrepQuestionOf').replace('{current}', String(currentQ + 1)).replace('{total}', String(examQuestions.length))}</span>
                  <span className="rounded-full bg-brand-600/10 text-text-secondary px-2 py-0.5">
                    {currentAnswer.answer !== null ? t('examPrepLegendAnswered') : t('examPrepStatusPending')}
                  </span>
                  {currentAnswer.flagged && (
                    <span className="rounded-full bg-accent-amber/15 text-accent-amber px-2 py-0.5">
                      {t('examPrepFlagged')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isReview && (
                    <button
                      type="button"
                      onClick={() => setShowExplanations((value) => !value)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-text-secondary hover:border-brand-500/25"
                    >
                      {showExplanations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showExplanations ? t('examPrepHideExplanations') : t('examPrepShowExplanations')}
                    </button>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium"
                    >
                      {t('examPrepSubmit')}
                    </button>
                  )}
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${(answeredCount / Math.max(examQuestions.length, 1)) * 100}%` }}
                />
              </div>

              <div className="ux-card">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs font-mono text-text-tertiary">Q{currentQ + 1}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">
                    {t('examPrepChoices').replace('{count}', String(currentQuestion.options.length))}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/10 text-text-secondary ml-auto">
                    {t('examPrepTargetPace').replace('{seconds}', String(Math.round(durationSeconds / Math.max(examQuestions.length, 1))))}
                  </span>
                  {!isReview && (
                    <button
                      type="button"
                      onClick={() => toggleFlag(currentQ)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all',
                        currentAnswer.flagged ? 'text-accent-amber bg-accent-amber/15' : 'text-text-tertiary hover:text-text-primary',
                      )}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {currentAnswer.flagged ? t('examPrepFlagged') : t('examPrepFlag')}
                    </button>
                  )}
                </div>

                <p className="text-base font-medium text-text-primary leading-relaxed mb-6">{currentQuestion.question}</p>

                <div className="space-y-3">
                  {currentQuestion.options.map((opt, i) => {
                    const isSelected = currentAnswer.answer === i;
                    const isCorrect = isReview && i === currentQuestion.correctIndex;
                    const isWrongSelected = isReview && isSelected && i !== currentQuestion.correctIndex;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectAnswer(currentQ, i)}
                        disabled={!isActive}
                        className={cn(
                          'w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all',
                          isCorrect
                            ? 'border-accent-emerald/40 bg-accent-emerald/10'
                            : isWrongSelected
                              ? 'border-accent-rose/40 bg-accent-rose/10'
                              : isSelected
                                ? 'border-brand-500/40 bg-brand-600/10 text-text-secondary'
                                : isReview
                                  ? 'border-border-subtle opacity-60'
                                  : 'border-border-subtle hover:border-brand-500/25',
                        )}
                      >
                        <span className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0',
                          isCorrect
                            ? 'bg-accent-emerald text-white'
                            : isWrongSelected
                              ? 'bg-accent-rose text-white'
                              : isSelected
                                ? 'bg-brand-600 text-white'
                                : 'bg-surface-hover text-text-tertiary',
                        )}>
                          {isCorrect ? '✓' : isWrongSelected ? '✗' : String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-sm leading-relaxed text-current">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isReview && showExplanations && (
                <div className={cn(
                  'rounded-2xl border p-4 text-sm leading-relaxed',
                  currentAnswer.answer === currentQuestion.correctIndex
                    ? 'border-accent-emerald/30 bg-accent-emerald/5'
                    : 'border-accent-amber/30 bg-accent-amber/5',
                )}>
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    {currentAnswer.answer === currentQuestion.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                        {t('examPrepLegendCorrect')}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-accent-amber" />
                        {t('examPrepReviewItem')}
                      </>
                    )}
                  </p>
                  <p className="text-text-secondary">
                    {t('examPrepCorrectAnswerIs').replace('{letter}', String.fromCharCode(65 + currentQuestion.correctIndex))}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo(Math.max(0, currentQ - 1))}
                  disabled={currentQ === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('examPrepPrevious')}
                </button>

                {currentQ < examQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => navigateTo(currentQ + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
                  >
                    {t('examPrepNext')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : isReview ? (
                  <button
                    type="button"
                    onClick={() => setPhase('results')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
                  >
                    {t('examPrepViewResults')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      allAnswered
                        ? 'bg-accent-rose/90 hover:bg-accent-rose text-white'
                        : 'bg-surface-hover text-text-muted cursor-not-allowed',
                    )}
                  >
                    {t('examPrepSubmit')}
                  </button>
                )}
              </div>

              {timeLeft <= 30 && timeLeft > 0 && isActive && (
                <p className="text-xs text-accent-rose flex items-center gap-1 justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" /> {t('examPrepTimeWarning')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-none w-full space-y-6">
            <div className="text-center ux-card">
              <CheckCircle2 className="w-12 h-12 text-accent-emerald mx-auto mb-3" />
              <h2 className="text-xl font-bold">{t('examPrepSubmitted')}</h2>
              <p className="text-2xl font-bold text-text-primary mt-2 tabular-nums">
                {t('examPrepCorrectCount').replace('{score}', String(score)).replace('{total}', String(examQuestions.length))}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {score === examQuestions.length
                  ? t('examPrepPerfect')
                  : score >= Math.ceil(examQuestions.length / 2)
                    ? t('examPrepSolid')
                    : t('examPrepFocusFundamentals')}
              </p>
              <div className="h-2 rounded-full bg-surface-hover mt-4">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${scorePct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t('examPrepStatScore'), value: `${scorePct}%`, icon: Target, tone: 'text-text-secondary' },
                { label: t('examPrepLegendCorrect'), value: `${score}/${examQuestions.length}`, icon: CheckCircle2, tone: 'text-accent-emerald' },
                { label: t('examPrepStatAvgTime'), value: `${avgTime}s`, icon: Clock, tone: 'text-text-secondary' },
                { label: t('examPrepFlagged'), value: `${flaggedCount}`, icon: Flag, tone: 'text-accent-amber' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="ux-card text-center">
                    <Icon className={cn('w-4 h-4 mx-auto mb-2', item.tone)} />
                    <p className={cn('ux-kpi-value', item.tone)}>{item.value}</p>
                    <p className="text-xs text-text-tertiary">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="ux-card">
              <p className="text-sm font-semibold mb-4">{t('examPrepQuestionReview')}</p>
              <div className="space-y-3">
                {examQuestions.map((question, i) => {
                  const answer = answers[i];
                  const correct = answer.answer === question.correctIndex;
                  return (
                    <button
                      key={`${question.question}-${i}`}
                      type="button"
                      onClick={() => {
                        setCurrentQ(i);
                        setShowExplanations(true);
                        setPhase('review');
                      }}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:border-brand-500/25',
                        correct
                          ? 'border-accent-emerald/25 bg-accent-emerald/5'
                          : answer.answer === null
                            ? 'border-border-subtle'
                            : 'border-accent-rose/25 bg-accent-rose/5',
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        correct
                          ? 'bg-accent-emerald/15'
                          : answer.answer === null
                            ? 'bg-surface-hover'
                            : 'bg-accent-rose/15',
                      )}>
                        {correct ? (
                          <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                        ) : (
                          <span className="text-xs font-semibold text-text-tertiary">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">Q{i + 1}: {question.question}</p>
                        <p className="text-xs text-text-tertiary">
                          {answer.answer === null ? t('examPrepLegendNotAttempted') : t('examPrepSelected').replace('{letter}', String.fromCharCode(65 + answer.answer))}
                          {answer.flagged ? ` · ${t('examPrepFlagged')}` : ''}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-tertiary shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {moduleBreakdown.length > 0 && (
              <div className="ux-card">
                <p className="text-sm font-semibold mb-4">{t('examPrepBreakdown')}</p>
                <div className="space-y-3">
                  {moduleBreakdown.map((bucket) => (
                    <div key={bucket.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-secondary">{bucket.label}</span>
                        <span className="font-mono text-text-primary">{bucket.correct}/{bucket.total} ({bucket.pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-hover">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${bucket.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={resetExam}
                className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:border-brand-500/25"
              >
                {t('examPrepRetake')}
              </button>

              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQ(0);
                    setShowExplanations(true);
                    setPhase('review');
                  }}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:border-brand-500/25"
                >
                  {t('examPrepReviewAnswers')}
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
                >
                  {t('examPrepComplete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
