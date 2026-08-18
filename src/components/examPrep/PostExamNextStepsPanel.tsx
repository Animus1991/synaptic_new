import { ArrowRight, GraduationCap } from '@/lib/lucide-shim';
import {
  buildPostExamStudyActions,
  filterPostExamLinks,
  isPostExamPhase,
  type PostExamStudyAction,
} from '../../lib/examPrep/postExamNextSteps';
import type { SessionType } from '../../lib/taskFlows';
import { useI18n } from '../../lib/i18n';
import { Button } from '../ui/Button';
import { CollapsibleChromeSection } from '../workspace/CollapsibleChromeSection';

type Props = {
  examDate?: string;
  courseTitles?: string[];
  weakAreas?: { concept: string; mastery: number }[];
  misconceptions?: { id: string; concept: string; corrected?: boolean }[];
  reviewDueCount?: number;
  onStartSession?: (session: SessionType) => void;
  onFocusWeakArea?: (concept: string) => void;
  onOpenWorkspace?: () => void;
  onNavigate?: (view: 'library' | 'tasks' | 'agent' | 'course' | 'analytics') => void;
};

export function PostExamNextStepsPanel({
  examDate,
  courseTitles = [],
  weakAreas = [],
  misconceptions = [],
  reviewDueCount = 0,
  onStartSession,
  onFocusWeakArea,
  onOpenWorkspace,
  onNavigate,
}: Props) {
  const { t } = useI18n();
  /* OPT-K65 — only when post-exam phase has meaning (not always-on editorial) */
  const show = isPostExamPhase(examDate);
  const actions = buildPostExamStudyActions({ weakAreas, misconceptions, reviewDueCount });
  const links = filterPostExamLinks({ courseTitles });

  if (!show) return null;

  const runAction = (action: PostExamStudyAction) => {
    if (action.kind === 'review') {
      onStartSession?.('review');
      if (!onStartSession) onNavigate?.('tasks');
      return;
    }
    if ((action.kind === 'weak-area' || action.kind === 'misconception') && action.concept) {
      if (onFocusWeakArea) {
        onFocusWeakArea(action.concept);
        return;
      }
    }
    onOpenWorkspace?.();
    if (!onOpenWorkspace) onNavigate?.('tasks');
  };

  return (
    /* Wave H2 — after-exam links nested closed; warm Ask Tutor copy */
    <CollapsibleChromeSection
      title={t('examPrepNextStepsTitle')}
      alwaysCollapse
      data-testid="post-exam-next-steps"
    >
      <div className="space-y-3 px-1 pb-2" data-bleed="full">
        <p className="flex items-start gap-2 type-caption text-text-secondary">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
          <span>{t('examPrepNextStepsSubtitle')}</span>
        </p>
        <div data-testid="post-exam-study-actions">
          <p className="mb-1.5 type-caption font-medium text-text-muted">{t('examPrepNextStepsStudyTitle')}</p>
          <ul className="flex flex-col gap-1.5">
            {actions.map((action) => (
              <li key={action.id}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  data-testid={`post-exam-action-${action.kind}`}
                  onClick={() => runAction(action)}
                >
                  {t(action.titleKey).replace('{concept}', action.concept ?? '')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 type-caption font-medium text-text-muted">{t('examPrepNextStepsResourcesTitle')}</p>
          <ul className="dashboard-course-grid grid grid-cols-1 gap-2 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full rounded-lg border border-border-subtle bg-surface-card/40 p-3 transition-colors hover:border-border-default"
                  data-testid={`next-step-${link.id}`}
                >
                  <p className="proximity-row type-meta font-semibold text-text-primary">
                    <span className="proximity-row-label">{t(link.titleKey as never)}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-text-muted" aria-hidden />
                  </p>
                  <p className="mt-1 type-caption text-text-secondary">{t(link.descriptionKey as never)}</p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CollapsibleChromeSection>
  );
}
