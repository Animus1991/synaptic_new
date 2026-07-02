import { BookX, CheckSquare } from '@/lib/lucide-shim';
import type { MistakeRecord } from '../../types';

interface Props {
  mistakes: MistakeRecord[];
  onResolve?: (id: string) => void;
}

export function ErrorNotebook({ mistakes, onResolve }: Props) {
  if (mistakes.length === 0) return null;

  return (
    <div className="ws-bento p-5 platform-banner-danger">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 platform-banner-title">
        <BookX className="w-4 h-4 shrink-0" />
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
                  <p className="text-[10px] text-accent-rose mt-1.5 font-medium">Your answer: {m.wrongAnswer}</p>
                )}
                {m.correctAnswer && (
                  <p className="text-[10px] text-accent-emerald mt-0.5 font-medium">Correct: {m.correctAnswer}</p>
                )}
              </div>
              {onResolve && (
                <button
                  onClick={() => onResolve(m.id)}
                  className="shrink-0 p-1.5 rounded-lg border border-border-subtle hover:border-brand-300 bg-surface-card hover:bg-surface-hover text-text-secondary hover:text-brand-700 transition-colors"
                  title="Mark resolved"
                  aria-label="Mark resolved"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
