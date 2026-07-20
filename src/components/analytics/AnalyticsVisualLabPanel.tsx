import { useState } from 'react';
import { cn } from '../../utils/cn';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { SectionHeader } from '../ui/platformChrome';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';
import type { SankeyLink } from '../../lib/knowledgeFlowAnalytics';
import type { RetentionForecastPoint } from '../../lib/adaptiveScheduler';
import type { SkillNode } from '../../types';
import { SOURCE_VISUAL_TILES, VISUAL_LAB_MODES, type VisualLabModeId } from '../../lib/visualLabModes';
import { SourceFlowDiagram } from './SourceFlowDiagram';
import { RetentionSparklineBoard } from './RetentionSparklineBoard';
import {
  ConceptGraphDecorativeBoard,
  ExamPathDecorativeBoard,
  FormulaDecorativeBoard,
  MasteryRingDecorativeBoard,
} from './VisualLabDecorativeBoards';

type Props = {
  sankeyLinks: SankeyLink[];
  sankeyHasData: boolean;
  forecast: RetentionForecastPoint[];
  skills: SkillNode[];
};

function VisualLabModeBoard({
  mode,
  sankeyLinks,
  sankeyHasData,
  forecast,
  skills,
  sourceLabel,
  sparkLabel,
  emptyHint,
}: {
  mode: VisualLabModeId;
  sankeyLinks: SankeyLink[];
  sankeyHasData: boolean;
  forecast: RetentionForecastPoint[];
  skills: SkillNode[];
  sourceLabel: string;
  sparkLabel: string;
  emptyHint: string;
}) {
  switch (mode) {
    case 'source':
      return <SourceFlowDiagram links={sankeyLinks} hasData={sankeyHasData} ariaLabel={sourceLabel} />;
    case 'concept':
      return <ConceptGraphDecorativeBoard />;
    case 'mastery':
      return <MasteryRingDecorativeBoard />;
    case 'retention':
      return (
        <RetentionSparklineBoard
          forecast={forecast}
          skills={skills}
          ariaLabel={sparkLabel}
          emptyHint={emptyHint}
        />
      );
    case 'exam':
      return <ExamPathDecorativeBoard />;
    case 'formula':
      return <FormulaDecorativeBoard />;
    default:
      return null;
  }
}

/** Analytics Visual Lab — 6-mode rail + decorative boards (Wave E14). */
export function AnalyticsVisualLabPanel({
  sankeyLinks,
  sankeyHasData,
  forecast,
  skills,
}: Props) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<VisualLabModeId>('source');
  const active = VISUAL_LAB_MODES.find((m) => m.id === mode) ?? VISUAL_LAB_MODES[0];

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
        className="visual-lab-panel-header"
        eyebrow={lang === 'el' ? 'Οπτικό εργαστήριο' : 'Visual lab'}
        title={lang === 'el' ? 'Blueprint diagram rail' : 'Blueprint diagram rail'}
        subtitle={t('analyticsFlowSectionSubtitle')}
        animate={false}
      />

      <div
        className="visual-lab-mode-rail visual-lab-mode-rail-lanes mt-5 flex overflow-x-auto pb-1"
        role="tablist"
        aria-label={lang === 'el' ? 'Λειτουργίες οπτικού εργαστηρίου' : 'Visual lab modes'}
      >
        {VISUAL_LAB_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            data-testid={`visual-lab-mode-${item.id}`}
            onClick={() => setMode(item.id)}
            className={cn(
              'visual-lab-mode-tab',
              mode === item.id && 'visual-lab-mode-tab-active',
            )}
          >
            <span className="text-sm font-semibold text-text-primary">{t(item.titleKey)}</span>
            <span className="mt-1 block text-xs leading-5 text-text-secondary">{t(item.subtitleKey)}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="visual-lab-board-well">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3 visual-lab-board-head">
            <div>
              <p className="dashboard-live-preview-eyebrow"><AllCapsLabel>{t('visualLabCurrentModeEyebrow')}</AllCapsLabel></p>
              <p className="dashboard-preview-title mt-1">{t(active.titleKey)}</p>
            </div>
            <span className="visual-lab-mode-badge">{t('visualLabDecorativeBadge')}</span>
          </div>
          <p className="text-sm leading-6 text-text-secondary">{t(active.hintKey)}</p>
          <div className="visual-lab-board-frame ux-canvas-frame mt-4">
            <VisualLabModeBoard
              mode={mode}
              sankeyLinks={sankeyLinks}
              sankeyHasData={sankeyHasData}
              forecast={forecast}
              skills={skills}
              sourceLabel={sourceLabel}
              sparkLabel={sparkLabel}
              emptyHint={emptyHint}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="visual-lab-side-panel">
            <p className="dashboard-live-preview-eyebrow"><AllCapsLabel>{t('visualLabGuidanceEyebrow')}</AllCapsLabel></p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
              <p>{t('visualLabGuidance1')}</p>
              <p>{t('visualLabGuidance2')}</p>
              <p>{t('visualLabGuidance3')}</p>
              <p>{t('visualLabGuidance4')}</p>
            </div>
          </div>

          <div className="visual-lab-side-panel">
            <p className="dashboard-live-preview-eyebrow"><AllCapsLabel>{t('visualLabMappingEyebrow')}</AllCapsLabel></p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SOURCE_VISUAL_TILES.map((tile) => (
                <div key={tile.id} className="visual-lab-mapping-tile">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-text-primary">{t(tile.labelKey)}</span>
                    <span className="visual-lab-mapping-symbol">{tile.symbol}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{t(tile.visualKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BlueprintSurface>
  );
}
