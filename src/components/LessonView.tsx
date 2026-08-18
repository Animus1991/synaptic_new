import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition, slideIn } from '../lib/motion';
import {
  X, CheckCircle2, Circle, ChevronRight, Sparkles,
} from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import { ConfidenceSelector } from './visuals/ConfidenceSelector';
import { GroundedLessonContent } from './grounded/GroundedLessonContent';
import { buildLessonSteps } from '../lib/lessonContent';
import { passThreshold } from '../lib/settingsEffects';
import { isMcQuiz } from '../lib/lessonTypes';
import { getLessonProgress, saveLessonProgress } from '../lib/lessonProgress';
import { useI18n } from '../lib/i18n';
import { useMinimalTheme } from '../lib/useMinimalTheme';
import { Button } from './ui/Button';
import { PrimaryCTA, SecondaryCTA } from './ui/primitives';
import { useWorkspaceNoteBundle } from '../lib/useWorkspaceNoteBundle';
import { generateLessonPanels, canGenerateGroundedLesson } from '../lib/lessonGenerator';
import type { WorkspacePanel } from '../lib/workspaceLessonPanels';
import type { Course, GlossaryEntry, UploadedFile, UserSettings } from '../types';

interface LessonViewProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onComplete?: () => void;
  onQuizAttempt?: (concept: string, correct: boolean, confidence: number, stepKey?: string) => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  taskId?: string;
  courseId?: string;
  settings?: UserSettings;
  overallMastery?: number;
  streak?: number;
  onStartNextTask?: () => void;
  uploadedFiles?: UploadedFile[];
  glossaryEntries?: GlossaryEntry[];
  courses?: Course[];
  onUpload?: () => void;
}

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
export function LessonView({
  onClose,
  onOpenAgent,
  onComplete,
  onQuizAttempt,
  taskTitle,
  courseName,
  quizConcept = 'Study topic',
  xpReward = 50,
  taskId,
  courseId,
  settings,
  overallMastery = 0,
  streak = 0,
  onStartNextTask,
  uploadedFiles = [],
  glossaryEntries = [],
  courses = [],
  onUpload,
}: LessonViewProps) {
  const { t, lang } = useI18n();
  const isMinimal = useMinimalTheme();
  const lessonKey = taskId ? `lesson:${taskId}` : `lesson:${quizConcept.replace(/\s+/g, '-').toLowerCase()}`;

  const noteBundle = useWorkspaceNoteBundle({
    uploadedFiles,
    glossaryEntries,
    courses,
    courseId,
    concept: quizConcept,
    conceptBars: [],
    lang,
  });

  const dynamicSteps = useMemo(() => {
    if (!noteBundle.hasSource) {
      return [{ key: 'hook' as const, label: t('lessonViewUpload') }];
    }
    return buildLessonSteps(settings);
  }, [noteBundle.hasSource, settings, lang]);

  const quizDef = noteBundle.quiz ?? {
    question: t('lessonViewUploadForQuiz'),
    options: ['—', '—', '—', '—'],
    correctIndex: 0,
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [genPanels, setGenPanels] = useState<WorkspacePanel[] | null>(null);
  const [genStatus, setGenStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');

  const groundedAvailable = noteBundle.hasSource && canGenerateGroundedLesson(uploadedFiles, settings);

  useEffect(() => {
    let cancelled = false;
    setGenPanels(null);
    if (!groundedAvailable) {
      setGenStatus('idle');
      return;
    }
    setGenStatus('loading');
    generateLessonPanels(quizConcept, uploadedFiles, settings, courseId)
      .then((panels) => {
        if (cancelled) return;
        if (panels && panels.length > 0) {
          setGenPanels(panels);
          setGenStatus('ready');
        } else {
          setGenStatus('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setGenStatus('fallback');
      });
    return () => { cancelled = true; };
  }, [quizConcept, groundedAvailable, uploadedFiles, settings, courseId]);

  useEffect(() => {
    const saved = getLessonProgress(lessonKey);
    if (saved?.step != null) {
      setCurrentStep(Math.min(saved.step, dynamicSteps.length - 1));
      setQuizPassed(saved.quizPassed ?? false);
    }
  }, [lessonKey, dynamicSteps.length]);

  useEffect(() => {
    saveLessonProgress(lessonKey, {
      step: currentStep,
      practicePassed: true,
      quizPassed,
    });
  }, [lessonKey, currentStep, quizPassed]);

  const lessonTitle = taskTitle ?? quizConcept;
  const lessonCourse = noteBundle.hasSource
    ? (courseName ?? noteBundle.courseTitle ?? t('lessonViewYourCourse'))
    : t('lessonViewUploadNotes');

  const step = dynamicSteps[currentStep] ?? dynamicSteps[0]!;
  const progress = ((currentStep + 1) / dynamicSteps.length) * 100;
  const isLast = currentStep >= dynamicSteps.length - 1;

  const canAdvance = () => {
    if (!noteBundle.hasSource) return false;
    if (step.key === 'retrieval' && !quizPassed) {
      if (settings && overallMastery >= passThreshold(settings)) return true;
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!canAdvance()) return;
    if (isLast) {
      onComplete?.();
      onClose();
      return;
    }
    setCurrentStep((s) => s + 1);
    setQuizAnswer(null);
    setConfidence(null);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const panelForStep = genPanels?.[currentStep] ?? null;

  const stepCountLabel = t('lessonViewStep');

  return (
    <div
      className="fixed inset-0 z-50 bg-surface-primary flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={lessonTitle}
      data-testid="lesson-page"
      data-bleed="full"
      data-border-diet="cta-only"
    >
      <a href="#lesson-main" className="skip-to-content">
        {t('lessonViewSkipToContent')}
      </a>

      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-surface-secondary/40">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('lessonViewCloseLesson')}
            className="p-2 -ml-1 rounded-md hover:bg-surface-hover shrink-0 min-h-9 min-w-9 inline-flex items-center justify-center"
          >
            <X className="w-5 h-5 text-text-secondary" aria-hidden />
          </button>
          <div className="min-w-0">
            <p className="type-micro font-semibold text-text-secondary truncate">
              {lessonCourse}
              {noteBundle.hasSource && (
                <span className="ml-1.5 font-medium text-text-tertiary">
                  · {t('lessonViewFromYourNotes')}
                </span>
              )}
            </p>
            <h1 className="type-title leading-tight truncate">{lessonTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SecondaryCTA
            type="button"
            size="sm"
            onClick={onOpenAgent}
            aria-label={t('agentBtn')}
          >
            <Sparkles className="w-3.5 h-3.5 text-text-secondary" aria-hidden />
            <span className="hidden xs:inline">{t('askAgentShort')}</span>
          </SecondaryCTA>
          <span
            className="ws-num type-caption text-accent-amber font-medium px-2 py-1 rounded border border-accent-amber/20 bg-accent-amber/5"
            aria-label={`${xpReward} XP`}
          >
            +{xpReward} XP
          </span>
        </div>
      </header>

      <div
        className="h-[3px] bg-surface-hover"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('lessonViewProgressAria')}
      >
        <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <nav
        aria-label={t('lessonViewStepsAria')}
        className="flex items-center gap-1 px-4 sm:px-6 py-2 overflow-x-auto scrollbar-none bg-surface-secondary/20"
      >
        {dynamicSteps.map((s, i) => {
          const completed = i < currentStep;
          const current = i === currentStep;
          const accessible = noteBundle.hasSource && i <= currentStep;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => accessible && setCurrentStep(i)}
              disabled={!accessible}
              aria-current={current ? 'step' : undefined}
              aria-label={`${stepCountLabel} ${i + 1}: ${s.label}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded type-caption font-medium tracking-wide transition-colors shrink-0 min-h-8',
                current && 'bg-surface-secondary text-text-primary border border-border-subtle',
                !current && completed && 'text-accent-emerald hover:bg-surface-hover',
                !current && !completed && 'text-text-muted',
                !accessible && 'cursor-not-allowed opacity-60',
              )}
            >
              {completed
                ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                : <Circle className={cn('w-3.5 h-3.5', !current && 'opacity-40')} aria-hidden="true" />}
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </nav>

      <main id="lesson-main" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
        <div
          className={cn(
            'w-full min-w-0 max-w-none py-6 sm:py-8',
            /* OPT-K85 — non-Minimal full column */
            isMinimal ? 'px-4 sm:px-6 lg:px-8' : 'shell-edge-balance',
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              variants={slideIn}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={emphasizedTransition}
            >
              <GroundedLessonContent
                stepKey={step.key}
                stepLabel={step.label}
                concept={quizConcept}
                noteText={noteBundle.readerText}
                hasSource={noteBundle.hasSource}
                emptyMessage={noteBundle.emptyMessage}
                sourceName={noteBundle.sourceName}
                topic={noteBundle.matchingTopic}
                generatedPanel={panelForStep}
                genStatus={genStatus}
                quizDef={quizDef}
                quizAnswer={quizAnswer}
                quizPassed={quizPassed}
                onQuizSelect={(idx) => {
                  if (!isMcQuiz(quizDef)) return;
                  setQuizAnswer(idx);
                  const correct = idx === quizDef.correctIndex;
                  setQuizPassed(correct);
                  onQuizAttempt?.(quizConcept, correct, confidence ?? 75, `${lessonKey}:${step.key}`);
                }}
                onOpenAgent={onOpenAgent}
                onUpload={onUpload}
                lang={lang}
                t={t}
              />

              {step.key === 'retrieval' && quizAnswer !== null && (
                <div className="mt-6">
                  <ConfidenceSelector value={confidence} onChange={setConfidence} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="bg-surface-secondary/30">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={currentStep === 0}
            aria-label={t('previous')}
          >
            <ChevronRight className="w-4 h-4 rotate-180" aria-hidden="true" />
            <span className="hidden xs:inline">{t('previous')}</span>
          </Button>
          <div className="text-center min-w-0">
            <p className="ws-num type-caption text-text-secondary">
              {currentStep + 1} <span className="text-text-muted">/ {dynamicSteps.length}</span>
            </p>
            {noteBundle.hasSource && (
              <p className="ws-num type-micro text-text-muted mt-0.5">
                {overallMastery}% · {streak}d
              </p>
            )}
          </div>
          <PrimaryCTA
            type="button"
            size="sm"
            onClick={goNext}
            disabled={!canAdvance()}
            aria-label={isLast ? t('finish') : t('next')}
          >
            <span>{isLast ? t('finish') : t('next')}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </PrimaryCTA>
        </div>

        {isLast && quizPassed && onStartNextTask && (
          <div className="px-4 sm:px-6 pb-4">
            <PrimaryCTA
              type="button"
              onClick={onStartNextTask}
              className="w-full"
            >
              {t('lessonViewNextTask')}
            </PrimaryCTA>
          </div>
        )}
      </footer>
    </div>
  );
}
