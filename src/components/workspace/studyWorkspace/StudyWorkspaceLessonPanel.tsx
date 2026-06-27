import { cn } from '../../../utils/cn';
import { Panel, Separator } from 'react-resizable-panels';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from '@/lib/lucide-shim';
import { LessonContent } from '../LessonContent';
import { recordQuizResponse } from '../../../lib/quizIrt';
import { WorkspaceSourceStatusBar } from '../WorkspaceSourceStatusBar';
import { WorkspaceStepRail } from '../WorkspaceStepRail';

import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface StudyWorkspaceLessonPanelProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceLessonPanel({ model }: StudyWorkspaceLessonPanelProps) {
  const {
    quizConcept,
    onReprocessMaterial,
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
    chromeHidden,
    setQuizIrtRevision,
    stepMarks,
    noteBundle,
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

  return (
    <>
                {(layout === 'split' || layout === 'focus-lesson' || layout === 'zen') && (
                  <>
                  <Panel
                    id="lesson-panel"
                    defaultSize={layout === 'focus-lesson' || layout === 'zen' ? 100 : 35}
                    minSize={25}
                    collapsible
                    className="flex flex-col bg-surface-primary"
                  >
                    {!chromeHidden && (
                      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle overflow-x-auto hide-scrollbar shrink-0 bg-surface-card">
                        <button onClick={() => setLessonCollapsed(!lessonCollapsed)} className="p-1 rounded hover:bg-surface-hover text-text-muted shrink-0 mr-2">
                          {lessonCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
                        </button>
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
      
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 relative">
                      {(showLowQualityBanner || showReuploadHint) && sourceQualityScore != null && (
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
                          onReprocess={onReprocessMaterial ? openReprocessWizard : undefined}
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
                          noteExcerpt={noteBundle.readerText}
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
                        />
                      </div>
                      
                      {/* Navigation footer */}
                      <div className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-between">
                        <button onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} disabled={currentStep === 0}
                          className={cn('text-xs', currentStep === 0 ? 'text-text-muted' : 'text-text-secondary hover:text-text-primary')}>← {t('previous')}</button>
                        <span className="text-[10px] text-text-muted">{currentStep + 1}/{STEPS.length}</span>
                        <button onClick={handleStepNext}
                          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium">
                          {currentStep === STEPS.length - 1 ? t('finish') : t('next')} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </Panel>
                  
                  {(layout === 'split') && (
                    <Separator className="w-1 bg-border-subtle hover:bg-brand-500/50 active:bg-brand-500 transition-colors cursor-col-resize z-20">
                       <div className="h-full w-full flex items-center justify-center">
                          <div className="h-8 w-1 bg-white/20 rounded-full" />
                       </div>
                    </Separator>
                  )}
                  </>
                )}
    </>
  );
}
