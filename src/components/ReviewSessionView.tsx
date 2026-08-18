import { X, RotateCcw, Sparkles } from '@/lib/lucide-shim';
import { LeitnerBox } from './workspace/LeitnerBox';
import type { FsrsRating } from '../lib/pedagogy';

interface ReviewSessionViewProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onReviewRating: (rating: FsrsRating) => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  cards?: { front: string; back: string }[];
}

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function ReviewSessionView({
  onClose,
  onOpenAgent,
  onReviewRating,
  taskTitle,
  courseName,
  quizConcept = 'Concept',
  xpReward = 30,
  cards,
}: ReviewSessionViewProps) {
  const sessionTitle = taskTitle ?? `Review: ${quizConcept}`;
  const sessionCourse = courseName ?? 'Spaced Repetition';

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-surface-secondary/50">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} aria-label="Close review session" className="p-1.5 rounded-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
            <X className="w-5 h-5 text-text-secondary" aria-hidden />
          </button>
          <div>
            <p className="type-meta font-semibold">{sessionTitle}</p>
            <p className="type-caption text-text-tertiary flex items-center gap-1">
              <RotateCcw className="w-3 h-3" aria-hidden />
              {sessionCourse} · FSRS review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAgent}
            aria-label="Ask Agent"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg type-caption font-medium border border-border-subtle hover:border-brand-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-text-secondary" aria-hidden /> Ask Agent
          </button>
          <span className="type-caption text-accent-amber font-medium">+{xpReward} XP</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <LeitnerBox
          cards={cards}
          concept={quizConcept}
          onRate={onReviewRating}
          completeOnRate
        />
      </div>

      <div className="border-t border-border-subtle bg-surface-secondary/50 px-4 py-3">
        <p className="type-caption text-text-muted text-center max-w-md mx-auto">
          Flip the card, recall the answer, then rate your recall. Your FSRS interval updates automatically.
        </p>
      </div>
    </div>
  );
}
