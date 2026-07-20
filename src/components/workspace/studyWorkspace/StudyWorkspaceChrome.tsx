import { cn } from '../../../utils/cn';
import { BlueprintSurface } from '../../ui/BlueprintSurface';
import { ThemeToggle } from '../../ThemeToggle';
import {
  X, Maximize2, Minimize2, Sparkles, StickyNote, Search, LayoutGrid, SlidersHorizontal, PanelLeftOpen,
} from '@/lib/lucide-shim';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { displayWorkspaceStepTitle } from '../../../lib/workspaceContextModel';
import { WorkspaceContextBar } from '../WorkspaceContextBar';
import { WorkspaceStudyRoomTrigger } from '../WorkspaceStudyRoomTrigger';
import { AllCapsLabel } from '../../ui/AllCapsLabel';
import { CompactStudyTimer } from '../CompactStudyTimer';
import { ConceptLensChromeStrip } from '../ConceptLensChromeStrip';
import { TheoryPracticeLensToggle } from '../TheoryPracticeLensToggle';
import { CollapsibleChromeSection } from '../CollapsibleChromeSection';
import { WorkspaceStatusPanel } from '../WorkspaceStatusPanel';
import { nextActionLabel } from '../../../lib/nextActionEngine';
import { commandPaletteBadge } from '../../../lib/workspaceKeyboardShortcuts';
import type { MobileIntelTab } from '../WorkspaceMobileIntelligenceTabs';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import { useState } from 'react';
import { useMinimalTheme } from '../../../lib/useMinimalTheme';
import { resolveChromeDensity } from '../../../lib/chromeDensity';

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
    studyRoomOpen,
    setStudyRoomOpen,
    notebookMode,
    setNotebookMode,
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
    handleExplainGraphRelation,
    intelReady,
    pedagogyLens,
    applyPedagogyLens,
    enterSplitLesson,
  } = model;

  const { userSettings, onToggleTheme } = model;

  const [notebookMenuOpen, setNotebookMenuOpen] = useState(false);
  const [classicMenuOpen, setClassicMenuOpen] = useState(false);
  const isMinimal = useMinimalTheme();
  const chromeDensity = resolveChromeDensity(userSettings?.chromeDensity, lang);
  /** Compact chrome or minimal theme → overflow menu parity with notebook (OPT-M2). */
  const useClassicOverflow = isMinimal || chromeDensity === 'compact';

  const themeToggle = onToggleTheme ? (
    <ThemeToggle
      preference={userSettings?.theme}
      onToggle={onToggleTheme}
      t={t}
      data-testid="workspace-theme-toggle"
    />
  ) : null;

  return (
    <>
            {/* Skip links — visible on focus only */}
            <nav className="skip-links" aria-label={t('skipLinksAria')}>
              <a
                href="#workspace-main"
                className="skip-to-content"
                data-testid="workspace-skip-link"
              >
                {t('wsSkipToMain')}
              </a>
            </nav>
      
            {/* ============================================================ */}
            {/* MOBILE COMPACT CHROME — Bento integrated flow                */}
            {/* ============================================================ */}
            {!chromeHidden && isMobile && (
              <>
                <header className="relative z-10 px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={onClose}
                      aria-label={t('close')}
                      className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                      {layout !== 'zen' && (
                        <button
                          type="button"
                          onClick={() => setShowPalette(true)}
                          data-testid="workspace-command-palette-fab"
                          aria-label={t('wsCommandPalette')}
                          className="p-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shadow-md"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      )}
                      <WorkspaceStudyRoomTrigger
                        lang={lang}
                        open={studyRoomOpen}
                        onClick={() => setStudyRoomOpen((v) => !v)}
                        variant="chrome"
                        className="p-2 rounded-full bg-surface-secondary hover:bg-surface-hover min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:rounded-lg sm:bg-transparent"
                      />
                      <button
                        onClick={() => setShowNotes((v) => !v)}
                        aria-label={t('paletteSessionNotes')}
                        aria-pressed={showNotes}
                        className="p-2 rounded-full bg-surface-secondary hover:bg-surface-hover text-text-secondary transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      >
                        <StickyNote className={cn('w-4 h-4', showNotes && 'text-brand-600')} />
                      </button>
                      {themeToggle && (
                        <div className="[&>button]:p-2 [&>button]:rounded-full [&>button]:bg-surface-secondary [&>button]:hover:bg-surface-hover [&>button]:min-h-[40px] [&>button]:min-w-[40px] [&>button]:flex [&>button]:items-center [&>button]:justify-center">
                          {themeToggle}
                        </div>
                      )}
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
                    <p className="ws-eyebrow type-micro text-brand-800 font-semibold truncate">
                      <AllCapsLabel>{courseName ?? linkedCourse?.title ?? t('courseEyebrow')}</AllCapsLabel>
                    </p>
                    <h1
                      className="ws-serif type-display-sm text-text-primary truncate"
                      data-testid="workspace-header-title"
                    >
                      {displayWorkspaceStepTitle(STEPS[currentStep]?.title ?? quizConcept, quizConcept, lang)}
                    </h1>
                  </div>
                </header>
      
                {/* Progressive disclosure: step + source quality in one row */}
                <div className="px-4 py-2 shrink-0">
                  <BlueprintSurface hint className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1 shrink-0" aria-hidden>
                        <div className="w-6 h-6 rounded-full bg-brand-600 border-2 border-surface-secondary flex items-center justify-center type-micro text-white font-semibold">
                          {Math.min(currentStep + 1, STEPS.length || 1)}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-brand-400 border-2 border-surface-secondary flex items-center justify-center type-micro text-white font-semibold">
                          {STEPS.length || 7}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text-secondary truncate">
                        {t('wsStepOf')
                          .replace('{current}', String(Math.min(currentStep + 1, STEPS.length || 1)))
                          .replace('{total}', String(STEPS.length || 7))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {typeof sourceQualityScore === 'number' && (
                        <span className="ws-pill" data-testid="workspace-mobile-source-quality">
                          {sourceQualityScore}% {t('wsSourceShort')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIntelTab((tb: MobileIntelTab | null) => (tb === 'weak-areas' ? null : 'weak-areas'))}
                        aria-pressed={intelTab === 'weak-areas'}
                        className={cn('ws-pill', !intelReady && 'animate-pulse')}
                        data-active={intelTab === 'weak-areas' || undefined}
                        data-hydrating={!intelReady || undefined}
                      >
                        {t('weakLabel')} ({intelReady ? weakAreaSpots.length : '…'})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntelTab((tb: MobileIntelTab | null) => (tb === 'concept-bus' ? null : 'concept-bus'))}
                        aria-pressed={intelTab === 'concept-bus'}
                        className={cn('ws-pill', !intelReady && 'animate-pulse')}
                        data-active={intelTab === 'concept-bus' || undefined}
                        data-hydrating={!intelReady || undefined}
                      >
                        {t('wsConceptsLabel')} ({intelReady ? conceptBusRows.length : '…'})
                      </button>
                    </div>
                  </BlueprintSurface>
                </div>
      
                {/* Concept ribbon — inline chrome, not over tool content */}
                <CollapsibleChromeSection title={t('chromeConceptLens')} data-testid="mobile-concept-lens-chrome">
                  <ConceptLensChromeStrip
                    conceptLensView={conceptLensView}
                    activeConceptLabel={activeConceptLabel}
                    activeStepTitle={STEPS[currentStep]?.title}
                    conceptLensExpanded={conceptLensExpanded}
                    onToggleExpand={() => setConceptLensExpanded((v) => !v)}
                    conceptBus={conceptBus}
                    activeTool={activeTool}
                    lang={lang}
                    onFocus={(term) => focusOnTerm(term, activeTool)}
                    onJumpTool={openWorkspaceTool}
                    onAction={handleConceptLensAction}
                    onExplainRelation={handleExplainGraphRelation}
                    onOpenReaderSection={openReaderAtConceptSection}
                  />
                </CollapsibleChromeSection>
              </>
            )}
      
            {/* ============================================================ */}
            {/* DESKTOP NOTEBOOKLM MINIMAL CHROME                              */}
            {/* ============================================================ */}
            {!chromeHidden && !isMobile && notebookMode && (
              <>
              <div
                className="relative z-10 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border-subtle bg-surface-card shrink-0"
                data-testid="notebook-workspace-chrome"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={onClose}
                    title={t('wsCloseWorkspace')}
                    aria-label={t('close')}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h1
                    className="text-sm font-semibold truncate text-text-primary"
                    data-testid="workspace-header-title"
                  >
                    {courseName ?? linkedCourse?.title ?? taskTitle ?? quizConcept}
                  </h1>
                </div>
                <div className="relative shrink-0 flex items-center gap-1">
                  {themeToggle && (
                    <div className="[&>button]:p-1.5 [&>button]:rounded-lg [&>button]:hover:bg-surface-hover">
                      {themeToggle}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotebookMenuOpen((v) => !v)}
                    aria-expanded={notebookMenuOpen}
                    aria-label={lang === 'el' ? 'Περισσότερα εργαλεία' : 'More tools'}
                    data-testid="notebook-chrome-menu"
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  {notebookMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-52 rounded-xl border border-border-subtle bg-surface-card shadow-lg py-1 text-xs">
                      <button type="button" onClick={() => { setShowPalette(true); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('wsCommandPalette')}</button>
                      <button type="button" onClick={() => { setShowNotes((v) => !v); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('paletteSessionNotes')}</button>
                      <button type="button" onClick={() => { setStudyRoomOpen((v) => !v); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{lang === 'el' ? 'Study room' : 'Study room'}</button>
                      <button type="button" onClick={() => { setIntelSheetOpen(true); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{lang === 'el' ? 'Αδύναμα σημεία & έννοιες' : 'Weak areas & concepts'}</button>
                      <button type="button" onClick={() => { setNotebookMode(false); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{lang === 'el' ? 'Κλασική προβολή' : 'Classic view'}</button>
                      {onToggleTheme && (
                        <button type="button" onClick={() => { onToggleTheme(); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('theme')}</button>
                      )}
                      <button type="button" onClick={() => { handleOpenAgent(); setNotebookMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('agentBtn')}</button>
                    </div>
                  )}
                </div>
              </div>
              {/* OPT-R11 — under Minimal, Status docks at workspace bottom (StudyWorkspaceBody). */}
              {!isMinimal && <WorkspaceStatusPanel defaultOpen={false} />}
              </>
            )}

            {/* ============================================================ */}
            {/* DESKTOP / TABLET CHROME (classic layout)                     */}
            {/* ============================================================ */}
            {!chromeHidden && !isMobile && !notebookMode && (
              <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-subtle bg-surface-secondary/85 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={onClose} title={t('wsCloseWorkspace')} aria-label={t('close')} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-sm font-semibold truncate text-text-primary" data-testid="workspace-header-title">
                        {courseName ?? linkedCourse?.title ?? taskTitle ?? quizConcept}
                      </h1>
                      {(courseName || linkedCourse?.title) && taskTitle && taskTitle !== (courseName ?? linkedCourse?.title) && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md border border-border-subtle bg-surface-hover type-micro font-medium text-text-secondary shrink-0 truncate max-w-[140px]">
                          {taskTitle}
                        </span>
                      )}
                    </div>
                    <p className="type-micro text-text-muted truncate mt-0.5" data-testid="workspace-header-subtitle">
                      {displayWorkspaceStepTitle(STEPS[currentStep]?.title ?? quizConcept, quizConcept, lang)}
                      {' · '}
                      {workspaceToolLabel(activeTool, lang)}
                    </p>
                  </div>
                </div>
      
                <div className="flex items-center gap-1.5 shrink-0">
                  {!useClassicOverflow && (
                    <TheoryPracticeLensToggle
                      lens={pedagogyLens}
                      onChange={applyPedagogyLens}
                      lang={lang}
                      className="hidden lg:inline-flex"
                    />
                  )}
                  {layout !== 'zen' && !useClassicOverflow && (
                    <button
                      type="button"
                      onClick={enterSplitLesson}
                      data-testid="workspace-split-layout"
                      data-tour="workspace-split-layout"
                      title={t('wsSplitLesson')}
                      className="hidden md:inline-flex items-center gap-1 p-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-hover text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                  )}
                  {layout !== 'zen' && !useClassicOverflow && (
                    <button
                      type="button"
                      onClick={() => setShowPalette(true)}
                      data-testid="workspace-command-palette-open"
                      title={`${t('wsCommandPalette')} (${commandPaletteBadge()})`}
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-hover type-micro font-mono text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                    >
                      {commandPaletteBadge()}
                    </button>
                  )}
                  {!useClassicOverflow && (
                    <WorkspaceStudyRoomTrigger
                      lang={lang}
                      open={studyRoomOpen}
                      onClick={() => setStudyRoomOpen((v) => !v)}
                      variant="chrome"
                    />
                  )}
                  {!useClassicOverflow && (
                    <CompactStudyTimer lang={lang} className="hidden lg:inline-flex" />
                  )}
                  {!useClassicOverflow && (
                    <button onClick={() => setShowNotes((v) => !v)} className={cn('ws-chrome-btn p-1.5 shrink-0', showNotes && 'ws-chrome-btn-active')} title={t('paletteSessionNotes')} aria-pressed={showNotes}>
                      <StickyNote className="w-4 h-4" />
                    </button>
                  )}
                  {!useClassicOverflow && (
                    <button
                      onClick={() => setNotebookMode(!notebookMode)}
                      className={cn('ws-chrome-btn p-1.5 shrink-0', notebookMode && 'ws-chrome-btn-active')}
                      aria-pressed={notebookMode}
                      data-testid="workspace-notebook-toggle"
                      title={notebookMode ? (lang === 'el' ? 'Κλασική προβολή' : 'Classic view') : (lang === 'el' ? 'Προβολή NotebookLM' : 'NotebookLM view')}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setLayout(layout === 'zen' ? 'split' : 'zen')}
                    className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
                    title={layout === 'zen' ? t('wsExitFocus') : t('wsEnterZen')}
                    data-testid="workspace-zen-toggle"
                    aria-pressed={layout === 'zen'}
                  >
                    {layout === 'zen' ? <Minimize2 className="w-4 h-4 text-brand-800" /> : <Maximize2 className="w-4 h-4" />}
                    <span className="hidden xl:inline type-micro font-medium">{t('wsZenShort')}</span>
                  </button>
                  {!useClassicOverflow && themeToggle && (
                    <div className="[&>button]:ws-chrome-btn [&>button]:p-1.5 [&>button]:shrink-0">
                      {themeToggle}
                    </div>
                  )}
                  {!useClassicOverflow && (
                    <button onClick={handleOpenAgent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full type-micro font-medium border border-border-subtle bg-surface-card hover:border-brand-200 hover:bg-surface-hover text-text-secondary hover:text-text-primary shrink-0 transition-colors">
                      <Sparkles className="w-3.5 h-3.5 text-brand-800" /> {t('agentBtn')}
                    </button>
                  )}
                  {useClassicOverflow && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setClassicMenuOpen((v) => !v)}
                        aria-expanded={classicMenuOpen}
                        aria-label={t('chromeMoreMenu')}
                        data-testid="classic-chrome-menu"
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                      {classicMenuOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 z-30 w-56 rounded-lg border border-border-default bg-surface-card py-1 text-xs shadow-none"
                          data-testid="classic-chrome-menu-panel"
                        >
                          <button type="button" onClick={() => { setShowPalette(true); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary" data-testid="classic-menu-palette">{t('wsCommandPalette')}</button>
                          <button type="button" onClick={() => { enterSplitLesson(); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('wsSplitLesson')}</button>
                          <button type="button" onClick={() => { setShowNotes((v) => !v); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('paletteSessionNotes')}</button>
                          <button type="button" onClick={() => { setStudyRoomOpen((v) => !v); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{lang === 'el' ? 'Study room' : 'Study room'}</button>
                          <button type="button" onClick={() => { setNotebookMode(true); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary" data-testid="classic-menu-notebook">{lang === 'el' ? 'Προβολή NotebookLM' : 'NotebookLM view'}</button>
                          <button type="button" onClick={() => { setIntelSheetOpen(true); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('chromeMoreStatus')}</button>
                          {onToggleTheme && (
                            <button type="button" onClick={() => { onToggleTheme(); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('theme')}</button>
                          )}
                          <button type="button" onClick={() => { handleOpenAgent(); setClassicMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary">{t('agentBtn')}</button>
                          <div className="border-t border-border-subtle my-1" />
                          <div className="px-3 py-2">
                            <TheoryPracticeLensToggle
                              lens={pedagogyLens}
                              onChange={(v) => { applyPedagogyLens(v); setClassicMenuOpen(false); }}
                              lang={lang}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
      
            {/* Progress mini-bar — hidden in notebook mode for calmer UI */}
            {!notebookMode && (
            <div className="relative z-10 h-0.5 bg-border-subtle/40 shrink-0">
              <div className="h-0.5 bg-brand-600 transition-all duration-500" style={{ width: `${STEPS.length ? Math.max(5, ((Math.min(currentStep, STEPS.length - 1) + 1) / STEPS.length) * 100) : 5}%` }} />
            </div>
            )}
      
            {!chromeHidden && !notebookMode && (
              <>
                {!isMinimal && <WorkspaceStatusPanel defaultOpen={useClassicOverflow} />}
                <WorkspaceContextBar
                context={workspaceContext}
                lang={lang}
                sourceQuality={sourceQualityScore ?? null}
                sourceIntelligence={sourceIntelligence}
                focusConcept={effectiveFocus?.term ?? quizConcept}
                statusInbox={useClassicOverflow}
                showNextAction={Boolean(nextActionRecommendation && noteBundle.hasSource && runNextAction)}
                nextActionLabel={
                  nextActionRecommendation
                    ? nextActionLabel(nextActionRecommendation.primary, lang)
                    : undefined
                }
                onNextAction={runNextAction}
                weakCount={weakAreaSpots.length}
                conceptCount={conceptBusRows.length}
                onToggleWeak={isMobile
                  ? () => setIntelTab((tb: MobileIntelTab | null) => (tb === 'weak-areas' ? null : 'weak-areas'))
                  : () => setIntelSheetOpen((v) => !v)}
                onToggleConcepts={isMobile
                  ? () => setIntelTab((tb: MobileIntelTab | null) => (tb === 'concept-bus' ? null : 'concept-bus'))
                  : () => setIntelSheetOpen((v) => !v)}
                weakOpen={isMobile ? intelTab === 'weak-areas' : intelSheetOpen}
                conceptsOpen={isMobile ? intelTab === 'concept-bus' : intelSheetOpen}
                onOpenIntelSheet={() => setIntelSheetOpen((v) => !v)}
                intelSheetOpen={intelSheetOpen}
                showMigration={showReuploadHint}
                onOpenStudyRoom={() => setStudyRoomOpen((v) => !v)}
                studyRoomOpen={studyRoomOpen}
                studyRoomInHeader
              />
              </>
            )}

            {!chromeHidden && !isMobile && !notebookMode && (
              <CollapsibleChromeSection title={t('chromeConceptLens')} data-testid="desktop-concept-lens-chrome">
                <ConceptLensChromeStrip
                  conceptLensView={conceptLensView}
                  activeConceptLabel={activeConceptLabel}
                  activeStepTitle={STEPS[currentStep]?.title}
                  conceptLensExpanded={conceptLensExpanded}
                  onToggleExpand={() => setConceptLensExpanded((v) => !v)}
                  conceptBus={conceptBus}
                  activeTool={activeTool}
                  lang={lang}
                  onFocus={(term) => focusOnTerm(term, activeTool)}
                  onJumpTool={openWorkspaceTool}
                  onAction={handleConceptLensAction}
                  onExplainRelation={handleExplainGraphRelation}
                  onOpenReaderSection={openReaderAtConceptSection}
                  className="border-b border-border-subtle/60 bg-surface-primary/40"
                />
              </CollapsibleChromeSection>
            )}
    </>
  );
}
