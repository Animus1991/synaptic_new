import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@/lib/lucide-shim';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import type { WorkspaceSourceIntelligence } from '../../lib/workspaceNoteContent';
import { SourceIntelligenceCard } from './SourceIntelligenceCard';
import {
  LazyConceptBusPanel,
  LazyWeakAreasFocusRail,
  LazyWorkspaceDiscoverabilityPanel,
} from '../../lib/workspaceToolLazyRegistry';
import { WorkspaceIdleMount } from './WorkspaceIdleMount';
import { WorkspaceToolSuspense } from './WorkspaceToolSuspense';
import type { ConceptBusRow } from '../../lib/conceptBusPanelModel';
import type { WeakSpotWithReasons } from '../../lib/weakAreaReasons';
import type { DiscoverabilitySummary, DiscoverabilityActionId } from '../../lib/workspaceDiscoverability';
import type { LearningActionId } from '../../lib/workspaceLearningActions';
import type { ConceptRemediationId } from '../../lib/conceptBusRemediation';
import type { ConceptLensView } from '../../lib/conceptGraphModel';
import type { WorkspaceEmptyAction } from '../../lib/workspaceEmptyState';
import { useI18n } from '../../lib/i18n';

type Props = {
  open: boolean;
  onClose: () => void;
  lang: 'en' | 'el';
  isMobile: boolean;
  sourceIntelligence?: WorkspaceSourceIntelligence | null;
  activeTool: WorkspaceToolId;
  onOpenRecommendedTool?: () => void;
  discoverabilitySummary: DiscoverabilitySummary;
  discoverabilityActions: Partial<Record<DiscoverabilityActionId, () => void>>;
  onRunNextAction: () => void;
  onLearningAction: (id: LearningActionId) => void;
  stepUnderstood: boolean;
  stepConfusing: boolean;
  onOpenRecommendedToolFromDiscover?: () => void;
  conceptBusRows: ConceptBusRow[];
  onFocusTerm: (term: string) => void;
  onJumpTool: (tool: WorkspaceToolId) => void;
  onRemediate: (concept: string, action: ConceptRemediationId) => void;
  conceptLensView: ConceptLensView;
  onOpenReaderSection?: () => void;
  weakAreaSpots: WeakSpotWithReasons[];
  focusTerm?: string;
  onFocusWeakSpot: (concept: string) => void;
  hasSource?: boolean;
  discoverEmptyActions?: WorkspaceEmptyAction[];
  weakAreasEmptyActions?: WorkspaceEmptyAction[];
};

export function WorkspaceIntelSideSheet({
  open,
  onClose,
  lang,
  isMobile,
  sourceIntelligence,
  activeTool,
  onOpenRecommendedTool,
  discoverabilitySummary,
  discoverabilityActions,
  onRunNextAction,
  onLearningAction,
  stepUnderstood,
  stepConfusing,
  onOpenRecommendedToolFromDiscover,
  conceptBusRows,
  onFocusTerm,
  onJumpTool,
  onRemediate,
  conceptLensView,
  onOpenReaderSection,
  weakAreaSpots,
  focusTerm,
  onFocusWeakSpot,
  hasSource = true,
  discoverEmptyActions = [],
  weakAreasEmptyActions = [],
}: Props) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-slate-950/40"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-[150] max-h-[min(85vh,32rem)] overflow-hidden rounded-t-2xl border border-border-subtle bg-surface-secondary shadow-2xl flex flex-col'
                : 'fixed top-0 right-0 bottom-0 z-[150] w-full max-w-md border-l border-border-subtle bg-surface-secondary/98 backdrop-blur-xl shadow-2xl flex flex-col'
            }
            role="dialog"
            aria-modal
            aria-label={t('sourceIntelAria')}
            data-testid="workspace-intel-side-sheet"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 shrink-0">
              <span className="text-sm font-semibold">
                {t('sourceIntelTitle')}
              </span>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface-hover text-text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {sourceIntelligence && onOpenRecommendedTool && (
                <SourceIntelligenceCard
                  report={sourceIntelligence}
                  toolLabel={activeTool}
                  onOpenRecommendedTool={onOpenRecommendedTool}
                />
              )}
              <WorkspaceIdleMount enabled>
                <WorkspaceToolSuspense tool="discover" lang={lang}>
                  <LazyWorkspaceDiscoverabilityPanel
                    summary={discoverabilitySummary}
                    lang={lang}
                    expanded
                    onToggle={onClose}
                    actions={discoverabilityActions}
                    onRunNextAction={onRunNextAction}
                    onLearningAction={onLearningAction}
                    stepUnderstood={stepUnderstood}
                    stepConfusing={stepConfusing}
                    onOpenRecommendedTool={onOpenRecommendedToolFromDiscover}
                    hasSource={hasSource}
                    emptyActions={discoverEmptyActions}
                  />
                </WorkspaceToolSuspense>
              </WorkspaceIdleMount>
              {conceptBusRows.length > 0 && (
                <WorkspaceIdleMount enabled>
                  <WorkspaceToolSuspense tool="concept-bus" lang={lang}>
                    <LazyConceptBusPanel
                      rows={conceptBusRows}
                      activeTool={activeTool}
                      lang={lang}
                      expanded
                      onToggle={onClose}
                      onFocusTerm={onFocusTerm}
                      onJumpTool={onJumpTool}
                      onRemediate={onRemediate}
                      activeLens={conceptLensView}
                      onOpenReaderSection={onOpenReaderSection}
                    />
                  </WorkspaceToolSuspense>
                </WorkspaceIdleMount>
              )}
              <WorkspaceIdleMount enabled>
                <WorkspaceToolSuspense tool="weak-areas" lang={lang}>
                  <LazyWeakAreasFocusRail
                    spots={weakAreaSpots}
                    focusTerm={focusTerm}
                    lang={lang}
                    expanded
                    onToggle={onClose}
                    onFocusWeakSpot={onFocusWeakSpot}
                    emptyActions={weakAreasEmptyActions}
                  />
                </WorkspaceToolSuspense>
              </WorkspaceIdleMount>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
