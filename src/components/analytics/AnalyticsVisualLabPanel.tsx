import { BlueprintSurface } from '../ui/BlueprintSurface';
import { SectionHeader } from '../ui/platformChrome';
import { useI18n } from '../../lib/i18n';
import type { SankeyLink } from '../../lib/knowledgeFlowAnalytics';
import type { RetentionForecastPoint } from '../../lib/adaptiveScheduler';
import type { SkillNode } from '../../types';
import { SourceFlowDiagram } from './SourceFlowDiagram';
import { RetentionSparklineBoard } from './RetentionSparklineBoard';

type Props = {
  sankeyLinks: SankeyLink[];
  sankeyHasData: boolean;
  forecast: RetentionForecastPoint[];
  skills: SkillNode[];
};

/** Decorative analytics well — SourceFlow + RetentionSparkline boards (Wave E10). */
export function AnalyticsVisualLabPanel({
  sankeyLinks,
  sankeyHasData,
  forecast,
  skills,
}: Props) {
  const { t, lang } = useI18n();
  const sourceLabel = lang === 'el'
    ? 'Διακοσμητικό διάγραμμα ροής πηγής προς mastery'
    : 'Decorative source-to-mastery flow diagram';
  const sparkLabel = lang === 'el'
    ? 'Πίνακας sparkline διατήρησης'
    : 'Retention sparkline board';
  const emptyHint = lang === 'el'
    ? 'Οι sparklines εμφανίζονται όταν υπάρχουν δεδομένα FSRS ή εννοιών.'
    : 'Sparklines appear once FSRS or concept retention data is available.';

  return (
    <BlueprintSurface className="analytics-visual-lab p-5" data-testid="analytics-visual-lab">
      <SectionHeader
        eyebrow={lang === 'el' ? 'Οπτικό εργαστήριο' : 'Visual lab'}
        title={lang === 'el' ? 'Blueprint diagram rail' : 'Blueprint diagram rail'}
        subtitle={t('analyticsFlowSectionSubtitle')}
        animate={false}
      />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border-subtle/60 bg-surface-primary/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-3">
            {lang === 'el' ? 'Ροή πηγής' : 'Source flow'}
          </p>
          <SourceFlowDiagram
            links={sankeyLinks}
            hasData={sankeyHasData}
            ariaLabel={sourceLabel}
          />
        </div>

        <div className="rounded-2xl border border-border-subtle/60 bg-surface-primary/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-3">
            {lang === 'el' ? 'Διατήρηση' : 'Retention'}
          </p>
          <RetentionSparklineBoard
            forecast={forecast}
            skills={skills}
            ariaLabel={sparkLabel}
            emptyHint={emptyHint}
          />
        </div>
      </div>
    </BlueprintSurface>
  );
}
