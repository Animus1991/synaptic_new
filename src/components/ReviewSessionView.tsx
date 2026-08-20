import { useState } from 'react';
import { X, RotateCcw, Sparkles, CheckCircle2 } from '@/lib/lucide-shim';
import { LeitnerBox } from './workspace/LeitnerBox';
import type { FsrsRating } from '../lib/pedagogy';
import { useI18n } from '../lib/i18n';
import { cn } from '../utils/cn';

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
  const { t } = useI18n();
  const [ratedCount, setRatedCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const total = cards?.length ?? 0;
  const sessionTitle = taskTitle ?? `Review: ${quizConcept}`;
  const sessionCourse = courseName ?? t('reviewSessionSpacedRepLabel');

  const handleRating = (rating: FsrsRating) => {
    onReviewRating(rating);
    const next = ratedCount + 1;
    setRatedCount(next);
    if (total > 0 && next >= total) {
      setShowSummary(true);
    }
  };

  const handleReviewAgain = () => {
    setRatedCount(0);
    setShowSummary(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-surface-secondary/50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 rounded-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            <X className="w-5 h-5 text-text-secondary" aria-hidden />
          </button>
          <div>
            <p className="type-meta font-semibold">{sessionTitle}</p>
            <p className="type-caption text-text-tertiary flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-text-tertiary" aria-hidden />
              {sessionCourse} · FSRS review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && !showSummary && (
            <span className="type-caption text-text-muted tabular-nums">
              {t('reviewSessionCardProgress')
                .replace('{current}', String(Math.min(ratedCount + 1, total)))
                .replace('{total}', String(total))}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenAgent}
            aria-label={t('reviewSessionAskAgent')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg type-caption font-medium border border-border-subtle hover:border-brand-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-text-secondary" aria-hidden /> {t('reviewSessionAskAgent')}
          </button>
          <span className="type-caption text-accent-amber font-medium">+{xpReward} XP</span>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-0.5 bg-surface-hover" role="progressbar" aria-valuenow={ratedCount} aria-valuemin={0} aria-valuemax={total} aria-label={t('reviewSessionCardProgress').replace('{current}', String(ratedCount)).replace('{total}', String(total))}>
          <div
            className="h-full bg-brand-500/60 transition-all duration-500"
            style={{ width: `${(ratedCount / total) * 100}%` }}
          />
        </div>
      )}

      {/* Session summary overlay */}
      {showSummary ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="w-14 h-14 rounded-full bg-accent-emerald/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-accent-emerald" aria-hidden />
          </div>
          <div className="text-center space-y-1">
            <h2 className="type-title font-bold text-text-primary">{t('reviewSessionSummaryTitle')}</h2>
            <p className="type-body text-text-secondary">
              {t('reviewSessionSummaryCards').replace('{count}', String(ratedCount))}
            </p>
            <p className="type-meta font-semibold text-accent-amber">
              {t('reviewSessionSummaryXp').replace('{xp}', String(xpReward))}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReviewAgain}
              className={cn(
                'px-4 py-2 rounded-xl type-meta font-medium border border-border-subtle',
                'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all',
              )}
            >
              {t('reviewSessionSummaryReview')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'px-5 py-2 rounded-xl type-meta font-medium bg-brand-600 hover:bg-brand-500 text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 transition-all',
              )}
            >
              {t('reviewSessionSummaryClose')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <LeitnerBox
            cards={cards}
            concept={quizConcept}
            onRate={handleRating}
            completeOnRate
          />
        </div>
      )}

      {/* Footer */}
      {!showSummary && (
        <div className="border-t border-border-subtle bg-surface-secondary/50 px-4 py-3">
          <p className="type-caption text-text-muted text-center max-w-md mx-auto">
            {t('reviewSessionFsrsHint')}
          </p>
        </div>
      )}
    </div>
  );
}
