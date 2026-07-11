import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Sparkles, BookX } from '@/lib/lucide-shim';
import type { MistakeRecord } from '../types';
import { cn } from '../utils/cn';

interface MistakeRetryViewProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onComplete: () => void;
  onResolveMistake: (id: string) => void;
  mistakes: MistakeRecord[];
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
}

type Reassessment = {
  options: string[];
  correctIndex: number;
  selected: number | null;
  passed: boolean;
};

function buildReassessment(m: MistakeRecord): Reassessment | null {
  if (!m.correctAnswer?.trim()) return null;
  const correct = m.correctAnswer.trim();
  const distractors = [
    m.wrongAnswer?.trim(),
    'Repeat the same approach without checking the concept',
    'Skip reviewing and move on',
  ].filter((value): value is string => Boolean(value && value !== correct));
  const uniqueDistractors = [...new Set(distractors)].slice(0, 3);
  while (uniqueDistractors.length < 3) {
    uniqueDistractors.push(`Alternative misunderstanding ${uniqueDistractors.length + 1}`);
  }
  const options = [correct, ...uniqueDistractors.slice(0, 3)];
  return { options, correctIndex: 0, selected: null, passed: false };
}

export function MistakeRetryView({
  onClose,
  onOpenAgent,
  onComplete,
  onResolveMistake,
  mistakes,
  taskTitle,
  courseName,
  quizConcept = 'Concept',
  xpReward = 35,
}: MistakeRetryViewProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [reassessments, setReassessments] = useState<Record<string, Reassessment>>({});

  const sessionTitle = taskTitle ?? `Retry: ${quizConcept}`;
  const sessionCourse = courseName ?? 'Targeted repair';
  const allResolved = mistakes.length === 0 || mistakes.every((m) => resolvedIds.has(m.id));

  const startReassessment = (m: MistakeRecord) => {
    const check = buildReassessment(m);
    if (!check) return;
    setReassessments((prev) => ({ ...prev, [m.id]: check }));
  };

  const selectReassessment = (id: string, optionIndex: number) => {
    setReassessments((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const passed = optionIndex === current.correctIndex;
      return {
        ...prev,
        [id]: { ...current, selected: optionIndex, passed },
      };
    });
  };

  const handleResolve = (id: string) => {
    const check = reassessments[id];
    if (!check?.passed) return;
    onResolveMistake(id);
    setResolvedIds((prev) => new Set(prev).add(id));
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-surface-secondary/50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <p className="text-sm font-semibold">{sessionTitle}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-accent-orange" />
              {sessionCourse} · Mistake retry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle hover:border-brand-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Diagnose with Agent
          </button>
          <span className="text-xs text-accent-amber font-medium">+{xpReward} XP</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-5">
        <div className="p-4 rounded-xl bg-accent-orange/5 border border-accent-orange/20">
          <h2 className="text-sm font-semibold text-accent-orange mb-1">Repair focus: {quizConcept}</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Review each mistake below. Confirm you understand the correct approach before completing the retry.
          </p>
        </div>

        {mistakes.length === 0 ? (
          <div className="p-5 rounded-xl bg-surface-card border border-border-subtle text-center">
            <BookX className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No open mistakes logged for this topic.</p>
            <p className="text-xs text-text-tertiary mt-1">Complete the retry once you&apos;ve reviewed the concept.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mistakes.map((m) => {
              const resolved = resolvedIds.has(m.id);
              const check = reassessments[m.id];
              const canReassess = Boolean(m.correctAnswer?.trim());
              return (
                <div
                  key={m.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all',
                    resolved
                      ? 'bg-accent-emerald/5 border-accent-emerald/20 opacity-80'
                      : 'bg-surface-card border-border-subtle',
                  )}
                >
                  <p className="text-xs font-semibold text-text-primary">{m.concept}</p>
                  <p className="text-sm text-text-secondary mt-1">{m.questionSummary}</p>
                  {m.wrongAnswer && (
                    <p className="text-xs text-accent-rose mt-2">Your answer: {m.wrongAnswer}</p>
                  )}
                  {m.correctAnswer && (
                    <p className="text-xs text-accent-emerald mt-1">Correct: {m.correctAnswer}</p>
                  )}

                  {!resolved && canReassess && !check && (
                    <button
                      onClick={() => startReassessment(m)}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-secondary hover:bg-surface-hover text-text-primary transition-all"
                    >
                      Check understanding
                    </button>
                  )}

                  {!resolved && !canReassess && (
                    <p className="text-xs text-text-tertiary mt-3">
                      Use Diagnose with Agent to verify understanding before resolving.
                    </p>
                  )}

                  {!resolved && check && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-text-primary">Which approach is correct?</p>
                      {check.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectReassessment(m.id, i)}
                          className={cn(
                            'w-full text-left p-2.5 rounded-lg border text-xs transition-all',
                            check.selected === i
                              ? i === check.correctIndex
                                ? 'border-accent-emerald/50 bg-accent-emerald/10 text-accent-emerald'
                                : 'border-accent-rose/50 bg-accent-rose/10 text-accent-rose'
                              : 'border-border-subtle hover:border-brand-500/30',
                          )}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </button>
                      ))}
                      {check.selected !== null && !check.passed && (
                        <p className="text-xs text-accent-rose">Review the correct answer above and try again.</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleResolve(m.id)}
                    disabled={resolved || !check?.passed}
                    className={cn(
                      'mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      resolved
                        ? 'text-accent-emerald cursor-default'
                        : check?.passed
                          ? 'bg-brand-600 hover:bg-brand-500 text-white'
                          : 'bg-surface-hover text-text-muted cursor-not-allowed',
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resolved ? 'Resolved' : 'Confirm resolved'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle bg-surface-secondary/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <span className="text-xs text-text-muted">
            {mistakes.length > 0
              ? `${resolvedIds.size}/${mistakes.length} mistakes resolved`
              : 'Ready to mark complete'}
          </span>
          <button
            onClick={handleComplete}
            disabled={mistakes.length > 0 && !allResolved}
            className={cn(
              'px-5 py-2 rounded-xl text-sm font-medium transition-all',
              allResolved
                ? 'bg-brand-600 hover:bg-brand-500 text-white'
                : 'bg-surface-hover text-text-muted cursor-not-allowed',
            )}
          >
            Complete retry
          </button>
        </div>
      </div>
    </div>
  );
}
