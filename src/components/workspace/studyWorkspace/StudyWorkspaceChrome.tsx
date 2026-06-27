import { cn } from '../../../utils/cn';
import {
  X, Maximize2, Minimize2, Sparkles, StickyNote,
} from '@/lib/lucide-shim';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { displayWorkspaceStepTitle } from '../../../lib/workspaceContextModel';
import { WorkspaceContextBar } from '../WorkspaceContextBar';
import { ConceptLensPanel } from '../ConceptLensPanel';

import { activityFor } from '../../../lib/workspaceConceptBus';
import { nextActionLabel } from '../../../lib/nextActionEngine';
import type { MobileIntelTab } from '../WorkspaceMobileIntelligenceTabs';
import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface StudyWorkspaceChromeProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceChrome({ model }: StudyWorkspaceChromeProps) {
  const {
    onClose,
    taskTitle,
    courseName,
    quizConcept,
    t,
    lang,
    activeTool,
    isMobile,
    layout,
    setLayout,
    currentStep,
    chromeHidden,
    setShowPalette,
    showNotes,
    setShowNotes,
    intelTab,
    setIntelTab,
    intelSheetOpen,
    setIntelSheetOpen,
    conceptLensExpanded,
    setConceptLensExpanded,
    conceptBus,
    effectiveFocus,
    noteBundle,
    sourceIntelligence,
    linkedCourse,
    sourceQualityScore,
    showReuploadHint,
    conceptBusRows,
    weakAreaSpots,
    focusOnTerm,
    openWorkspaceTool,
    STEPS,
    handleOpenAgent,
    workspaceContext,
    nextActionRecommendation,
    runNextAction,
    activeConceptLabel,
    conceptLensView,
    openReaderAtConceptSection,
    handleConceptLensAction,
  } = model;

  return (
    <>
            {/* Skip link for keyboard users — visible on focus only */}
            <a
              href="#workspace-main"
              className="skip-to-content"
              data-testid="workspace-skip-link"
            >
              {lang === 'el' ? 'Παράκαμψη στο κύριο περιεχόμενο' : 'Skip to main content'}
            </a>
      
            {/* ============================================================ */}
            {/* MOBILE COMPACT CHROME — Bento integrated flow                */}
            {/* ============================================================ */}
            {!chromeHidden && isMobile && (
              <>
                <header className="relative z-10 px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={onClose}
                      aria-label={lang === 'el' ? 'Κλείσιμο' : 'Close'}
                      className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowNotes((v) => !v)}
                        aria-label={lang === 'el' ? 'Σημειώσεις' : 'Session notes'}
                        aria-pressed={showNotes}
                        className="p-2 rounded-full bg-surface-secondary hover:bg-surface-hover text-text-secondary transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      >
                        <StickyNote className={cn('w-4 h-4', showNotes && 'text-brand-600')} />
                      </button>
                      <button
                        onClick={handleOpenAgent}
                        aria-label={t('agentBtn')}
                        className="p-2 rounded-full bg-surface-secondary hover:bg-surface-hover text-text-secondary transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      >
                        <Sparkles className="w-4 h-4 text-brand-600" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="ws-eyebrow text-[10px] uppercase tracking-[0.14em] text-brand-400 font-bold truncate">
                      {courseName ?? linkedCourse?.title ?? (lang === 'el' ? 'Μάθημα' : 'Course')}
                    </p>
                    <h1
                      className="ws-serif text-[22px] leading-tight text-text-primary truncate"
                      data-testid="workspace-header-title"
                    >
                      {displayWorkspaceStepTitle(STEPS[currentStep]?.title ?? quizConcept, quizConcept, lang)}
                    </h1>
                  </div>
                </header>
      
                {/* Progressive disclosure: step + source quality in one row */}
                <div className="px-4 py-2 shrink-0">
                  <div className="ws-bento-soft p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1 shrink-0" aria-hidden>
                        <div className="w-6 h-6 rounded-full bg-brand-600 border-2 border-surface-secondary flex items-center justify-center text-[10px] text-white font-semibold">
                          {Math.min(currentStep + 1, STEPS.length || 1)}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-brand-400 border-2 border-surface-secondary flex items-center justify-center text-[10px] text-white font-semibold">
                          {STEPS.length || 7}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text-secondary truncate">
                        {lang === 'el' ? `Βήμα ${Math.min(currentStep + 1, STEPS.length || 1)} από ${STEPS.length || 7}` : `Step ${Math.min(currentStep + 1, STEPS.length || 1)} of ${STEPS.length || 7}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {typeof sourceQualityScore === 'number' && (
                        <span className="ws-pill" data-testid="workspace-mobile-source-quality">
                          {sourceQualityScore}% {lang === 'el' ? 'πηγή' : 'source'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIntelTab((tb: MobileIntelTab | null) => (tb === 'weak-areas' ? null : 'weak-areas'))}
                        aria-pressed={intelTab === 'weak-areas'}
                        className="ws-pill"
                        data-active={intelTab === 'weak-areas' || undefined}
                      >
                        {lang === 'el' ? 'Αδύνατα' : 'Weak'} ({weakAreaSpots.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntelTab((tb: MobileIntelTab | null) => (tb === 'concept-bus' ? null : 'concept-bus'))}
                        aria-pressed={intelTab === 'concept-bus'}
                        className="ws-pill"
                        data-active={intelTab === 'concept-bus' || undefined}
                      >
                        {lang === 'el' ? 'Έννοιες' : 'Concepts'} ({conceptBusRows.length})
                      </button>
                    </div>
                  </div>
                </div>
      
                {/* Concept ribbon — only when there's an active lens */}
                {conceptLensView.activeConcept && (
                  <div className="ws-ribbon px-4 py-1 flex gap-2 overflow-x-auto shrink-0" role="list">
                    <button
                      type="button"
                      role="listitem"
                      className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium"
                      onClick={() => setConceptLensExpanded((v) => !v)}
                      aria-expanded={conceptLensExpanded}
                    >
                      {activeConceptLabel ?? conceptLensView.activeConcept}
                    </button>
                    {conceptLensView.related?.slice(0, 4).map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        role="listitem"
                        className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-surface-secondary text-text-secondary text-xs font-medium hover:bg-surface-hover"
                        onClick={() => focusOnTerm(c.label, activeTool)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
      
                {/* Expanded concept lens panel — kept, but only when user expands */}
                {conceptLensView.activeConcept && conceptLensExpanded && (
                  <ConceptLensPanel
                    placement="strip"
                    lens={conceptLensView}
                    activity={activityFor(conceptBus, activeConceptLabel)}
                    activeTool={activeTool}
                    expanded={conceptLensExpanded}
                    onToggleExpand={() => setConceptLensExpanded((v) => !v)}
                    onJumpTool={(tool) => openWorkspaceTool(tool)}
                    onFocus={(term) => focusOnTerm(term, activeTool)}
                    onAction={handleConceptLensAction}
                    onOpenReaderSection={openReaderAtConceptSection}
                    lang={lang}
                  />
                )}
              </>
            )}
      
            {/* ============================================================ */}
            {/* DESKTOP / TABLET CHROME (unchanged behaviour)                */}
            {/* ============================================================ */}
            {!chromeHidden && !isMobile && (
              <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-subtle bg-surface-secondary/85 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={onClose} title={lang === 'el' ? 'Κλείσιμο χώρου μελέτης' : 'Close workspace'} aria-label={lang === 'el' ? 'Κλείσιμο' : 'Close'} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-sm font-semibold truncate text-text-primary" data-testid="workspace-header-title">
                        {courseName ?? linkedCourse?.title ?? taskTitle ?? quizConcept}
                      </h1>
                      {(courseName || linkedCourse?.title) && taskTitle && taskTitle !== (courseName ?? linkedCourse?.title) && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md border border-border-subtle bg-surface-hover text-[10px] font-medium text-text-secondary shrink-0 truncate max-w-[140px]">
                          {taskTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted truncate mt-0.5" data-testid="workspace-header-subtitle">
                      {displayWorkspaceStepTitle(STEPS[currentStep]?.title ?? quizConcept, quizConcept, lang)}
                      {' · '}
                      {workspaceToolLabel(activeTool, lang)}
                    </p>
                  </div>
                </div>
      
                <div className="flex items-center gap-1.5 shrink-0">
                  {layout !== 'zen' && (
                    <button
                      type="button"
                      onClick={() => setShowPalette(true)}
                      data-testid="workspace-command-palette-open"
                      title={lang === 'el' ? 'Παλέτα εντολών (⌘K)' : 'Command palette (⌘K)'}
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-hover text-[10px] font-mono text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                    >
                      ⌘K
                    </button>
                  )}
                  <button onClick={() => setShowNotes((v) => !v)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0" title={lang === 'el' ? 'Σημειώσεις' : 'Session notes'}>
                    <StickyNote className={cn('w-4 h-4', showNotes && 'text-accent-cyan')} />
                  </button>
                  <button onClick={() => setLayout(layout === 'zen' ? 'split' : 'zen')} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0" title={layout === 'zen' ? (lang === 'el' ? 'Έξοδος εστίασης (Z)' : 'Exit focus (Z)') : (lang === 'el' ? 'Εναλλαγή διάταξης (S)' : 'Toggle layout (S)')}>
                    {layout === 'zen' ? <Minimize2 className="w-4 h-4 text-accent-cyan" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button onClick={handleOpenAgent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium border border-border-subtle bg-surface-card hover:border-accent-cyan/40 hover:bg-surface-hover text-text-secondary hover:text-text-primary shrink-0 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> {t('agentBtn')}
                  </button>
                </div>
              </div>
            )}
      
            {/* Progress mini-bar */}
            <div className="relative z-10 h-0.5 bg-border-subtle/40 shrink-0">
              <div className="h-0.5 bg-brand-600 transition-all duration-500" style={{ width: `${STEPS.length ? Math.max(5, ((Math.min(currentStep, STEPS.length - 1) + 1) / STEPS.length) * 100) : 5}%` }} />
            </div>
      
            {!chromeHidden && (
              <WorkspaceContextBar
                context={workspaceContext}
                lang={lang}
                sourceQuality={sourceQualityScore ?? null}
                sourceIntelligence={sourceIntelligence}
                focusConcept={effectiveFocus?.term ?? quizConcept}
                showNextAction={Boolean(nextActionRecommendation && noteBundle.hasSource)}
                nextActionLabel={nextActionRecommendation ? nextActionLabel(nextActionRecommendation.primary, lang) : undefined}
                onNextAction={runNextAction}
                weakCount={weakAreaSpots.length}
                onToggleWeak={
                  isMobile
                    ? () => setIntelTab((tab: MobileIntelTab | null) => (tab === 'weak-areas' ? null : 'weak-areas'))
                    : () => setIntelSheetOpen(true)
                }
                onToggleConcepts={
                  isMobile
                    ? () => setIntelTab((tab: MobileIntelTab | null) => (tab === 'concept-bus' ? null : 'concept-bus'))
                    : () => setIntelSheetOpen(true)
                }
                conceptCount={conceptBusRows.length}
                weakOpen={isMobile ? intelTab === 'weak-areas' : intelSheetOpen}
                conceptsOpen={isMobile ? intelTab === 'concept-bus' : intelSheetOpen}
                onOpenIntelSheet={() => setIntelSheetOpen((v) => !v)}
                intelSheetOpen={intelSheetOpen}
                showMigration={showReuploadHint}
              />
            )}
    </>
  );
}
