import { useState } from 'react';
import { cn } from '../../utils/cn';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { SectionHeader } from '../ui/platformChrome';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';
import { CollapsibleChromeSection } from '../workspace/CollapsibleChromeSection';
import type { SankeyLink } from '../../features/analytics/knowledgeFlowAnalytics';
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
  overallMastery?: number;
  courseCount?: number;
};

function linkSum(links: SankeyLink[], from: string): number {
  return links.filter((l) => l.from === from).reduce((sum, l) => sum + l.value, 0);
}

function VisualLabModeBoard({
  mode,
  sankeyLinks,
  sankeyHasData,
  forecast,
  skills,
  overallMastery,
  sourceLabel,
  sparkLabel,
  emptyHint,
  stageLabels,
  masteryLabel,
  examSteps,
  formulaCaption,
}: {
  mode: VisualLabModeId;
  sankeyLinks: SankeyLink[];
  sankeyHasData: boolean;
  forecast: RetentionForecastPoint[];
  skills: SkillNode[];
  overallMastery: number;
  sourceLabel: string;
  sparkLabel: string;
  emptyHint: string;
  stageLabels: [string, string, string, string];
  masteryLabel: string;
  examSteps: Array<{ x: number; label: string }>;
  formulaCaption: string;
}) {
  switch (mode) {
    case 'source':
      return (
        <SourceFlowDiagram
          links={sankeyLinks}
          hasData={sankeyHasData}
          ariaLabel={sourceLabel}
          stageLabels={stageLabels}
        />
      );
    case 'concept':
      return <ConceptGraphDecorativeBoard skills={skills} />;
    case 'mastery':
      return <MasteryRingDecorativeBoard mastery={overallMastery} label={masteryLabel} />;
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
      return <ExamPathDecorativeBoard steps={examSteps} />;
    case 'formula':
      return <FormulaDecorativeBoard caption={formulaCaption} />;
    default:
      return null;
  }
}

function VisualLabLiveSnapshot({
  mode,
  sankeyLinks,
  skills,
  overallMastery,
  courseCount,
}: {
  mode: VisualLabModeId;
  sankeyLinks: SankeyLink[];
  skills: SkillNode[];
  overallMastery: number;
  courseCount: number;
}) {
  const { t } = useI18n();
  const strong = skills.filter((s) => s.mastery >= 75).length;
  const weak = skills.filter((s) => s.mastery < 50).length;
  const rows =
    mode === 'source'
      ? [
          { label: t('visualLabStatSources'), value: String(Math.round(linkSum(sankeyLinks, 'Upload') || courseCount)) },
          { label: t('visualLabStatStudy'), value: String(Math.round(linkSum(sankeyLinks, 'Study'))) },
          { label: t('visualLabStatMastered'), value: String(Math.round(linkSum(sankeyLinks, 'Passed') + linkSum(sankeyLinks, 'Review'))) },
        ]
      : mode === 'concept' || mode === 'mastery'
        ? [
            { label: t('visualLabStatReadiness'), value: `${overallMastery}%` },
            { label: t('visualLabStatStrong'), value: String(strong) },
            { label: t('visualLabStatWeak'), value: String(weak) },
          ]
        : mode === 'retention'
          ? [
              { label: t('visualLabStatStrong'), value: String(strong) },
              { label: t('visualLabStatWeak'), value: String(weak) },
              { label: t('visualLabStatCourses'), value: String(courseCount) },
            ]
          : [
              { label: t('visualLabStatCourses'), value: String(courseCount) },
              { label: t('visualLabStatReadiness'), value: `${overallMastery}%` },
              { label: t('visualLabStatStudy'), value: String(skills.length) },
            ];

  return (
    <div className="visual-lab-side-panel" data-testid="visual-lab-live-snapshot">
      <p className="dashboard-live-preview-eyebrow"><AllCapsLabel>{t('visualLabLiveEyebrow')}</AllCapsLabel></p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-3">
            <span className="type-caption text-text-secondary">{row.label}</span>
            <span className="type-meta font-semibold tabular-nums text-text-primary">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Analytics Visual Lab — 6-mode rail + boards grounded in learner data (Wave E14). */
export function AnalyticsVisualLabPanel({
  sankeyLinks,
  sankeyHasData,
  forecast,
  skills,
  overallMastery = 0,
  courseCount = 0,
}: Props) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<VisualLabModeId>('source');
  const active = VISUAL_LAB_MODES.find((m) => m.id === mode) ?? VISUAL_LAB_MODES[0];
  const live = sankeyHasData || skills.length > 0 || overallMastery > 0;

  const sourceLabel = lang === 'el'
    ? 'Διάγραμμα ροής πηγής προς mastery'
    : 'Source-to-mastery flow diagram';
  const sparkLabel = lang === 'el'
    ? 'Πίνακας sparkline διατήρησης'
    : 'Retention sparkline board';
  const emptyHint = lang === 'el'
    ? 'Οι sparklines εμφανίζονται όταν υπάρχουν δεδομένα FSRS ή εννοιών.'
    : 'Sparklines appear once FSRS or concept retention data is available.';
  const stageLabels: [string, string, string, string] = [
    t('sourceFlowStageSource'),
    t('sourceFlowStageParse'),
    t('sourceFlowStageStudy'),
    t('sourceFlowStageMastery'),
  ];
  const examSteps = [
    { x: 44, label: t('visualLabExamWarmup') },
    { x: 116, label: t('visualLabExamCore') },
    { x: 188, label: t('visualLabExamRepair') },
    { x: 260, label: t('visualLabExamSim') },
  ];

  return (
    <BlueprintSurface className="analytics-visual-lab p-5" data-testid="analytics-visual-lab">
      <SectionHeader
        className="visual-lab-panel-header"
        eyebrow={lang === 'el' ? 'Οπτικό εργαστήριο' : 'Visual lab'}
        title={lang === 'el' ? 'Οπτικό εργαστήριο' : 'Visual lab'}
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
            <span className="type-meta font-semibold text-text-primary">{t(item.titleKey)}</span>
            <span className="mt-1 block type-caption leading-5 text-text-secondary">{t(item.subtitleKey)}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="visual-lab-board-well">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3 visual-lab-board-head">
            <div>
              <p className="dashboard-live-preview-eyebrow"><AllCapsLabel>{t('visualLabCurrentModeEyebrow')}</AllCapsLabel></p>
              <p className="dashboard-preview-title mt-1">{t(active.titleKey)}</p>
            </div>
            <span className="visual-lab-mode-badge">{t(live ? 'visualLabLiveBadge' : 'visualLabDecorativeBadge')}</span>
          </div>
          <p className="type-body leading-6 text-text-secondary">{t(active.hintKey)}</p>
          {/* OPT-K129 — wash board well (no dashed Apple crop-frame) */}
          <div className="visual-lab-board-frame mt-4" data-testid="visual-lab-board-frame">
            <VisualLabModeBoard
              mode={mode}
              sankeyLinks={sankeyLinks}
              sankeyHasData={sankeyHasData}
              forecast={forecast}
              skills={skills}
              overallMastery={overallMastery}
              sourceLabel={sourceLabel}
              sparkLabel={sparkLabel}
              emptyHint={emptyHint}
              stageLabels={stageLabels}
              masteryLabel={t('visualLabMasteryRingLabel')}
              examSteps={examSteps}
              formulaCaption={t('visualLabFormulaCaption')}
            />
          </div>
        </div>

        <div className="space-y-4">
          <VisualLabLiveSnapshot
            mode={mode}
            sankeyLinks={sankeyLinks}
            skills={skills}
            overallMastery={overallMastery}
            courseCount={courseCount}
          />

          <CollapsibleChromeSection
            title={t('visualLabGuidanceEyebrow')}
            alwaysCollapse
            data-testid="visual-lab-guidance"
          >
            <div className="space-y-3 px-1 pb-2 type-caption leading-6 text-text-secondary">
              <p>{t('visualLabGuidance1')}</p>
              <p>{t('visualLabGuidance2')}</p>
              <p>{t('visualLabGuidance3')}</p>
              <p>{t('visualLabGuidance4')}</p>
            </div>
          </CollapsibleChromeSection>

          <CollapsibleChromeSection
            title={t('visualLabMappingEyebrow')}
            alwaysCollapse
            data-testid="visual-lab-mapping"
          >
            <div className="grid gap-3 px-1 pb-2 sm:grid-cols-2">
              {SOURCE_VISUAL_TILES.map((tile) => (
                <div key={tile.id} className="visual-lab-mapping-tile">
                  <div className="flex items-center justify-between gap-3">
                    <span className="type-meta font-semibold text-text-primary">{t(tile.labelKey)}</span>
                    <span className="visual-lab-mapping-symbol">{tile.symbol}</span>
                  </div>
                  <p className="mt-2 type-caption leading-6 text-text-secondary">{t(tile.visualKey)}</p>
                </div>
              ))}
            </div>
          </CollapsibleChromeSection>
        </div>
      </div>
    </BlueprintSurface>
  );
}
