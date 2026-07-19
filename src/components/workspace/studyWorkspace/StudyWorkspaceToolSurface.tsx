import { useMemo } from 'react';
import { cn } from '../../../utils/cn';
import { useConceptMapCollab } from '../../../hooks/useConceptMapCollab';
import { Panel } from 'react-resizable-panels';
import { WorkspaceToolStrip } from '../WorkspaceToolStrip';
import { ToolFrame } from '../ToolFrame';
import { WorkspaceToolAgentChipBar } from '../WorkspaceToolAgentChipBar';
import {
  LazyAnnotationOverlay, LazyComparePanel, LazyConceptBusPanel, LazyCognitiveReader,
  LazyDashboardPanel, LazyDebatePanel, LazyDraggableConceptMap, LazyFeynmanCheck, LazyFormulaScratchpad,
  LazyLeitnerPanel, LazyQuizPanel, LazySimulatorPanel, LazyTimerPanel, LazyWeakAreasFocusRail, LazyWhiteboardPanel,
  LazyWorkspaceDiscoverabilityPanel,
} from '../../../lib/workspaceToolLazyRegistry';
import { WorkspaceIdleMount } from '../WorkspaceIdleMount';
import { WorkspaceToolSuspense } from '../WorkspaceToolSuspense';
import { mergeReaderHighlight } from '../../../lib/workspaceFocus';
import { saveConceptMapPositions, saveConceptMapGraph } from '../../../lib/workspacePersistence';
import { recordQuizResponse } from '../../../lib/quizIrt';
import { conceptSignalForAnnotationCategory } from '../../../lib/annotationAnchor';
import { appendScratchpadAnnotation } from '../../../lib/scratchpadEntryStore';
import { appendCustomLeitnerCard } from '../../../lib/leitnerCustomCards';
import {
  buildAnnotationAgentPrompt, buildCompareToolAgentPrompt, buildDebateClaimAgentPrompt,
  buildFeynmanToolAgentPrompt, buildFormulaAgentPrompt, buildScratchpadNoteAgentPrompt,
  type ToolAgentIntent,
} from '../../../lib/workspaceToolAgentPrompts';
import { buildCompareDifferencePrompt } from '../../../lib/compareExplainDifference';
import { hasDedicatedToolAgentChips } from '../../../lib/workspaceToolAgentChips';
import { saveLastSimulatorScenario, saveExamPracticePreset } from '../../../lib/workspacePersistence';
import { examPracticePresetForScenario, type SimulatorScenarioId } from '../../../lib/examPracticePresets';
import { loadFeynmanDraft } from '../../../lib/feynmanDraftStore';
import { AnnotationConflictPanel } from '../AnnotationConflictPanel';
import { WorkspaceMobileIntelligenceBottomSheet } from '../WorkspaceMobileIntelligenceBottomSheet';
import { AVAILABLE_TOOLS, type WorkspaceTool } from './types';

import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface StudyWorkspaceToolSurfaceProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceToolSurface({ model }: StudyWorkspaceToolSurfaceProps) {
  const {
    courseName,
    quizConcept,
    onQuizAttempt,
    onLeitnerRate,
    onLogStudyMinutes,
    onStartTask,
    onSessionDirty,
    userSettings,
    lang,
    progressKey,
    activeTool,
    intelReady,
    isMobile,
    layout,
    currentStep,
    setQuizPassed,
    chromeHidden,
    notes,
    setNotes,
    scratchpadImport,
    setScratchpadImport,
    setCustomLeitnerCards,
    sharedAnnotations,
    annotationConflicts,
    handleResolveAnnotationConflict,
    handleDismissAnnotationConflicts,
    annotationSyncLive,
    annotationSyncMode,
    setQuizIrtRevision,
    pendingExamPractice,
    setPendingExamPractice,
    intelTab,
    setIntelTab,
    stepMarks,
    setStepMarks,
    conceptBus,
    effectiveFocus,
    deferredFocusTerm,
    noteBundle,
    annotationStableSource,
    toolEmptyMessage,
    handleToolUpload,
    linkedCourse,
    effectiveCourseId,
    noteConceptActivity,
    scopedGlossary,
    conceptMastery,
    conceptBusRows,
    weakAreaSpots,
    quizIrtState,
    readerText,
    readerOcrRegions,
    readerHandwritingRecognized,
    courseSourceFiles,
    focusOnTerm,
    openReaderForTerm,
    sendScratchpadToWhiteboard,
    openWorkspaceTool,
    openReaderAtSearch,
    syncQuizGroundedFocus,
    handlePublishAnnotation,
    STEPS,
    leitnerSession,
    readerStepToSegmentIndex,
    readerStepSegmentIndex,
    readerActiveStepSync,
    handleReaderSectionNavSelect,
    openAgentForTool,
    handleSectionStudy,
    handleSectionAskAgent,
    handleWorkspaceSelectionAction,
    handleQuizRemediateWrong,
    handleQuizRemediateWrongCluster,
    handleQuizSessionComplete,
    quizAttemptHistory,
    handleCrossLinkAgent,
    handleCrossLinkReader,
    focusWeakArea,
    workspaceCorrelation,
    quizDef,
    quizSession,
    quizSessionIrt,
    discoverabilityActions,
    conceptMapCursorSync,
    conceptMapCollabConfig,
    conceptNodes,
    conceptEdges,
    nextActionRecommendation,
    discoverabilitySummary,
    handleLearningAction,
    runNextAction,
    feynmanSession,
    resolveEmptyActions,
    compareSession,
    debateSession,
    simulatorSession,
    whiteboardSession,
    timerSession,
    dashboardSession,
    dashboardMiniProps,
    activeConceptLabel,
    conceptLensView,
    openReaderAtConceptSection,
    handleConceptBusRemediation,
    openReprocessWizard,
    quizArtifactStale,
    leitnerArtifactStale,
    simulatorArtifactStale,
    acknowledgePracticeStale,
    sourceHighlight,
    learnerModel,
    setSandboxTopSensitivityCue,
    annotationSyncVersion,
  } = model;

  const conceptMapSeedGraph = useMemo(
    () => ({ nodes: conceptNodes, edges: conceptEdges }),
    [conceptNodes, conceptEdges],
  );

  const conceptMapCrdt = useConceptMapCollab({
    enabled: activeTool === 'concept-map' && layout === 'split',
    config: conceptMapCollabConfig,
    seedGraph: conceptMapSeedGraph,
  });

  const toolAgentChipBar = useMemo(() => {
    if (!hasDedicatedToolAgentChips(activeTool)) return undefined;
    return (
      <WorkspaceToolAgentChipBar
        tool={activeTool}
        lang={lang}
        concept={quizConcept}
        onChip={(prompt, intent) => openAgentForTool(activeTool, prompt, intent)}
      />
    );
  }, [activeTool, lang, quizConcept, openAgentForTool]);

  return (
    <>
                {(layout === 'split' || layout === 'focus-tool') && (
                  <Panel
                    id="tool-panel"
                    defaultSize={layout === 'focus-tool' ? 100 : 65}
                    minSize={25}
                    className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-primary"
                  >
                    {!chromeHidden && (
                      <WorkspaceToolStrip
                        activeTool={activeTool}
                        availableTools={AVAILABLE_TOOLS}
                        onSelectTool={openWorkspaceTool}
                        lang={lang}
                        className="md:hidden"
                      />
                    )}
                    <ToolFrame
                      activeTool={activeTool}
                      lang={lang}
                      concept={effectiveFocus?.term ?? quizConcept}
                      hasSource={noteBundle.hasSource}
                      sourceName={noteBundle.sourceName}
                      onJumpTool={(tool) => {
                        openWorkspaceTool(tool);
                        noteConceptActivity(quizConcept, tool, 'focus');
                      }}
                      onOpenReader={handleCrossLinkReader}
                      onAskAgent={handleCrossLinkAgent}
                      crossLinkBar={toolAgentChipBar}
                    >
                      <div
                        className={cn(
                          'relative flex h-full min-h-0 flex-col overflow-hidden',
                          layout === 'split' && 'm-3 blueprint-surface-nest',
                        )}
                      >
                      {activeTool === 'concept-map' && (
                        <WorkspaceToolSuspense tool="concept-map" lang={lang}>
                        <LazyDraggableConceptMap
                          initialNodes={conceptNodes}
                          initialEdges={conceptEdges}
                          onGraphUpdate={(graph) => saveConceptMapGraph(progressKey, graph)}
                          onNodeUpdate={(nodes) => saveConceptMapPositions(nodes, progressKey)}
                          emptyMessage={toolEmptyMessage('concept-map')}
                          onUpload={handleToolUpload}
                          hasSource={noteBundle.hasSource}
                          focusConcept={effectiveFocus?.term}
                          lensConcept={activeConceptLabel}
                          conceptLens={conceptLensView}
                          onConceptSelect={(term) => focusOnTerm(term, 'concept-map')}
                          onFocusTerm={(term) => {
                            noteConceptActivity(term, 'concept-map', 'mapped');
                            openReaderForTerm(term, 'concept-map');
                          }}
                          onSelectionAction={handleWorkspaceSelectionAction}
                          cursorSync={layout === 'split' ? conceptMapCursorSync : undefined}
                          crdt={conceptMapCrdt.active ? conceptMapCrdt : undefined}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'reader' && (
                        <WorkspaceToolSuspense tool="reader" lang={lang}>
                        <LazyCognitiveReader
                          text={readerText}
                          highlight={mergeReaderHighlight(sourceHighlight, effectiveFocus ?? {})}
                          focusTerm={effectiveFocus?.term}
                          onTermFocus={(term) => {
                            noteConceptActivity(term, 'reader', 'read');
                            focusOnTerm(term, 'reader');
                          }}
                          annotationScopeKey={progressKey}
                          sourceName={noteBundle.sourceName}
                          lang={lang}
                          glossary={scopedGlossary}
                          concept={quizConcept}
                          userSettings={userSettings}
                          emptyMessage={toolEmptyMessage('reader')}
                          onUpload={handleToolUpload}
                          hasSource={noteBundle.hasSource}
                          sourceFullText={noteBundle.sourceFullText}
                          scrollToSegmentIndex={readerStepSegmentIndex}
                          scrollToSegmentStepIndex={currentStep}
                          onSectionNavSelect={handleReaderSectionNavSelect}
                          onSectionStudy={handleSectionStudy}
                          onSectionAskAgent={handleSectionAskAgent}
                          onSelectionAction={handleWorkspaceSelectionAction}
                          ocrRegions={readerOcrRegions}
                          ocrSourceFiles={courseSourceFiles}
                          handwritingRecognized={readerHandwritingRecognized}
                          conceptBus={conceptBus}
                          stepMarks={stepMarks}
                          stepTitles={STEPS.map((s) => s.title)}
                          stepToSegmentIndex={readerStepToSegmentIndex}
                          stepHeatSync={readerActiveStepSync}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'scratchpad' && (
                        <WorkspaceToolSuspense tool="scratchpad" lang={lang}>
                        <LazyFormulaScratchpad
                          noteFormulas={noteBundle.formulas}
                          emptyMessage={toolEmptyMessage('scratchpad')}
                          onUpload={handleToolUpload}
                          hasSource={noteBundle.hasSource}
                          scopeKey={progressKey}
                          concept={quizConcept}
                          sectionLabel={STEPS[currentStep]?.title}
                          sectionIndex={currentStep}
                          notesDraft={notes}
                          onNotesDraftChange={setNotes}
                          onEntrySaved={(entry) => {
                            noteConceptActivity(entry.concept ?? quizConcept, 'scratchpad', 'noted');
                            if (entry.mode === 'confusion-log') {
                              noteConceptActivity(entry.concept ?? quizConcept, 'scratchpad', conceptSignalForAnnotationCategory('confusing'));
                            }
                          }}
                          onConvertToFlashcard={(card, entry) => {
                            setCustomLeitnerCards(appendCustomLeitnerCard(progressKey, { ...card, source: 'scratchpad' }));
                            noteConceptActivity(entry.concept ?? quizConcept, 'scratchpad', 'noted');
                            noteConceptActivity(entry.concept ?? quizConcept, 'leitner', 'focus');
                            openWorkspaceTool('leitner');
                          }}
                          onConvertToAnnotation={(entry) => {
                            if (!noteBundle.hasSource || noteBundle.fileKey === 'no-source') return;
                            appendScratchpadAnnotation(
                              noteBundle.fileKey,
                              entry,
                              noteBundle.annotationText,
                              { courseId: effectiveCourseId, pipelineVersion: noteBundle.pipelineVersion },
                            );
                            const signal = entry.mode === 'confusion-log'
                              ? conceptSignalForAnnotationCategory('confusing')
                              : entry.mode === 'exam-draft'
                                ? conceptSignalForAnnotationCategory('exam-relevant')
                                : 'annotated';
                            noteConceptActivity(entry.concept ?? quizConcept, 'annotations', signal);
                            openWorkspaceTool('annotations');
                          }}
                          onAskAgentAboutNote={(text, mode) => {
                            const section = STEPS[currentStep]?.title ?? quizConcept;
                            const noteMode = mode === 'self-explanation' || mode === 'exam-draft' ? mode : 'notes';
                            const prompt = buildScratchpadNoteAgentPrompt(text, section, noteMode, lang);
                            openAgentForTool(
                              'scratchpad',
                              prompt,
                              noteMode === 'notes' ? 'scratchpad-note' : 'feynman-critique',
                            );
                          }}
                          onSendToWhiteboard={sendScratchpadToWhiteboard}
                          onAskAgent={(formulaText) => {
                            openAgentForTool(
                              'scratchpad',
                              buildFormulaAgentPrompt(formulaText, lang),
                              'formula',
                            );
                          }}
                          lang={lang}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'whiteboard' && (
                        <WorkspaceToolSuspense tool="whiteboard" lang={lang}>
                        <LazyWhiteboardPanel
                          session={whiteboardSession}
                          concept={quizConcept}
                          lang={lang}
                          storageScope={`${progressKey}:${quizConcept}`}
                          scratchpadImport={scratchpadImport}
                          onDismissScratchpadImport={() => setScratchpadImport(null)}
                          emptyMessage={toolEmptyMessage('whiteboard')}
                          onUpload={handleToolUpload}
                          onEngage={() => noteConceptActivity(quizConcept, 'whiteboard', 'noted')}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'whiteboard')}
                          relatedConcepts={[
                            ...conceptLensView.related.map((r) => r.label),
                            ...conceptLensView.followUp.map((r) => r.label),
                          ].slice(0, 6)}
                          prerequisiteConcepts={conceptLensView.prerequisites.map((r) => r.label).slice(0, 4)}
                          weakFocus={
                            weakAreaSpots.find((s) => s.concept.toLowerCase() === quizConcept.toLowerCase())
                              ?.reasons[0]?.label
                            ?? (conceptLensView.struggling ? quizConcept : undefined)
                          }
                          onAskAgent={(prompt, intent) => {
                            const agentIntent: ToolAgentIntent = intent === 'critique'
                              ? 'diagram-critique'
                              : intent === 'explain'
                                ? 'diagram-explain'
                                : 'diagram-coach';
                            openAgentForTool('whiteboard', prompt, agentIntent);
                            noteConceptActivity(quizConcept, 'whiteboard', 'noted');
                          }}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'dashboard' && (
                        <WorkspaceToolSuspense tool="dashboard" lang={lang}>
                        <LazyDashboardPanel
                          session={dashboardSession}
                          concept={quizConcept}
                          lang={lang}
                          miniProps={dashboardMiniProps}
                          emptyMessage={toolEmptyMessage('dashboard')}
                          onUpload={handleToolUpload}
                          onFocusWeakSpot={focusWeakArea}
                          onStartTask={onStartTask}
                          onOpenSuggestedTool={() => {
                            const tool = dashboardSession.suggestFocusTool;
                            if (tool) openWorkspaceTool(tool);
                          }}
                          onOpenToolActivity={(tool) => openWorkspaceTool(tool)}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'dashboard')}
                          onRemediateWeakSpot={handleConceptBusRemediation}
                          courseName={courseName ?? linkedCourse?.title}
                          nextAction={nextActionRecommendation}
                          onRunNextAction={runNextAction}
                          conceptBusRows={conceptBusRows}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'leitner' && (
                        <WorkspaceToolSuspense tool="leitner" lang={lang}>
                        <LazyLeitnerPanel
                          session={leitnerSession}
                          concept={quizConcept}
                          lang={lang}
                          scopeKey={`${progressKey}:${quizConcept}`}
                          onSessionDirty={onSessionDirty}
                          spacingIntervals={learnerModel?.spacingIntervals ?? []}
                          emptyMessage={toolEmptyMessage('leitner')}
                          onUpload={handleToolUpload}
                          onRate={(rating) => {
                            onLeitnerRate?.(quizConcept, rating);
                            noteConceptActivity(quizConcept, 'leitner', rating === 'again' || rating === 'hard' ? 'leitner-hard' : 'leitner-easy');
                          }}
                          onOpenQuiz={() => openWorkspaceTool('quiz')}
                          onQuizCard={(front) => {
                            focusOnTerm(front, 'leitner');
                            noteConceptActivity(quizConcept, 'quiz', 'focus');
                            openWorkspaceTool('quiz');
                          }}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'leitner')}
                          artifactStale={leitnerArtifactStale}
                          onAcknowledgeStale={() => acknowledgePracticeStale('leitner')}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'timer' && (
                        <WorkspaceToolSuspense tool="timer" lang={lang}>
                        <LazyTimerPanel
                          session={timerSession}
                          concept={quizConcept}
                          lang={lang}
                          scopeKey={progressKey}
                          stepLabel={STEPS[currentStep]?.title}
                          stepIndex={currentStep}
                          conceptMastery={workspaceCorrelation.conceptMastery}
                          emptyMessage={toolEmptyMessage('timer')}
                          onUpload={handleToolUpload}
                          onSessionComplete={(minutes, label) => onLogStudyMinutes?.(minutes, label)}
                          onOpenBreakTool={() => openWorkspaceTool('leitner')}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'timer')}
                          onOpenSimulator={() => openWorkspaceTool('simulator')}
                          activeExamPractice={pendingExamPractice}
                          settingsExamDate={userSettings?.examDate}
                          courseExamDate={linkedCourse?.examDate}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'simulator' && (
                        <WorkspaceToolSuspense tool="simulator" lang={lang}>
                        <LazySimulatorPanel
                          session={simulatorSession}
                          concept={quizConcept}
                          courseTitle={linkedCourse?.title}
                          lang={lang}
                          emptyMessage={toolEmptyMessage('simulator')}
                          onUpload={handleToolUpload}
                          onEngage={() => noteConceptActivity(quizConcept, 'simulator', 'simulated')}
                          onSensitivityCue={(cueId) => setSandboxTopSensitivityCue(cueId)}
                          onScenarioSelect={(scenarioId: SimulatorScenarioId) => {
                            saveLastSimulatorScenario(progressKey, scenarioId);
                            saveExamPracticePreset(progressKey, examPracticePresetForScenario(scenarioId));
                            noteConceptActivity(quizConcept, 'simulator', 'simulated');
                          }}
                          onStartTimedPractice={(presetId) => {
                            saveExamPracticePreset(progressKey, presetId);
                            setPendingExamPractice(presetId);
                            noteConceptActivity(quizConcept, 'timer', 'focus');
                            openWorkspaceTool('timer');
                          }}
                          onSendToWhiteboard={sendScratchpadToWhiteboard}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'simulator')}
                          artifactStale={simulatorArtifactStale}
                          onAcknowledgeStale={() => acknowledgePracticeStale('simulator')}
                          scopeKey={progressKey}
                          initialMainTab={model.simulatorMainTab}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'compare' && (
                        <WorkspaceToolSuspense tool="compare" lang={lang}>
                        <LazyComparePanel
                          session={compareSession}
                          concept={quizConcept}
                          lang={lang}
                          focusTerm={effectiveFocus?.term}
                          emptyMessage={toolEmptyMessage('compare')}
                          onUpload={handleToolUpload}
                          onRowFocus={(term) => {
                            noteConceptActivity(term, 'compare', 'read');
                            focusOnTerm(term, 'compare');
                          }}
                          onSelectionAction={handleWorkspaceSelectionAction}
                          onExplainDifference={(row) => {
                            const prompt = buildCompareDifferencePrompt(row.text, quizConcept, lang);
                            openAgentForTool('compare', prompt, 'compare-row');
                            noteConceptActivity(row.term, 'compare', 'read');
                          }}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'compare')}
                          onAskAgent={() => {
                            openAgentForTool('compare', buildCompareToolAgentPrompt(quizConcept, lang));
                          }}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'debate' && (
                        <WorkspaceToolSuspense tool="debate" lang={lang}>
                        <LazyDebatePanel
                          session={debateSession}
                          concept={quizConcept}
                          lang={lang}
                          storageScope={`${progressKey}:${quizConcept}`}
                          focusTerm={effectiveFocus?.term}
                          emptyMessage={toolEmptyMessage('debate')}
                          onUpload={handleToolUpload}
                          onOpenInReader={(claim) => {
                            noteConceptActivity(quizConcept, 'debate', 'mapped');
                            openReaderAtSearch(claim, 'debate');
                          }}
                          onAskAgent={(claimText) => {
                            const claim = claimText?.trim() || quizConcept;
                            openAgentForTool('debate', buildDebateClaimAgentPrompt(claim, lang));
                          }}
                          onSelectionAction={handleWorkspaceSelectionAction}
                          onRebuttalPersisted={() => {
                            noteConceptActivity(quizConcept, 'debate', 'noted');
                          }}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'feynman' && (
                        <WorkspaceToolSuspense tool="feynman" lang={lang}>
                        <LazyFeynmanCheck
                          concept={quizConcept}
                          settings={userSettings}
                          hasSource={noteBundle.hasSource}
                          emptyMessage={noteBundle.emptyMessage}
                          onUpload={handleToolUpload}
                          onAskAgent={() => {
                            openAgentForTool('feynman', buildFeynmanToolAgentPrompt(quizConcept, lang));
                          }}
                          onAskAgentWithPrompt={(prompt) => {
                            openAgentForTool('feynman', prompt);
                          }}
                          outline={feynmanSession.outline}
                          placeholder={feynmanSession.placeholder}
                          gapHints={feynmanSession.gapHints}
                          gapTerms={feynmanSession.gapTerms}
                          referenceNotes={feynmanSession.referenceExcerpt || undefined}
                          glossary={scopedGlossary}
                          extraTerms={noteBundle.matchingTopic?.title ? [noteBundle.matchingTopic.title] : undefined}
                          sectionLabel={feynmanSession.sectionLabel}
                          keyTerms={feynmanSession.keyTerms}
                          weakExtraction={feynmanSession.weakExtraction}
                          draftScopeKey={progressKey}
                          initialDraft={loadFeynmanDraft(progressKey)}
                          onExplanationSubmitted={() => {
                            noteConceptActivity(quizConcept, 'feynman', 'explained');
                          }}
                          onFocusConcept={() => openWorkspaceTool('concept-map')}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'feynman')}
                          onOpenDashboard={() => openWorkspaceTool('dashboard')}
                          onOpenQuiz={() => openWorkspaceTool('quiz')}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'annotations' && (
                        <WorkspaceToolSuspense tool="annotations" lang={lang}>
                        {annotationConflicts.length > 0 ? (
                          <div className="shrink-0 px-3 pt-3">
                            <AnnotationConflictPanel
                              conflicts={annotationConflicts}
                              language={lang}
                              onResolved={handleResolveAnnotationConflict}
                              onDismissAll={handleDismissAnnotationConflicts}
                            />
                          </div>
                        ) : null}
                        <LazyAnnotationOverlay
                          sourceText={annotationStableSource}
                          sourceName={noteBundle.sourceName}
                          fileKey={noteBundle.fileKey}
                          emptyMessage={toolEmptyMessage('annotations')}
                          onUpload={handleToolUpload}
                          hasSource={noteBundle.hasSource}
                          onAskAgent={(text) => {
                            if (!text.trim()) return;
                            openAgentForTool('annotations', buildAnnotationAgentPrompt(text, lang), 'annotation');
                          }}
                          onSelectionAction={handleWorkspaceSelectionAction}
                          concept={quizConcept}
                          focusTerm={deferredFocusTerm || undefined}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'annotations')}
                          pipelineVersion={noteBundle.pipelineVersion}
                          sectionLabel={STEPS[currentStep]?.title}
                          onAnnotate={({ focusTerm, category }) => {
                            const term = focusTerm ?? quizConcept;
                            const cat = category ?? 'general';
                            noteConceptActivity(term, 'annotations', conceptSignalForAnnotationCategory(cat));
                            if (cat === 'confusing') {
                              setStepMarks((m) => ({ ...m, [currentStep]: 'confusing' }));
                            }
                          }}
                          lang={lang}
                          sharedAnnotations={sharedAnnotations}
                          courseId={effectiveCourseId}
                          authToken={userSettings?.authToken}
                          onPublishShared={handlePublishAnnotation}
                          annotationSyncLive={annotationSyncLive}
                          annotationSyncVersion={annotationSyncVersion}
                          annotationSyncMode={annotationSyncMode}
                          onRemapComplete={(count) => {
                            if (count > 0) noteConceptActivity(quizConcept, 'annotations', 'annotated');
                          }}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      {activeTool === 'quiz' && (
                        <WorkspaceToolSuspense tool="quiz" lang={lang}>
                        <LazyQuizPanel
                          session={quizSession}
                          concept={quizConcept}
                          lang={lang}
                          scopeKey={progressKey}
                          course={linkedCourse}
                          irt={quizSessionIrt}
                          irtResponseCount={quizIrtState.responses}
                          emptyMessage={toolEmptyMessage('quiz')}
                          onUpload={handleToolUpload}
                          onSessionComplete={(summary) => {
                            const correct = summary.accuracy >= 60;
                            setQuizPassed(correct);
                            handleQuizSessionComplete(summary);
                            onQuizAttempt?.(quizConcept, correct, summary.meanConfidence);
                            noteConceptActivity(quizConcept, 'quiz', correct ? 'quiz-correct' : 'quiz-wrong');
                            if (noteBundle.hasSource) {
                              recordQuizResponse(
                                progressKey,
                                quizConcept,
                                quizDef,
                                correct,
                                conceptMastery,
                              );
                              setQuizIrtRevision((v) => v + 1);
                            }
                          }}
                          onOpenFlashcards={() => openWorkspaceTool('leitner')}
                          onOpenFeynman={() => openWorkspaceTool('feynman')}
                          onRemediateWrong={handleQuizRemediateWrong}
                          onRemediateWrongCluster={handleQuizRemediateWrongCluster}
                          attemptHistory={quizAttemptHistory}
                          onSelectionAction={handleWorkspaceSelectionAction}
                          onOpenInReader={(query) => openReaderAtSearch(query, 'quiz')}
                          onGroundedFeedbackFocus={syncQuizGroundedFocus}
                          artifactStale={quizArtifactStale}
                          onAcknowledgeStale={() => acknowledgePracticeStale('quiz')}
                        />
                        </WorkspaceToolSuspense>
                      )}
                      </div>
                    </ToolFrame>
                  </Panel>
                )}
      {!chromeHidden && isMobile && (
        <WorkspaceMobileIntelligenceBottomSheet
          active={intelTab}
          onChange={setIntelTab}
          lang={lang}
          badges={{
            'weak-areas': weakAreaSpots.length,
            'concept-bus': conceptBusRows.length,
          }}
        >
          {intelTab === 'discover' && (
            <WorkspaceIdleMount enabled={intelReady}>
              <WorkspaceToolSuspense tool="discover" lang={lang}>
                <LazyWorkspaceDiscoverabilityPanel
                  summary={discoverabilitySummary}
                  lang={lang}
                  expanded
                  onToggle={() => setIntelTab(null)}
                  actions={discoverabilityActions}
                  onRunNextAction={runNextAction}
                  onLearningAction={handleLearningAction}
                  stepUnderstood={stepMarks[currentStep] === 'understood'}
                  stepConfusing={stepMarks[currentStep] === 'confusing'}
                  onOpenRecommendedTool={
                    discoverabilitySummary.recommendedTool
                      ? () => openWorkspaceTool(discoverabilitySummary.recommendedTool as WorkspaceTool)
                      : undefined
                  }
                  hasSource={noteBundle.hasSource}
                  emptyActions={resolveEmptyActions('discover')}
                />
              </WorkspaceToolSuspense>
            </WorkspaceIdleMount>
          )}
          {intelTab === 'concept-bus' && (
            <WorkspaceIdleMount enabled={intelReady}>
              <WorkspaceToolSuspense tool="concept-bus" lang={lang}>
                <LazyConceptBusPanel
                  rows={conceptBusRows}
                  activeTool={activeTool}
                  lang={lang}
                  expanded
                  onToggle={() => setIntelTab(null)}
                  onFocusTerm={(term) => focusOnTerm(term, activeTool)}
                  onJumpTool={(tool) => openWorkspaceTool(tool)}
                  onRemediate={handleConceptBusRemediation}
                  activeLens={conceptLensView}
                  onOpenReaderSection={openReaderAtConceptSection}
                  hasSource={noteBundle.hasSource}
                  onUpload={handleToolUpload}
                  onReprocess={openReprocessWizard}
                />
              </WorkspaceToolSuspense>
            </WorkspaceIdleMount>
          )}
          {intelTab === 'weak-areas' && (
            <WorkspaceIdleMount enabled={intelReady}>
              <WorkspaceToolSuspense tool="weak-areas" lang={lang}>
                <LazyWeakAreasFocusRail
                  spots={weakAreaSpots}
                  focusTerm={effectiveFocus?.term}
                  lang={lang}
                  expanded
                  onToggle={() => setIntelTab(null)}
                  onFocusWeakSpot={focusWeakArea}
                  emptyActions={resolveEmptyActions('weak-areas')}
                />
              </WorkspaceToolSuspense>
            </WorkspaceIdleMount>
          )}
        </WorkspaceMobileIntelligenceBottomSheet>
      )}
    </>
  );
}
