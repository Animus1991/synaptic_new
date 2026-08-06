import { useMemo, useState, useCallback } from 'react';
import { ArrowRight, BookOpen, Download, Lightbulb, Printer, Search, Target } from '@/lib/lucide-shim';
import { PanelOverflowMenu } from './PanelOverflowMenu';
import type { DashboardSessionContent } from '../../lib/dashboardSessionModel';
import {
  filterDashboardToolActivity,
  filterDashboardWeakSpots,
} from '../../lib/dashboardSessionModel';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import type { ConceptRemediationId } from '../../lib/conceptBusRemediation';
import type { DashboardWeakSpot } from '../../lib/dashboardWeakSpotsModel';
import type { NextActionRecommendation } from '../../lib/nextActionEngine';
import { nextActionLabel } from '../../lib/nextActionEngine';
import {
  buildProgressSessionExportPayload,
  buildProgressSessionHtml,
  buildProgressSessionJson,
  buildConceptBusExportSnapshot,
  downloadProgressSessionJson,
  downloadProgressSessionReport,
  printProgressSessionReport,
  progressSessionFilename,
} from '../../lib/progressSessionExport';
import { auditProgressConceptBusMirror } from '../../lib/progressConceptBusMirrorQA';
import type { ConceptBusRow } from '../../lib/conceptBusPanelModel';
import { ProgressConceptBusMirrorStrip } from './ProgressConceptBusMirrorStrip';
import { UxCallout } from '../ui/platformChrome';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { MiniDashboard } from './MiniDashboard';
import type { ToolActivityCount } from '../../lib/conceptBusPanelModel';
import { useI18n } from '../../lib/i18n';
import { PrimaryCTA } from '../ui/primitives';

type MiniDashboardProps = {
  readiness: number;
  streak: number;
  reviewsDue: number;
  studyTimeToday?: number;
  studyTimeWeek?: number;
  recentStudyDays?: number[];
  weakSpots: { concept: string; mastery: number; course: string }[];
  nextActions: { label: string; type: string; minutes: number; xp?: number; taskId?: string }[];
  conceptsMastered: number;
  totalConcepts: number;
  toolActivity?: ToolActivityCount[];
  weakSpotsDetail?: DashboardWeakSpot[];
};

type Props = {
  session: DashboardSessionContent;
  concept: string;
  lang: 'en' | 'el';
  miniProps: MiniDashboardProps;
  emptyMessage?: string;
  onUpload?: () => void;
  onFocusWeakSpot?: (concept: string) => void;
  onStartTask?: (taskId: string) => void;
  onOpenSuggestedTool?: () => void;
  onOpenToolActivity?: (tool: WorkspaceToolId) => void;
  onOpenInReader?: (query: string) => void;
  onRemediateWeakSpot?: (concept: string, action: ConceptRemediationId) => void;
  courseName?: string;
  nextAction?: NextActionRecommendation | null;
  onRunNextAction?: () => void;
  conceptBusRows?: ConceptBusRow[];
};

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function DashboardPanel({
  session,
  concept,
  lang,
  miniProps,
  emptyMessage,
  onUpload,
  onFocusWeakSpot,
  onStartTask,
  onOpenSuggestedTool,
  onOpenToolActivity,
  onOpenInReader,
  onRemediateWeakSpot,
  courseName,
  nextAction,
  onRunNextAction,
  conceptBusRows = [],
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const { t } = useI18n();

  const exportPayload = useMemo(
    () => buildProgressSessionExportPayload({
      lang,
      concept,
      courseName,
      sectionLabel: session.sectionLabel,
      readiness: miniProps.readiness,
      streak: miniProps.streak,
      reviewsDue: miniProps.reviewsDue,
      studyTimeToday: miniProps.studyTimeToday,
      studyTimeWeek: miniProps.studyTimeWeek,
      conceptsMastered: miniProps.conceptsMastered,
      totalConcepts: miniProps.totalConcepts,
      weakSpots: miniProps.weakSpots,
      weakSpotsDetail: miniProps.weakSpotsDetail,
      toolActivity: miniProps.toolActivity ?? [],
      nextActions: miniProps.nextActions,
      session,
      nextAction,
      conceptBusSnapshot: buildConceptBusExportSnapshot(conceptBusRows),
    }),
    [lang, concept, courseName, session, miniProps, nextAction, conceptBusRows],
  );

  const mirrorReport = useMemo(
    () => auditProgressConceptBusMirror({
      lang,
      concept,
      conceptBusRows,
      toolActivity: miniProps.toolActivity ?? [],
      weakSpotsDetail: miniProps.weakSpotsDetail ?? [],
      session,
      nextAction,
      readiness: miniProps.readiness,
      streak: miniProps.streak,
      reviewsDue: miniProps.reviewsDue,
      conceptsMastered: miniProps.conceptsMastered,
      totalConcepts: miniProps.totalConcepts,
      nextActions: miniProps.nextActions,
    }),
    [lang, concept, conceptBusRows, miniProps, session, nextAction],
  );

  const exportHtml = useCallback(
    () => buildProgressSessionHtml(exportPayload),
    [exportPayload],
  );

  const handleExportHtml = useCallback(() => {
    downloadProgressSessionReport(progressSessionFilename(concept, 'html'), exportHtml());
  }, [concept, exportHtml]);

  const handleExportJson = useCallback(() => {
    downloadProgressSessionJson(
      progressSessionFilename(concept, 'json'),
      buildProgressSessionJson(exportPayload),
    );
  }, [concept, exportPayload]);

  const handlePrintPdf = useCallback(() => {
    printProgressSessionReport(exportHtml());
  }, [exportHtml]);

  const filteredProps = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filterDetail = (miniProps.weakSpotsDetail ?? []).filter(
      (s) => !q || s.concept.toLowerCase().includes(q) || s.course.toLowerCase().includes(q),
    );
    return {
      ...miniProps,
      weakSpots: filterDashboardWeakSpots(miniProps.weakSpots, filterQuery),
      weakSpotsDetail: q ? filterDetail : miniProps.weakSpotsDetail,
      toolActivity: filterDashboardToolActivity(miniProps.toolActivity ?? [], filterQuery),
    };
  }, [miniProps, filterQuery]);

  if (!session.hasSource) {
    return (
      <div className="p-3" data-testid="dashboard-panel-empty" data-bleed="full">
        <WorkspaceToolEmptyState
          tool="dashboard"
          concept={concept}
          message={emptyMessage}
          hasSource={false}
          onUpload={onUpload}
        />
      </div>
    );
  }

  const suggestLabel = session.suggestFocusTool
    ? workspaceToolLabel(session.suggestFocusTool as WorkspaceToolId, lang)
    : null;

  const showFilter = session.weakSpotCount > 0 || (miniProps.toolActivity?.length ?? 0) > 0;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card"
      data-testid="dashboard-panel"
      data-bleed="full"
    >
      <div className="shrink-0 space-y-1.5 border-b border-border-subtle px-3 py-2">
        {session.sectionLabel && (
          <p className="type-caption text-text-muted" data-testid="dashboard-section-label">
            {t('wsSectionColon')}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="dashboard-weak-extraction">
            {session.passageGrounded
              ? t('panelPassageGroundedDashboard')
              : t('panelWeakExtractionDashboard')}
          </WorkspacePanelWarnStrip>
        )}

        {/* Wave PR — mirror strip warn-only */}
        {!mirrorReport.ok && (
          <ProgressConceptBusMirrorStrip
            report={mirrorReport}
            lang={lang}
            onExportHtml={handleExportHtml}
          />
        )}

        {nextAction && onRunNextAction && (
          <UxCallout
            variant="next-action"
            title={t('dashboardSuggestedNext')}
            icon={<Lightbulb />}
            testId="workspace-dashboard-next-action"
            className="mb-1"
            action={
              <PrimaryCTA
                type="button"
                size="sm"
                onClick={onRunNextAction}
                data-testid="workspace-dashboard-next-action-btn"
                className="ws-touch-floor min-h-9 shrink-0 rounded-lg px-3"
              >
                {nextActionLabel(nextAction.primary, lang)}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </PrimaryCTA>
            }
          >
            <p className="type-caption text-text-tertiary">{t('dashboardSuggestedNextSubtitle')}</p>
            <p className="mt-1 type-caption text-text-secondary">{nextAction.reason}</p>
          </UxCallout>
        )}

        {/* Wave PR — primary strip: focus action + Reader; exports in ⋯ */}
        <div className="flex flex-wrap items-center gap-1.5" data-testid="dashboard-kpi-row">
          {session.weakSpotCount > 0 && (
            <span className="rounded-lg border border-accent-rose/40 bg-accent-rose/12 px-2 py-1 type-caption font-semibold text-text-secondary">
              {session.weakSpotCount} {t('panelWeakCount')}
            </span>
          )}
          {session.toolActivityCount > 0 && (
            <span className="type-caption tabular-nums text-text-muted">
              {session.engagedToolCount} {t('panelTools')} · {session.toolActivityCount} {t('panelActions')}
            </span>
          )}
          {!nextAction && session.suggestFocusTool && suggestLabel && onOpenSuggestedTool && (
            <PrimaryCTA
              type="button"
              size="sm"
              onClick={onOpenSuggestedTool}
              className="ws-touch-floor min-h-9 rounded-lg px-3"
              data-testid="dashboard-suggest-tool"
            >
              <Target className="h-3.5 w-3.5" aria-hidden />
              {t('dashboardNextColon')} {suggestLabel}
            </PrimaryCTA>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle px-2.5 type-caption text-text-secondary hover:border-border-default hover:text-text-primary"
              data-testid="dashboard-open-reader"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {t('cognitiveReader')}
            </button>
          )}
          <PanelOverflowMenu
            className="ml-auto"
            data-testid="dashboard-export-actions"
            ariaLabel={t('dashExportMenu')}
            summaryLabel={<span className="type-caption font-medium">{t('dashExportMenu')}</span>}
            summaryClassName="min-h-9 px-2.5 py-1 type-caption font-medium"
          >
            <button
              type="button"
              onClick={handleExportHtml}
              className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
              data-testid="dashboard-export-html"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              HTML
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
              data-testid="dashboard-export-pdf"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              PDF
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
              data-testid="dashboard-export-json"
            >
              JSON
            </button>
          </PanelOverflowMenu>
        </div>

        {showFilter && (
          <CollapsibleChromeSection
            title={t('dashFilterChrome')}
            alwaysCollapse
            data-testid="dashboard-filter-chrome"
          >
            <div className="relative px-3 pb-2">
              <label className="sr-only" htmlFor="dashboard-filter-input">
                {t('dashFilterPlaceholder')}
              </label>
              <Search
                className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <input
                id="dashboard-filter-input"
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('dashFilterPlaceholder')}
                className="w-full min-h-9 rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-8 pr-2 type-caption text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
                data-testid="dashboard-filter"
              />
            </div>
          </CollapsibleChromeSection>
        )}
      </div>

      {/* Wave PR — Status surface uses full panel width (no centered max-w-lg column) */}
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-testid="dashboard-work-surface"
        data-bleed="full"
      >
        <MiniDashboard
          {...filteredProps}
          weakSpotsDetail={miniProps.weakSpotsDetail}
          embedded
          onStartTask={onStartTask}
          onFocusWeakSpot={onFocusWeakSpot}
          onRemediateWeakSpot={onRemediateWeakSpot}
          onOpenToolActivity={onOpenToolActivity}
        />
      </div>
    </div>
  );
}
