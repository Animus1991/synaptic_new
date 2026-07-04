import { ArrowRight, GraduationCap } from '@/lib/lucide-shim';
import { filterPostExamLinks, isPostExamPhase } from '../../lib/examPrep/postExamNextSteps';
import { useI18n } from '../../lib/i18n';
import { PlatformSection } from '../ui/primitives';

type Props = {
  examDate?: string;
};

export function PostExamNextStepsPanel({ examDate }: Props) {
  const { t } = useI18n();
  const show = isPostExamPhase(examDate) || !examDate;
  const links = filterPostExamLinks();

  if (!show && examDate) return null;

  return (
    <PlatformSection
      tone="muted"
      title={t('examPrepNextStepsTitle')}
      icon={GraduationCap}
      data-testid="post-exam-next-steps"
    >
      <p className="text-xs text-text-secondary mb-4">{t('examPrepNextStepsSubtitle')}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border-subtle bg-surface-card/40 p-3 hover:border-brand-500/30 transition-colors h-full"
              data-testid={`next-step-${link.id}`}
            >
              <p className="text-sm font-semibold text-text-primary flex items-center gap-1">
                {t(link.titleKey as never)}
                <ArrowRight className="w-3 h-3 text-text-muted" />
              </p>
              <p className="text-[11px] text-text-secondary mt-1">{t(link.descriptionKey as never)}</p>
            </a>
          </li>
        ))}
      </ul>
    </PlatformSection>
  );
}
