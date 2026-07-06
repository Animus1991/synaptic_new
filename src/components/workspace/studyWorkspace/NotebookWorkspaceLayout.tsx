import { useCallback, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  ChevronRight, FileText, LayoutGrid, Plus, RefreshCw, Sparkles,
} from '@/lib/lucide-shim';
import { cn } from '../../../utils/cn';
import {
  WORKSPACE_TOOLS,
  workspaceToolDescription,
  workspaceToolLabel,
} from '../../../lib/workspaceToolRegistry';
import { StudyWorkspaceToolSurface } from './StudyWorkspaceToolSurface';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import type { WorkspaceTool } from './types';

interface NotebookWorkspaceLayoutProps {
  model: StudyWorkspaceModel;
}

/** Reader lives in the Sources column; every other tool becomes a Studio card. */
const STUDIO_TOOLS = WORKSPACE_TOOLS.filter((tool) => tool.id !== 'reader');

/**
 * NotebookLM-style 3-panel workspace: Sources (left) | AI chat (center) | Studio (right).
 * Additive alternative to the classic layout — reuses the same StudyWorkspaceModel and
 * the existing StudyWorkspaceToolSurface, so no tool functionality is lost.
 */
export function NotebookWorkspaceLayout({ model }: NotebookWorkspaceLayoutProps) {
  const {
    lang,
    noteBundle,
    courseSourceFiles,
    linkedCourse,
    courseName,
    quizConcept,
    effectiveFocus,
    activeTool,
    sourceQualityScore,
    showReuploadHint,
    showLowQualityBanner,
    reprocessingMaterial,
    openReprocessWizard,
    handleToolUpload,
    handleReuploadMaterial,
    openWorkspaceTool,
    openAgentForTool,
    handleOpenAgent,
    renderCenterAgent,
  } = model;

  const tx = useCallback(
    (el: string, en: string) => (lang === 'el' ? el : en),
    [lang],
  );

  const [studioToolOpen, setStudioToolOpen] = useState(false);
  const concept = effectiveFocus?.term ?? quizConcept;
  const notebookTitle = courseName ?? linkedCourse?.title ?? quizConcept;
  const showQualityStrip =
    (showReuploadHint || showLowQualityBanner) && sourceQualityScore != null;

  const openStudioTool = useCallback(
    (tool: WorkspaceTool) => {
      openWorkspaceTool(tool);
      setStudioToolOpen(true);
    },
    [openWorkspaceTool],
  );

  const askAiForTool = useCallback(
    (tool: WorkspaceTool) => {
      const label = workspaceToolLabel(tool, lang);
      const prompt =
        lang === 'el'
          ? `Βοήθησέ με να αξιοποιήσω το εργαλείο «${label}» για την έννοια «${concept}». Πρότεινε το επόμενο βήμα με βάση τις πηγές μου.`
          : `Help me get the most out of the "${label}" tool for the concept "${concept}". Suggest the next step grounded in my sources.`;
      openStudioTool(tool);
      openAgentForTool(tool, prompt);
    },
    [lang, concept, openStudioTool, openAgentForTool],
  );

  const openSourceGuide = useCallback(() => {
    openStudioTool('reader');
    const prompt =
      lang === 'el'
        ? `Δώσε μου έναν σύντομο οδηγό πηγής για το «${notebookTitle}»: τα βασικά θέματα, τις κεντρικές έννοιες και 3 προτεινόμενες ερωτήσεις μελέτης, με βάση τις πηγές μου.`
        : `Give me a brief source guide for "${notebookTitle}": the key topics, the central concepts and 3 suggested study questions, grounded in my sources.`;
    openAgentForTool('reader', prompt);
  }, [lang, notebookTitle, openStudioTool, openAgentForTool]);

  const addSource = useCallback(() => {
    if (noteBundle.hasSource) {
      handleReuploadMaterial();
    } else {
      handleToolUpload?.();
    }
  }, [noteBundle.hasSource, handleReuploadMaterial, handleToolUpload]);

  const readerOpen = studioToolOpen && activeTool === 'reader';

  return (
    <div
      className="relative z-10 flex-1 flex overflow-hidden bg-surface-secondary/60"
      id="workspace-main"
      role="main"
      tabIndex={-1}
      data-testid="notebook-workspace-layout"
    >
      <Group orientation="horizontal" className="flex-1 min-h-0 w-full h-full p-2 gap-0">
        {/* ============================== SOURCES ============================== */}
        <Panel
          id="nb-sources"
          defaultSize={22}
          minSize={14}
          className="flex h-full min-h-0 flex-col overflow-hidden"
        >
          <section
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
            aria-label={tx('Πηγές', 'Sources')}
            data-testid="notebook-sources-panel"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">
                {tx('Πηγές', 'Sources')}
              </h2>
              <button
                type="button"
                onClick={addSource}
                title={tx('Προσθήκη πηγής', 'Add source')}
                aria-label={tx('Προσθήκη πηγής', 'Add source')}
                data-testid="notebook-add-source"
                className="flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-1 type-micro font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {tx('Προσθήκη', 'Add')}
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {noteBundle.hasSource ? (
                <>
                  <button
                    type="button"
                    onClick={openSourceGuide}
                    data-testid="notebook-source-guide"
                    className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface-secondary/60 px-3 py-2.5 text-left hover:bg-surface-hover transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Sparkles className="h-4 w-4 shrink-0 text-brand-800" />
                      <span className="text-xs font-medium text-text-primary truncate">
                        {tx('Οδηγός πηγής', 'Source guide')}
                      </span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  </button>

                  <ul className="space-y-1" data-testid="notebook-source-list">
                    {(courseSourceFiles.length > 0
                      ? courseSourceFiles.map((file) => ({
                          key: file.id,
                          label: file.name,
                          meta: file.pageCount
                            ? `${file.pageCount} ${tx('σελ.', 'pages')}`
                            : undefined,
                        }))
                      : [{ key: 'bundle', label: noteBundle.sourceName ?? notebookTitle, meta: undefined }]
                    ).map((source) => (
                      <li key={source.key}>
                        <button
                          type="button"
                          onClick={() => openStudioTool('reader')}
                          aria-current={readerOpen ? 'true' : undefined}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors',
                            readerOpen
                              ? 'bg-brand-100/80 text-brand-800'
                              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                          )}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{source.label}</span>
                            {source.meta && (
                              <span className="block type-micro text-text-muted">{source.meta}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                  <FileText className="h-8 w-8 text-text-muted" aria-hidden />
                  <p className="text-xs text-text-secondary">
                    {tx(
                      'Δεν υπάρχουν πηγές ακόμα. Πρόσθεσε υλικό για να ξεκινήσεις.',
                      'No sources yet. Add material to get started.',
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleToolUpload?.()}
                    className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {tx('Προσθήκη πηγής', 'Add source')}
                  </button>
                </div>
              )}
            </div>

            {showQualityStrip && (
              <footer className="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2 shrink-0">
                <span className="ws-pill" data-testid="notebook-source-quality">
                  {sourceQualityScore}% {tx('ποιότητα πηγής', 'source quality')}
                </span>
                <button
                  type="button"
                  onClick={openReprocessWizard}
                  disabled={reprocessingMaterial}
                  className="flex items-center gap-1 type-micro font-medium text-text-secondary hover:text-brand-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', reprocessingMaterial && 'animate-spin')} />
                  {tx('Επανεπεξεργασία', 'Reprocess')}
                </button>
              </footer>
            )}
          </section>
        </Panel>

        <Separator className="w-2 bg-transparent hover:bg-brand-500/20 active:bg-brand-500/30 transition-colors cursor-col-resize" />

        {/* =============================== CHAT ================================ */}
        <Panel
          id="nb-chat"
          defaultSize={46}
          minSize={28}
          className="flex h-full min-h-0 flex-col overflow-hidden"
        >
          <section
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
            aria-label={tx('Συνομιλία', 'Chat')}
            data-testid="notebook-chat-panel"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">
                {tx('Συνομιλία', 'Chat')}
              </h2>
              <span className="type-micro text-text-muted truncate">
                {noteBundle.hasSource
                  ? tx('Θεμελιωμένη στις πηγές σου', 'Grounded in your sources')
                  : tx('Χωρίς πηγές ακόμα', 'No sources yet')}
              </span>
            </header>
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderCenterAgent ? (
                renderCenterAgent()
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <Sparkles className="h-8 w-8 text-brand-600" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {tx('Ρώτησε τον AI βοηθό', 'Ask the AI assistant')}
                    </p>
                    <p className="text-xs text-text-secondary max-w-sm">
                      {tx(
                        'Ο βοηθός απαντά με βάση τις πηγές σου, με παραπομπές στο σημείο του κειμένου.',
                        'The assistant answers based on your sources, with citations back to the text.',
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAgent}
                    data-testid="notebook-chat-launcher"
                    className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {tx('Άνοιγμα συνομιλίας', 'Open chat')}
                  </button>
                </div>
              )}
            </div>
          </section>
        </Panel>

        <Separator className="w-2 bg-transparent hover:bg-brand-500/20 active:bg-brand-500/30 transition-colors cursor-col-resize" />

        {/* ============================== STUDIO =============================== */}
        {studioToolOpen ? (
          <StudyWorkspaceToolSurface model={model} />
        ) : (
          <Panel
            id="nb-studio"
            defaultSize={32}
            minSize={20}
            className="flex h-full min-h-0 flex-col overflow-hidden"
          >
            <section
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
              aria-label="Studio"
              data-testid="notebook-studio-panel"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
                <h2 className="text-sm font-semibold text-text-primary">Studio</h2>
                <span className="type-micro text-text-muted">
                  {tx('Εργαλεία με βοήθεια AI', 'AI-assisted tools')}
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2" data-testid="notebook-studio-grid">
                  {STUDIO_TOOLS.map(({ id, icon: Icon }) => (
                    <div key={id} className="relative">
                      <button
                        type="button"
                        onClick={() => openStudioTool(id)}
                        data-testid={`studio-card-${id}`}
                        title={workspaceToolDescription(id, lang)}
                        className="flex w-full flex-col items-start gap-2 rounded-xl border border-border-subtle bg-surface-secondary/50 px-3 py-3 text-left hover:bg-surface-hover hover:border-brand-200 transition-colors min-h-[76px]"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100/80 text-brand-800">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-medium text-text-primary leading-tight">
                          {workspaceToolLabel(id, lang)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => askAiForTool(id)}
                        data-testid={`studio-card-ai-${id}`}
                        title={tx('Ζήτα βοήθεια από το AI', 'Ask AI for help')}
                        aria-label={`${workspaceToolLabel(id, lang)} — ${tx('Ζήτα βοήθεια από το AI', 'Ask AI for help')}`}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-brand-100/80 hover:text-brand-800 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </Panel>
        )}
      </Group>

      {/* Slim rail to return from an open tool to the Studio cards */}
      {studioToolOpen && (
        <div className="flex w-10 shrink-0 flex-col items-center gap-2 border-l border-border-subtle bg-surface-card py-3">
          <button
            type="button"
            onClick={() => setStudioToolOpen(false)}
            title={tx('Πίσω στο Studio', 'Back to Studio')}
            aria-label={tx('Πίσω στο Studio', 'Back to Studio')}
            data-testid="notebook-studio-rail-back"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-brand-800 transition-colors"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
