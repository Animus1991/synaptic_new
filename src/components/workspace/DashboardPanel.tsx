import { useMemo, useState, useCallback } from 'react';
import { AlertTriangle, BookOpen, Download, Printer, Search, Target } from 'lucide-react';
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
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { MiniDashboard } from './MiniDashboard';
import type { ToolActivityCount } from '../../lib/conceptBusPanelModel';

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
  conceptBusRows?: ConceptBusRow[];
};

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
  conceptBusRows = [],
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const isEl = lang === 'el';

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
      <WorkspaceEmptyState
        message={emptyMessage ?? (isEl ? '╬Σ╬╜╬φ╬▓╬▒╧Δ╬╡ ╧Δ╬╖╬╝╬╡╬╣╧Ο╧Δ╬╡╬╣╧Γ ╬│╬╣╬▒ ╬╡╬╛╬▒╧Ε╬┐╬╝╬╣╬║╬╡╧Ζ╬╝╬φ╬╜╬╖ ╧Α╧Β╧Ν╬┐╬┤╬┐.' : 'Upload notes for personalized progress.')}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  const suggestLabel = session.suggestFocusTool
    ? workspaceToolLabel(session.suggestFocusTool as WorkspaceToolId, lang)
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="dashboard-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 text-[10px] text-text-muted" data-testid="dashboard-section-label">
            {isEl ? '╬Χ╬╜╧Ν╧Ε╬╖╧Ε╬▒:' : 'Section:'}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <div
            className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
            data-testid="dashboard-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              {session.passageGrounded
                ? (isEl
                  ? '╬ν╬▒ weak spots ╬┤╬φ╬╜╬┐╬╜╧Ε╬▒╬╣ ╧Δ╬╡ generic concept έΑΦ ╬╡╧Α╬ψ╬╗╬╡╬╛╬╡ ╧Α╬╣╬┐ ╧Δ╧Ζ╬│╬║╬╡╬║╧Β╬╣╬╝╬φ╬╜╬┐ ╬▓╬χ╬╝╬▒.'
                  : 'Weak spots are tied to a generic concept έΑΦ pick a more specific step.')
                : (isEl
                  ? '╬Υ╬╡╬╜╬╣╬║╬χ ╬φ╬╜╬╜╬┐╬╣╬▒ έΑΦ ╬╖ ╧Α╧Β╧Ν╬┐╬┤╬┐╧Γ ╬╡╬ψ╬╜╬▒╬╣ ╬╗╬╣╬│╧Ν╧Ε╬╡╧Β╬┐ ╬▒╬║╧Β╬╣╬▓╬χ╧Γ ╬╝╬φ╧Θ╧Β╬╣ Reprocess.'
                  : 'Generic concept έΑΦ progress tracking is less precise until Reprocess.')}
            </p>
          </div>
        )}

        <ProgressConceptBusMirrorStrip
          report={mirrorReport}
          lang={lang}
          onExportHtml={handleExportHtml}
        />

        <div className="mb-2 flex flex-wrap items-center gap-2">
          {session.weakSpotCount > 0 && (
            <span className="rounded-full border border-accent-rose/30 bg-accent-rose/10 px-2 py-0.5 text-[9px] font-medium text-accent-rose">
              {session.weakSpotCount} {isEl ? '╬▒╬┤╧Ξ╬╜╬▒╬╝╬▒' : 'weak'}
            </span>
          )}
          {session.toolActivityCount > 0 && (
            <span className="text-[10px] text-text-muted">
              {session.engagedToolCount} {isEl ? '╬╡╧Β╬│╬▒╬╗╬╡╬ψ╬▒' : 'tools'} ┬╖ {session.toolActivityCount} {isEl ? '╬╡╬╜╬φ╧Β╬│╬╡╬╣╬╡╧Γ' : 'actions'}
            </span>
          )}
          {session.suggestFocusTool && suggestLabel && onOpenSuggestedTool && (
            <button
              type="button"
              onClick={onOpenSuggestedTool}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-300 hover:bg-brand-600/15"
              data-testid="dashboard-suggest-tool"
            >
              <Target className="w-3 h-3" />
              {isEl ? '╬Χ╧Α╧Ν╬╝╬╡╬╜╬┐:' : 'Next:'} {suggestLabel}
            </button>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
              data-testid="dashboard-open-reader"
            >
              <BookOpen className="w-3 h-3" />
              Reader
            </button>
          )}
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 p-0.5" data-testid="dashboard-export-actions">
            <button
              type="button"
              onClick={handleExportHtml}
              title={isEl ? '╬δ╬χ╧Ι╬╖ HTML ╬▒╬╜╬▒╧Η╬┐╧Β╬υ╧Γ' : 'Download HTML report'}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] text-text-secondary hover:bg-white/[0.06] hover:text-brand-200"
              data-testid="dashboard-export-html"
            >
              <Download className="w-3 h-3" />
              HTML
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              title={isEl ? '╬Χ╬║╧Ε╧Ξ╧Α╧Κ╧Δ╬╖ / PDF' : 'Print / Save as PDF'}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] text-text-secondary hover:bg-white/[0.06] hover:text-brand-200"
              data-testid="dashboard-export-pdf"
            >
              <Printer className="w-3 h-3" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              title={isEl ? '╬Χ╬╛╬▒╬│╧Κ╬│╬χ JSON ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒╧Γ' : 'Session JSON export'}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] text-text-secondary hover:bg-white/[0.06] hover:text-brand-200"
              data-testid="dashboard-export-json"
            >
              JSON
            </button>
          </div>
        </div>

        {(session.weakSpotCount > 0 || (miniProps.toolActivity?.length ?? 0) > 0) && (
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={isEl ? '╬ο╬ψ╬╗╧Ε╧Β╬┐ weak spots / ╬╡╧Β╬│╬▒╬╗╬╡╬ψ╧Κ╬╜έΑο' : 'Filter weak spots / toolsέΑο'}
              className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
              data-testid="dashboard-filter"
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex justify-center">
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
