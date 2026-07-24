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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <p className="text-sm font-semibold">{sessionTitle}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              {sessionCourse} · FSRS review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle hover:border-brand-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Ask Agent
          </button>
          <span className="text-xs text-accent-amber font-medium">+{xpReward} XP</span>
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
        <p className="text-xs text-text-muted text-center max-w-md mx-auto">
          Flip the card, recall the answer, then rate your recall. Your FSRS interval updates automatically.
        </p>
      </div>
    </div>
  );
}
