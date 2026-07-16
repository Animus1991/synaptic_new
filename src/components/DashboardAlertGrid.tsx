import {
  Target, CheckSquare, Warning as AlertTriangle, Lightbulb, ArrowRight,
} from '@phosphor-icons/react';
import { cn } from '../utils/cn';
import type { DashboardSmartCTA } from '../lib/examPrep/dashboardSmartCTAs';
import type { ProactiveAgentAlert } from '../lib/proactiveAgentAlerts';
import { useI18n } from '../lib/i18n';

export type DashboardAlertGridProps = {
  daysToExam: number | null;
  smartCTAs: DashboardSmartCTA[];
  proactiveAlerts: ProactiveAgentAlert[];
  onRunSmartCTA?: (cta: DashboardSmartCTA) => void;
  onRunProactiveAlert?: (alert: ProactiveAgentAlert) => void;
  onExamPrep?: () => void;
  className?: string;
};

type Slot = {
  id: string;
  tone: 'exam' | 'quiz' | 'forget' | 'misconception';
  title: string;
  body: string;
  onClick?: () => void;
};

/**
 * Mockup 2×2 semantic alert grid (exam / quiz / forgetting / misconception).
 * Maps production smart CTAs + proactive alerts without removing handlers.
 */
export function DashboardAlertGrid({
  daysToExam,
  smartCTAs,
  proactiveAlerts,
  onRunSmartCTA,
  onRunProactiveAlert,
  onExamPrep,
  className,
}: DashboardAlertGridProps) {
  const { t } = useI18n();

  const forget = proactiveAlerts.find((a) => a.kind === 'forgetting-risk');
  const quizAlert = proactiveAlerts.find((a) => a.kind === 'quiz-fail-streak');
  const quizCta = smartCTAs.find((c) => c.tool === 'quiz' || c.id.includes('quiz') || c.id.includes('coverage'));
  const misconception = proactiveAlerts.find((a) => a.kind === 'misconception');
  const examCta = smartCTAs.find((c) => c.simulatorTab === 'exam-prep');

  const slots: Slot[] = [];

  if (daysToExam !== null || examCta) {
    slots.push({
      id: 'exam',
      tone: 'exam',
      title: t('dashExamPrep'),
      body: examCta?.hint
        ?? examCta?.label
        ?? (daysToExam === 0
          ? t('dashExamToday')
          : daysToExam === 1
            ? t('dashDayUntilExam')
            : t('dashDaysUntilExam').replace('{count}', String(daysToExam ?? 0))),
      onClick: examCta && onRunSmartCTA
        ? () => onRunSmartCTA(examCta)
        : onExamPrep,
    });
  }

  if (quizAlert) {
    slots.push({
      id: 'quiz',
      tone: 'quiz',
      title: quizAlert.title,
      body: quizAlert.message,
      onClick: onRunProactiveAlert ? () => onRunProactiveAlert(quizAlert) : undefined,
    });
  } else if (quizCta) {
    slots.push({
      id: 'quiz',
      tone: 'quiz',
      title: t('dashAlertQuizTitle'),
      body: quizCta.hint ?? quizCta.label,
      onClick: onRunSmartCTA ? () => onRunSmartCTA(quizCta) : undefined,
    });
  }

  if (forget) {
    slots.push({
      id: 'forget',
      tone: 'forget',
      title: forget.title,
      body: forget.message,
      onClick: onRunProactiveAlert ? () => onRunProactiveAlert(forget) : undefined,
    });
  }

  if (misconception) {
    slots.push({
      id: 'misconception',
      tone: 'misconception',
      title: misconception.title,
      body: misconception.message,
      onClick: onRunProactiveAlert ? () => onRunProactiveAlert(misconception) : undefined,
    });
  }

  if (slots.length === 0) return null;

  const toneClass: Record<Slot['tone'], string> = {
    exam: 'border-brand-500/25 bg-brand-600/5',
    quiz: 'border-accent-cyan/25 bg-accent-cyan/5',
    forget: 'border-accent-rose/25 bg-accent-rose/5',
    misconception: 'border-accent-amber/25 bg-accent-amber/5',
  };
  const iconClass: Record<Slot['tone'], string> = {
    exam: 'text-brand-600',
    quiz: 'text-accent-cyan',
    forget: 'text-accent-rose',
    misconception: 'text-accent-amber',
  };
  const IconFor: Record<Slot['tone'], typeof Target> = {
    exam: Target,
    quiz: CheckSquare,
    forget: AlertTriangle,
    misconception: Lightbulb,
  };

  return (
    <div
      className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}
      data-testid="dashboard-alert-grid"
    >
      {slots.slice(0, 4).map((slot) => {
        const Icon = IconFor[slot.tone];
        return (
          <button
            key={slot.id}
            type="button"
            onClick={slot.onClick}
            disabled={!slot.onClick}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              toneClass[slot.tone],
              slot.onClick && 'hover:bg-surface-hover/60 cursor-pointer',
              !slot.onClick && 'cursor-default',
            )}
            data-testid={`dashboard-alert-${slot.id}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', iconClass[slot.tone])} weight="duotone" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                  {slot.title}
                </p>
                <p className="text-xs text-text-primary mt-0.5 line-clamp-2">{slot.body}</p>
              </div>
              {slot.onClick && <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" aria-hidden />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
