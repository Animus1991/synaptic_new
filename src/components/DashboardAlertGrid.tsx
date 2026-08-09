import {
  Target, CheckSquare, Warning as AlertTriangle, Lightbulb, ArrowRight,
} from '@phosphor-icons/react';
import { cn } from '../utils/cn';
import type { DashboardSmartCTA } from '../lib/examPrep/dashboardSmartCTAs';
import type { ProactiveAgentAlert } from '../lib/proactiveAgentAlerts';
import { useI18n } from '../lib/i18n';
import { useMinimalTheme } from '../lib/useMinimalTheme';
import { AllCapsLabel } from './ui/AllCapsLabel';

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
 * Semantic alert list (exam / quiz / forgetting / misconception).
 * OPT-K90 / OPT-K91 — ink owns type; neutral washes.
 * OPT-K111 — interactive rows (hover wash + chevron), no 2×2 outline cages.
 * OPT-K115 — spacing stack (no row hairlines).
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
  const quiet = useMinimalTheme();

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

  const iconClass = 'text-text-secondary';
  const IconFor: Record<Slot['tone'], typeof Target> = {
    exam: Target,
    quiz: CheckSquare,
    forget: AlertTriangle,
    misconception: Lightbulb,
  };

  return (
    <div
      className={cn('dashboard-alert-list flex flex-col gap-0.5', className)}
      data-testid="dashboard-alert-grid"
      data-layout="list"
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
              'dashboard-alert-row flex w-full items-start gap-2.5 rounded-lg border-0 bg-transparent px-1.5 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
              slot.onClick && 'cursor-pointer hover:bg-surface-secondary/55',
              !slot.onClick && 'cursor-default',
            )}
            data-tone={slot.tone}
            data-testid={`dashboard-alert-${slot.id}`}
          >
            <Icon
              className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)}
              weight={quiet ? 'regular' : 'duotone'}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="type-micro font-semibold uppercase tracking-wide text-text-secondary">
                <AllCapsLabel>{slot.title}</AllCapsLabel>
              </p>
              <p className="type-caption mt-0.5 line-clamp-2 text-text-primary">{slot.body}</p>
            </div>
            {slot.onClick && (
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
