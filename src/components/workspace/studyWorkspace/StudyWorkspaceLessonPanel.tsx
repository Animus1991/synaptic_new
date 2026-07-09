import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../../utils/cn';
import { Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from '@/lib/lucide-shim';
import { LessonContent } from '../LessonContent';
import { recordQuizResponse } from '../../../lib/quizIrt';
import { WorkspaceSourceStatusBar } from '../WorkspaceSourceStatusBar';
import { WorkspaceStepRail } from '../WorkspaceStepRail';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import {
  LESSON_PANEL_COLLAPSED_PX,
  LESSON_PANEL_DEFAULT_SIZE,
  LESSON_PANEL_EXPANDED_MIN,
} from './lessonPanelSizes';

interface StudyWorkspaceLessonPanelProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceLessonPanel({ model }: StudyWorkspaceLessonPanelProps) {
  const {
    quizConcept,
    reprocessingMaterial,
    t,
    lang,
    progressKey,
    activeTool,
    layout,
    currentStep,
    setCurrentStep,
    quizPassed,
    setQuizPassed,
    genStatus,
    lessonCollapsed,
    setLessonCollapsed,
    pedagogyLens,
    chromeHidden,
    setQuizIrtRevision,
    stepMarks,
    noteBundle,
    lessonStepExcerpt,
    sourceIntelligence,
    toolEmptyMessage,
    handleToolUpload,
    handleReuploadMaterial,
    sourceQualityScore,
    showReuploadHint,
    showLowQualityBanner,
    sourceTextHygiene,
    openReprocessWizard,
    conceptMastery,
    openWorkspaceTool,
    STEPS,
    readerHeatSyncReport,
    readerStepHeatLevels,
    selectWorkspaceStep,
    handleOpenAgent,
    handleWorkspaceSelectionAction,
    handleQuizRemediateWrong,
    quizDef,
    quizIrtDisplay,
    quizSession,
    nextActionRecommendation,
    handleLearningAction,
    handleStepNext,
  } = model;

  const lessonPanelRef = usePanelRef();
  const ignorePanelSyncRef = useRef(false);
  const showSourceAlert = (showLowQualityBanner || showReuploadHint) && sourceQualityScore != null;
  const canRailCollapse = layout === 'split';

  useEffect(() => {
    const panel = lessonPanelRef.current;
    if (!panel || !canRailCollapse) return;

    ignorePanelSyncRef.current = true;
    if (lessonCollapsed) {
      panel.collapse();
    } else {
      panel.expand();
      if (panel.isCollapsed()) {
        panel.resize(`${LESSON_PANEL_DEFAULT_SIZE}%`);
      }
    }
    const timer = window.setTimeout(() => {
      ignorePanelSyncRef.current = false;
    }, 200);
    return () => window.clearTimeout(timer);
  }, [lessonCollapsed, canRailCollapse]);

  const syncCollapsedFromPanel = useCallback(() => {
    if (ignorePanelSyncRef.current) return;
    const panel = lessonPanelRef.current;
    if (!panel || !canRailCollapse) return;
    const isCollapsed = panel.isCollapsed();
    if (isCollapsed !== lessonCollapsed) {
      setLessonCollapsed(isCollapsed);
    }
  }, [canRailCollapse, lessonCollapsed, setLessonCollapsed]);

  const toggleLessonCollapsed = () => {
    if (!canRailCollapse) return;
    setLessonCollapsed((collapsed) => !collapsed);
  };

  const expandLabel = t('wsLessonExpandPanel');
  const collapseLabel = t('wsLessonCollapsePanel');
  const showExpandedContent = canRailCollapse ? !lessonCollapsed : true;

  return (
    <>
      {(layout === 'split' || layout === 'focus-lesson' || layout === 'zen') && (
        <>
          <Panel
            id="lesson-panel"
            panelRef={lessonPanelRef}
            defaultSize={
              layout === 'focus-lesson' || layout === 'zen' ? 100 : LESSON_PANEL_DEFAULT_SIZE
            }
            minSize={canRailCollapse ? LESSON_PANEL_EXPANDED_MIN : undefined}
            collapsedSize={LESSON_PANEL_COLLAPSED_PX}
            collapsible={canRailCollapse}
            onResize={syncCollapsedFromPanel}
            className={cn(
              'flex flex-col bg-surface-primary overflow-hidden',
              lessonCollapsed && canRailCollapse && 'ws-lesson-panel--collapsed',
            )}
            data-lesson-panel-state={lessonCollapsed && canRailCollapse ? 'rail' : 'open'}
          >
            {showExpandedContent ? (
              <>
                {!chromeHidden && (
                  <div
                    className="flex items-center gap-1 border-b border-border-subtle shrink-0 bg-surface-card px-3 py-2 overflow-x-auto hide-scrollbar"
                    data-tour="workspace-step-rail"
                  >
                    {canRailCollapse && (
                      <button
                        type="button"
                        onClick={toggleLessonCollapsed}
                        className="ws-lesson-panel-collapse-btn"
                        aria-label={collapseLabel}
                        aria-expanded
                        title={collapseLabel}
                      >
                        <PanelLeftClose className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <WorkspaceStepRail
                      steps={STEPS}
                      currentStep={currentStep}
                      quizConcept={quizConcept}
                      lang={lang}
                      readerStepHeatLevels={readerStepHeatLevels}
                      readerHeatSyncReport={readerHeatSyncReport}
                      onSelectStep={selectWorkspaceStep}
                    />
                  </div>
                )}

                <div
                  className={cn(
                    'flex-1 overflow-y-auto px-4 sm:px-6 py-8 relative min-w-0',
                    layout === 'split' && 'm-3 blueprint-surface-nest',
                  )}
                >
                  {showSourceAlert && (
                    <WorkspaceSourceStatusBar
                      lang={lang}
                      score={sourceQualityScore}
                      sectionCount={sourceIntelligence?.documentStructure?.sectionCount}
                      showMigration={showReuploadHint}
                      showQualityWarning={showLowQualityBanner}
                      reprocessing={reprocessingMaterial}
                      storedPipelineVersion={noteBundle.pipelineVersion}
                      textHygieneScore={sourceTextHygiene?.hygieneScore}
                      textCorruptionScore={sourceTextHygiene?.corruptionScore}
                      textHygieneFlags={sourceTextHygiene?.flags}
                      onInspect={openReprocessWizard}
                      onReprocess={noteBundle.hasSource ? openReprocessWizard : undefined}
                      onReupload={handleReuploadMaterial}
                    />
                  )}
                  <div key={currentStep} className="w-full min-w-0 animate-fade-up max-w-2xl mx-auto">
                    <LessonContent
                      step={currentStep}
                      stepCount={STEPS.length}
                      stepTitle={STEPS[currentStep]?.title}
                      stepType={STEPS[currentStep]?.type}
                      concept={quizConcept}
                      activeTool={activeTool}
                      onOpenTool={openWorkspaceTool}
                      onOpenAgent={handleOpenAgent}
                      quizDef={quizDef}
                      quizPassed={quizPassed}
                      genStatus={genStatus}
                      noteExcerpt={lessonStepExcerpt}
                      hasSource={noteBundle.hasSource}
                      emptyMessage={toolEmptyMessage('lesson')}
                      onUpload={handleToolUpload}
                      onQuizComplete={(correct: boolean) => {
                        setQuizPassed(correct);
                        if (noteBundle.hasSource) {
                          recordQuizResponse(progressKey, quizConcept, quizDef, correct, conceptMastery);
                          setQuizIrtRevision((v) => v + 1);
                        }
                      }}
                      quizIrt={quizIrtDisplay}
                      quizSessionItems={quizSession.items}
                      quizSessionScopeKey={progressKey}
                      t={t as any}
                      lang={lang}
                      onLearningAction={handleLearningAction}
                      nextActionRecommendation={nextActionRecommendation}
                      onReprocess={openReprocessWizard}
                      stepUnderstood={stepMarks[currentStep] === 'understood'}
                      stepConfusing={stepMarks[currentStep] === 'confusing'}
                      onSelectionAction={handleWorkspaceSelectionAction}
                      onRemediateWrong={handleQuizRemediateWrong}
                      sourceBestTool={sourceIntelligence?.bestTool ?? null}
                      pedagogyLens={pedagogyLens}
                    />
                  </div>

                  <div className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                      disabled={currentStep === 0}
                      className={cn(
                        'text-xs',
                        currentStep === 0 ? 'text-text-muted' : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      ← {t('previous')}
                    </button>
                    <span className="text-[10px] text-text-muted">
                      {currentStep + 1}/{STEPS.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleStepNext}
                      className="flex items-center gap-1 text-xs font-medium text-brand-800 hover:text-brand-700"
                    >
                      {currentStep === STEPS.length - 1 ? t('finish') : t('next')}{' '}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <aside
                className="ws-lesson-collapsed-rail flex h-full min-h-0 flex-col items-center justify-start"
                aria-label={expandLabel}
              >
                <button
                  type="button"
                  onClick={toggleLessonCollapsed}
                  className="ws-lesson-rail-expand-btn"
                  aria-label={expandLabel}
                  aria-expanded={false}
                  title={expandLabel}
                  data-testid="lesson-panel-expand"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                <span className="ws-lesson-rail-grip mt-3" aria-hidden />
              </aside>
            )}
          </Panel>

          {layout === 'split' && (
            <Separator className="w-1 bg-border-subtle hover:bg-brand-500/50 active:bg-brand-500 transition-colors cursor-col-resize z-20">
              <div className="h-full w-full flex items-center justify-center">
                <div className="h-8 w-1 bg-border-subtle rounded-full" />
              </div>
            </Separator>
          )}
        </>
      )}
    </>
  );
}
