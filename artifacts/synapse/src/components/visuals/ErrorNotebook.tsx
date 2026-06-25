import { BookX, CheckCircle2 } from 'lucide-react';
import type { MistakeRecord } from '../../types';

interface Props {
  mistakes: MistakeRecord[];
  onResolve?: (id: string) => void;
}

export function ErrorNotebook({ mistakes, onResolve }: Props) {
  if (mistakes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-accent-rose/30 bg-accent-rose/5 p-5">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-accent-rose">
        <BookX className="w-4 h-4" />
        Error notebook — {mistakes.length} open mistake{mistakes.length !== 1 ? 's' : ''}
      </h3>
      <div className="space-y-3">
        {mistakes.slice(0, 5).map((m) => (
          <div key={m.id} className="p-3 rounded-xl bg-surface-card border border-border-subtle">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary">{m.concept}</p>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{m.questionSummary}</p>
                {m.wrongAnswer && (
                  <p className="text-[10px] text-accent-rose mt-1.5">Your answer: {m.wrongAnswer}</p>
                )}
                {m.correctAnswer && (
                  <p className="text-[10px] text-accent-emerald mt-0.5">Correct: {m.correctAnswer}</p>
                )}
              </div>
              {onResolve && (
                <button
                  onClick={() => onResolve(m.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-accent-emerald/10 text-accent-emerald transition-colors"
                  title="Mark resolved"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
