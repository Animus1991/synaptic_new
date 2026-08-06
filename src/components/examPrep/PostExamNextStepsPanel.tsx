import { ArrowRight, GraduationCap } from '@/lib/lucide-shim';
import { filterPostExamLinks, isPostExamPhase } from '../../lib/examPrep/postExamNextSteps';
import { useI18n } from '../../lib/i18n';
import { CollapsibleChromeSection } from '../workspace/CollapsibleChromeSection';

type Props = {
  examDate?: string;
};

export function PostExamNextStepsPanel({ examDate }: Props) {
  const { t } = useI18n();
  /* OPT-K65 — only when post-exam phase has meaning (not always-on editorial) */
  const show = isPostExamPhase(examDate);
  const links = filterPostExamLinks();

  if (!show) return null;

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
    </CollapsibleChromeSection>
  );
}
