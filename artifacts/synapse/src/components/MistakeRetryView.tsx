import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Sparkles, BookX } from 'lucide-react';
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

  const sessionTitle = taskTitle ?? `Retry: ${quizConcept}`;
  const sessionCourse = courseName ?? 'Targeted repair';
  const allResolved = mistakes.length === 0 || mistakes.every((m) => resolvedIds.has(m.id));

  const handleResolve = (id: string) => {
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
                  <button
                    onClick={() => handleResolve(m.id)}
                    disabled={resolved}
                    className={cn(
                      'mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      resolved
                        ? 'text-accent-emerald cursor-default'
                        : 'bg-brand-600 hover:bg-brand-500 text-white',
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resolved ? 'Resolved' : 'I got it'}
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
