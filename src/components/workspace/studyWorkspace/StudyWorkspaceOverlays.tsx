import { AnimatePresence, motion } from 'framer-motion';
import { X, StickyNote, LayoutGrid } from '@/lib/lucide-shim';
import { workspaceToolLabel } from '../../../lib/workspaceToolRegistry';
import { WorkspaceCommandPaletteMount } from '../WorkspaceCommandPaletteMount';
import { ReprocessPreviewModal } from '../../ReprocessPreviewModal';
import { WorkspaceIntelSideSheet } from '../WorkspaceIntelSideSheet';
import { WorkspaceKeyboardHelp } from '../WorkspaceKeyboardHelp';
import { WorkspaceMobileToolDrawer } from '../WorkspaceMobileToolDrawer';
import { nextActionLabel } from '../../../lib/nextActionEngine';
import { AVAILABLE_TOOLS, type WorkspaceTool } from './types';

import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface StudyWorkspaceOverlaysProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceOverlays({ model }: StudyWorkspaceOverlaysProps) {
  const {
    onReprocessMaterial,
    reprocessingMaterial,
    lang,
    activeTool,
    isMobile,
    layout,
    setLayout,
    currentStep,
    chromeHidden,
    showPalette,
    setShowPalette,
    showShortcutHelp,
    setShowShortcutHelp,
    showNotes,
    setShowNotes,
    notes,
    setNotes,
    intelSheetOpen,
    setIntelSheetOpen,
    stepMarks,
    mobileToolDrawerOpen,
    setMobileToolDrawerOpen,
    reprocessWizardOpen,
    setReprocessWizardOpen,
    reprocessApplied,
    effectiveFocus,
    noteBundle,
    sourceIntelligence,
    linkedCourse,
    reprocessPreview,
    handleApplyReprocess,
    conceptBusRows,
    weakAreaSpots,
    focusOnTerm,
    openWorkspaceTool,
    focusWeakArea,
    discoverabilityActions,
    paletteItems,
    nextActionRecommendation,
    discoverabilitySummary,
    handleLearningAction,
    runNextAction,
    conceptLensView,
    openReaderAtConceptSection,
    handleConceptBusRemediation,
  } = model;

  return (
    <>
            {/* Session notes slide-over */}
            <AnimatePresence>
              {showNotes && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowNotes(false)}
                    className="absolute inset-0 z-30 bg-slate-950/40"
                  />
                  <motion.div
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[380px] bg-surface-secondary/95 backdrop-blur-xl border-l border-white/10 flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-accent-cyan" />
                        <span className="text-sm font-semibold">{lang === 'el' ? 'Σημειώσεις συνεδρίας' : 'Session notes'}</span>
                      </div>
                      <button onClick={() => setShowNotes(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted"><X className="w-4 h-4" /></button>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={lang === 'el' ? 'Κράτα σημειώσεις καθώς μελετάς… (αποθηκεύονται τοπικά)' : 'Jot notes as you study… (saved locally)'}
                      className="flex-1 w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-text-primary focus:outline-none"
                    />
                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/8 text-[10px] text-text-muted">
                      <span>{lang === 'el' ? 'Αυτόματη αποθήκευση' : 'Auto-saved'}</span>
                      <span>{notes.trim().split(/\s+/).filter(Boolean).length} {lang === 'el' ? 'λέξεις' : 'words'}</span>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
      
            <WorkspaceIntelSideSheet
              open={intelSheetOpen}
              onClose={() => setIntelSheetOpen(false)}
              lang={lang}
              isMobile={isMobile}
              sourceIntelligence={sourceIntelligence}
              activeTool={activeTool}
              onOpenRecommendedTool={
                sourceIntelligence
                  ? () => {
                      openWorkspaceTool(sourceIntelligence.bestTool as WorkspaceTool);
                      if (layout === 'focus-lesson') setLayout(isMobile ? 'focus-tool' : 'split');
                    }
                  : undefined
              }
              discoverabilitySummary={discoverabilitySummary}
              discoverabilityActions={discoverabilityActions}
              onRunNextAction={runNextAction}
              onLearningAction={handleLearningAction}
              stepUnderstood={stepMarks[currentStep] === 'understood'}
              stepConfusing={stepMarks[currentStep] === 'confusing'}
              onOpenRecommendedToolFromDiscover={
                discoverabilitySummary.recommendedTool
                  ? () => openWorkspaceTool(discoverabilitySummary.recommendedTool as WorkspaceTool)
                  : undefined
              }
              conceptBusRows={conceptBusRows}
              onFocusTerm={(term) => focusOnTerm(term, activeTool)}
              onJumpTool={(tool) => openWorkspaceTool(tool)}
              onRemediate={handleConceptBusRemediation}
              conceptLensView={conceptLensView}
              onOpenReaderSection={openReaderAtConceptSection}
              weakAreaSpots={weakAreaSpots}
              focusTerm={effectiveFocus?.term}
              onFocusWeakSpot={focusWeakArea}
            />
      
            <WorkspaceCommandPaletteMount
              open={showPalette}
              onClose={() => setShowPalette(false)}
              items={paletteItems}
              placeholder={lang === 'el' ? 'Εργαλείο, αναζήτηση ή ενέργεια…' : 'Type a tool, search, or action…'}
            />
      
            <WorkspaceKeyboardHelp
              open={showShortcutHelp}
              onClose={() => setShowShortcutHelp(false)}
              lang={lang}
            />
      
            <WorkspaceMobileToolDrawer
              open={mobileToolDrawerOpen}
              onClose={() => setMobileToolDrawerOpen(false)}
              activeTool={activeTool}
              availableTools={AVAILABLE_TOOLS}
              onSelectTool={openWorkspaceTool}
              lang={lang}
            />
      
            {!chromeHidden && isMobile && (
              <div
                className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[120] w-[88%] max-w-[420px] ws-fab flex items-center justify-between gap-2 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
                data-testid="workspace-mobile-tool-bar"
                role="navigation"
                aria-label={lang === 'el' ? 'Επιλογή εργαλείου' : 'Tool picker'}
              >
                <div className="flex items-center gap-2 pl-2 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0"
                    aria-hidden
                  >
                    <LayoutGrid className="h-4 w-4 text-[#faf8f5]" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#faf8f5]/80 truncate">
                    {workspaceToolLabel(activeTool, lang)}
                  </span>
                </div>
                {nextActionRecommendation && noteBundle.hasSource && (
                  <button
                    type="button"
                    onClick={runNextAction}
                    className="px-3 py-1.5 rounded-full bg-white/15 text-[#faf8f5] text-[11px] font-semibold hover:bg-white/25 transition-colors shrink-0"
                    data-testid="workspace-mobile-next-action"
                    aria-label={nextActionLabel(nextActionRecommendation.primary, lang)}
                  >
                    {lang === 'el' ? 'Επόμενο' : 'Next'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileToolDrawerOpen(true)}
                  data-testid="workspace-mobile-tools-open"
                  aria-haspopup="dialog"
                  aria-expanded={mobileToolDrawerOpen}
                  aria-label={lang === 'el' ? `Εργαλεία — τρέχον: ${workspaceToolLabel(activeTool, lang)}` : `Tools — current: ${workspaceToolLabel(activeTool, lang)}`}
                  className="w-10 h-10 rounded-full bg-[#faf8f5] text-brand-700 flex items-center justify-center shadow-inner shrink-0 hover:bg-white transition-colors min-h-[40px] min-w-[40px]"
                >
                  <LayoutGrid className="h-5 w-5" aria-hidden />
                </button>
              </div>
            )}
      
      
            {linkedCourse && (
              <ReprocessPreviewModal
                open={reprocessWizardOpen}
                onClose={() => setReprocessWizardOpen(false)}
                preview={reprocessPreview}
                lang={lang}
                applying={reprocessingMaterial}
                applied={reprocessApplied}
                onApply={onReprocessMaterial ? handleApplyReprocess : undefined}
              />
            )}
    </>
  );
}
