import { useCallback, useEffect, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  ChevronRight, FileText, LayoutGrid, MessageSquare, Pin, Plus, RefreshCw, Sparkles,
} from '@/lib/lucide-shim';
import { cn } from '../../../utils/cn';
import {
  WORKSPACE_TOOLS,
  workspaceToolDescription,
  workspaceToolLabel,
} from '../../../lib/workspaceToolRegistry';
import { buildToolDefaultAgentPrompt } from '../../../lib/workspaceToolAgentPrompts';
import { needsSourceThumbnailReprocessHint } from '../../../lib/sourceThumbnail';
import type { UploadedFile } from '../../../types';
import { StudyWorkspaceToolSurface } from './StudyWorkspaceToolSurface';
import { NotebookSourceThumbnail } from './NotebookSourceThumbnail';
import { NotebookStudioAudioOverview, type AudioOverviewGenState } from './NotebookStudioAudioOverview';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import type { WorkspaceTool } from './types';

interface NotebookWorkspaceLayoutProps {
  model: StudyWorkspaceModel;
}

type StudioGenState = 'idle' | 'running' | 'done' | 'error';

type MobileTab = 'sources' | 'chat' | 'studio';

/** Reader lives in the Sources column; every other tool becomes a Studio card. */
const STUDIO_TOOLS = WORKSPACE_TOOLS.filter((tool) => tool.id !== 'reader');

/**
 * NotebookLM-style 3-panel workspace: Sources (left) | AI chat (center) | Studio (right).
 * Mobile: bottom tabs Sources | Chat | Studio.
 */
export function NotebookWorkspaceLayout({ model }: NotebookWorkspaceLayoutProps) {
  const {
    lang,
    isMobile,
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
    userSettings,
    openReprocessWizard,
    handleToolUpload,
    handleReuploadMaterial,
    openWorkspaceTool,
    openAgentForTool,
    handleOpenAgent,
    renderCenterAgent,
    sourceHighlight,
    currentStep,
    STEPS,
  } = model;

  const tx = useCallback(
    (el: string, en: string) => (lang === 'el' ? el : en),
    [lang],
  );

  const [studioToolOpen, setStudioToolOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [activeSourceKey, setActiveSourceKey] = useState<string | null>(null);
  const [studioGen, setStudioGen] = useState<Partial<Record<string, StudioGenState>>>({});
  const [audioOverviewGen, setAudioOverviewGen] = useState<AudioOverviewGenState>('idle');
  const concept = effectiveFocus?.term ?? quizConcept;
  const sectionTitle = STEPS[currentStep]?.title;
  const notebookTitle = courseName ?? linkedCourse?.title ?? quizConcept;
  const showQualityStrip =
    (showReuploadHint || showLowQualityBanner) && sourceQualityScore != null;

  const openStudioTool = useCallback(
    (tool: WorkspaceTool) => {
      openWorkspaceTool(tool);
      setStudioToolOpen(true);
      if (isMobile) setMobileTab('studio');
    },
    [openWorkspaceTool, isMobile],
  );

  const askAiForTool = useCallback(
    (tool: WorkspaceTool) => {
      const prompt = buildToolDefaultAgentPrompt(tool, lang, concept, sectionTitle);
      openStudioTool(tool);
      openAgentForTool(tool, prompt);
      if (isMobile) setMobileTab('chat');
    },
    [lang, concept, sectionTitle, openStudioTool, openAgentForTool, isMobile],
  );

  const runStudioQuickAction = useCallback(
    (actionId: 'quiz-from-source' | 'mindmap-from-source', tool: WorkspaceTool) => {
      setStudioGen((prev) => ({ ...prev, [actionId]: 'running' }));
      openStudioTool(tool);
      const prompt =
        actionId === 'quiz-from-source'
          ? (lang === 'el'
            ? `Φτιάξε ένα κουίζ με ερωτήσεις active recall από τις πηγές μου για «${concept ?? notebookTitle}».`
            : `Create an active-recall quiz from my sources for "${concept ?? notebookTitle}".`)
          : (lang === 'el'
            ? `Δημιούργησε χάρτη εννοιών από τις πηγές μου για «${concept ?? notebookTitle}» με κεντρικές έννοιες και σχέσεις.`
            : `Build a concept map from my sources for "${concept ?? notebookTitle}" with key concepts and relations.`);
      openAgentForTool(tool, prompt);
      if (isMobile) setMobileTab('chat');
      window.setTimeout(() => {
        setStudioGen((prev) => ({ ...prev, [actionId]: 'done' }));
      }, 600);
    },
    [lang, concept, notebookTitle, openStudioTool, openAgentForTool, isMobile],
  );

  const openSourceGuide = useCallback(() => {
    openStudioTool('reader');
    const prompt =
      lang === 'el'
        ? `Δώσε μου έναν σύντομο οδηγό πηγής για το «${notebookTitle}»: τα βασικά θέματα, τις κεντρικές έννοιες και 3 προτεινόμενες ερωτήσεις μελέτης, με βάση τις πηγές μου.`
        : `Give me a brief source guide for "${notebookTitle}": the key topics, the central concepts and 3 suggested study questions, grounded in my sources.`;
    openAgentForTool('reader', prompt);
    if (isMobile) setMobileTab('chat');
  }, [lang, notebookTitle, openStudioTool, openAgentForTool, isMobile]);

  const addSource = useCallback(() => {
    if (noteBundle.hasSource) {
      handleReuploadMaterial();
    } else {
      handleToolUpload?.();
    }
  }, [noteBundle.hasSource, handleReuploadMaterial, handleToolUpload]);

  /** Citation jump from embedded chat → reader overlay with highlight. */
  useEffect(() => {
    if (!sourceHighlight) return;
    openStudioTool('reader');
  }, [sourceHighlight, openStudioTool]);

  const readerOpen = studioToolOpen && activeTool === 'reader';

  type SourceRow = {
    key: string;
    label: string;
    meta?: string;
    file?: Pick<UploadedFile, 'name' | 'type' | 'ingestMethod'> & Partial<
      Pick<UploadedFile, 'id' | 'thumbnailRef' | 'thumbnailStatus'>
    >;
  };

  const sourceRows: SourceRow[] = noteBundle.hasSource
    ? (courseSourceFiles.length > 0
      ? courseSourceFiles.map((file) => ({
          key: file.id,
          label: file.name,
          meta: file.pageCount ? `${file.pageCount} ${tx('σελ.', 'pages')}` : undefined,
          file,
        }))
      : [{
          key: 'bundle',
          label: noteBundle.sourceName ?? notebookTitle,
          meta: undefined,
          file: { name: noteBundle.sourceName ?? notebookTitle, type: 'txt' as const },
        }]
    )
    : [];

  const pinnedSourceKey = activeSourceKey ?? sourceRows[0]?.key ?? null;
  const orderedSourceRows = pinnedSourceKey
    ? [
        ...sourceRows.filter((s) => s.key === pinnedSourceKey),
        ...sourceRows.filter((s) => s.key !== pinnedSourceKey),
      ]
    : sourceRows;

  const openSourceReader = useCallback(
    (sourceKey: string) => {
      setActiveSourceKey(sourceKey);
      openStudioTool('reader');
    },
    [openStudioTool],
  );

  const sourcesBody = (
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

          <ul className="space-y-1.5" data-testid="notebook-source-list">
            {orderedSourceRows.map((source) => {
              const isPinned = source.key === pinnedSourceKey;
              const isReaderActive = readerOpen && isPinned;
              return (
              <li key={source.key}>
                <div
                  className={cn(
                    'rounded-xl px-2.5 py-2 transition-colors',
                    isReaderActive
                      ? 'bg-brand-100/80 text-brand-800'
                      : isPinned
                        ? 'bg-surface-secondary/80 text-text-primary ring-1 ring-brand-200/60'
                        : 'text-text-secondary',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openSourceReader(source.key)}
                    aria-current={isReaderActive ? 'true' : undefined}
                    data-testid={`notebook-source-row-${source.key}`}
                    data-pinned={isPinned ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 text-left transition-colors',
                      !isReaderActive && !isPinned && 'hover:text-text-primary',
                    )}
                  >
                    {isPinned && (
                      <Pin
                        className="h-3 w-3 shrink-0 text-brand-700"
                        aria-hidden
                        data-testid={`notebook-source-pinned-${source.key}`}
                      />
                    )}
                    <NotebookSourceThumbnail file={source.file} label={source.label} settings={userSettings} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{source.label}</span>
                      {source.meta && (
                        <span className="block type-micro text-text-muted">{source.meta}</span>
                      )}
                    </span>
                  </button>
                  {needsSourceThumbnailReprocessHint(source.file) && (
                    <button
                      type="button"
                      onClick={() => openReprocessWizard()}
                      data-testid="source-thumbnail-reprocess-hint"
                      className="mt-0.5 ml-11 block type-micro font-medium text-brand-700 hover:text-brand-800 hover:underline text-left"
                    >
                      {tx('Επανεπεξεργασία για προεπισκόπηση', 'Reprocess for preview')}
                    </button>
                  )}
                </div>
              </li>
              );
            })}
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
  );

  const sourcesFooter = showQualityStrip ? (
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
  ) : null;

  const chatBody = (
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
  );

  const studioQuickActions = noteBundle.hasSource ? (
    <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1 shrink-0" data-testid="notebook-studio-quick-actions">
      <button
        type="button"
        data-testid="studio-action-quiz-from-source"
        data-generation-state={studioGen['quiz-from-source'] ?? 'idle'}
        disabled={studioGen['quiz-from-source'] === 'running'}
        onClick={() => runStudioQuickAction('quiz-from-source', 'quiz')}
        className="flex items-center gap-1 rounded-full border border-border-subtle bg-surface-secondary/60 px-2.5 py-1 type-micro font-medium text-text-secondary hover:border-brand-200 hover:text-brand-800 transition-colors disabled:opacity-60"
      >
        <Sparkles className="h-3 w-3" />
        {studioGen['quiz-from-source'] === 'running'
          ? tx('Δημιουργία…', 'Generating…')
          : tx('Φτιάξε κουίζ', 'Create quiz')}
      </button>
      <button
        type="button"
        data-testid="studio-action-mindmap-from-source"
        data-generation-state={studioGen['mindmap-from-source'] ?? 'idle'}
        disabled={studioGen['mindmap-from-source'] === 'running'}
        onClick={() => runStudioQuickAction('mindmap-from-source', 'concept-map')}
        className="flex items-center gap-1 rounded-full border border-border-subtle bg-surface-secondary/60 px-2.5 py-1 type-micro font-medium text-text-secondary hover:border-brand-200 hover:text-brand-800 transition-colors disabled:opacity-60"
      >
        <Sparkles className="h-3 w-3" />
        {studioGen['mindmap-from-source'] === 'running'
          ? tx('Δημιουργία…', 'Generating…')
          : tx('Mind map από πηγή', 'Mind map from source')}
      </button>
      {linkedCourse && (linkedCourse.topics?.length ?? 0) > 0 && (
        <NotebookStudioAudioOverview
          course={linkedCourse}
          lang={lang}
          userSettings={userSettings}
          genState={audioOverviewGen}
          onGenStateChange={setAudioOverviewGen}
        />
      )}
    </div>
  ) : null;

  const studioAskAiRail = (
    <button
      type="button"
      onClick={() => askAiForTool(activeTool)}
      title={tx('Ρώτα το AI', 'Ask AI')}
      aria-label={tx('Ρώτα το AI για το ενεργό εργαλείο', 'Ask AI about the active tool')}
      data-testid="notebook-studio-ask-ai-rail"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100/80 transition-colors"
    >
      <Sparkles className="h-4 w-4" />
    </button>
  );

  const studioGrid = (
    <div className="flex-1 min-h-0 overflow-y-auto p-3">
      {studioQuickActions}
      <div className="grid grid-cols-2 gap-2" data-testid="notebook-studio-grid">
        {STUDIO_TOOLS.map(({ id, icon: Icon }) => {
          const genKey = id === 'quiz' ? 'quiz-from-source' : id === 'concept-map' ? 'mindmap-from-source' : null;
          const genState = genKey ? studioGen[genKey] : undefined;
          return (
          <div key={id} className="relative">
            <button
              type="button"
              onClick={() => openStudioTool(id)}
              data-testid={`studio-card-${id}`}
              data-generation-state={genState ?? 'idle'}
              title={workspaceToolDescription(id, lang)}
              className="flex w-full flex-col items-start gap-2 rounded-xl border border-border-subtle bg-surface-secondary/50 px-3 py-3 text-left hover:bg-surface-hover hover:border-brand-200 transition-colors min-h-[76px]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100/80 text-brand-800">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-text-primary leading-tight">
                {workspaceToolLabel(id, lang)}
              </span>
              {genState === 'running' && (
                <span className="type-micro text-brand-700">{tx('Δημιουργία…', 'Generating…')}</span>
              )}
              {genState === 'done' && (
                <span className="type-micro text-accent-emerald">{tx('Έτοιμο', 'Ready')}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => askAiForTool(id)}
              data-testid={`studio-card-ai-${id}`}
              title={buildToolDefaultAgentPrompt(id, lang, concept, sectionTitle)}
              aria-label={`${workspaceToolLabel(id, lang)} — ${tx('Ζήτα βοήθεια από το AI', 'Ask AI for help')}`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-brand-100/80 hover:text-brand-800 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );

  const mobileTabs = (
    <nav
      className="flex shrink-0 border-t border-border-subtle bg-surface-card"
      aria-label={tx('Πλοήγηση notebook', 'Notebook navigation')}
      data-testid="notebook-mobile-tabs"
    >
      {([
        { id: 'sources' as const, label: tx('Πηγές', 'Sources'), icon: FileText },
        { id: 'chat' as const, label: tx('Συνομιλία', 'Chat'), icon: MessageSquare },
        { id: 'studio' as const, label: 'Studio', icon: LayoutGrid },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMobileTab(id)}
          data-testid={`notebook-tab-${id}`}
          aria-current={mobileTab === id ? 'page' : undefined}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            mobileTab === id
              ? 'text-brand-700 bg-brand-50/80'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );

  if (isMobile) {
    return (
      <div
        className="relative z-10 flex flex-1 flex-col overflow-hidden bg-surface-secondary/60"
        id="workspace-main"
        role="main"
        tabIndex={-1}
        data-testid="notebook-workspace-layout"
        data-layout="mobile"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 pb-0">
          {studioToolOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
              <StudyWorkspaceToolSurface model={model} />
            </div>
          ) : (
            <>
              {mobileTab === 'sources' && (
                <section
                  className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
                  data-testid="notebook-sources-panel"
                >
                  <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
                    <h2 className="text-sm font-semibold text-text-primary">{tx('Πηγές', 'Sources')}</h2>
                    <button type="button" onClick={addSource} data-testid="notebook-add-source" className="flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-1 type-micro font-medium text-text-secondary">
                      <Plus className="h-3.5 w-3.5" />
                      {tx('Προσθήκη', 'Add')}
                    </button>
                  </header>
                  {sourcesBody}
                  {sourcesFooter}
                </section>
              )}
              {mobileTab === 'chat' && (
                <section
                  className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
                  data-testid="notebook-chat-panel"
                >
                  <header className="border-b border-border-subtle px-4 py-3 shrink-0">
                    <h2 className="text-sm font-semibold text-text-primary">{tx('Συνομιλία', 'Chat')}</h2>
                  </header>
                  {chatBody}
                </section>
              )}
              {mobileTab === 'studio' && (
                <section
                  className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
                  data-testid="notebook-studio-panel"
                >
                  <header className="border-b border-border-subtle px-4 py-3 shrink-0">
                    <h2 className="text-sm font-semibold text-text-primary">Studio</h2>
                  </header>
                  {studioGrid}
                </section>
              )}
            </>
          )}
        </div>
        {studioToolOpen ? (
          <div className="flex shrink-0 flex-col gap-1 px-2 pb-1">
            {studioAskAiRail}
            <button
              type="button"
              onClick={() => setStudioToolOpen(false)}
              data-testid="notebook-studio-rail-back"
              className="flex items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-card py-2 text-xs text-text-secondary"
            >
              <LayoutGrid className="h-4 w-4" />
              {tx('Πίσω στο Studio', 'Back to Studio')}
            </button>
          </div>
        ) : mobileTabs}
      </div>
    );
  }

  return (
    <div
      className="relative z-10 flex-1 flex overflow-hidden bg-surface-secondary/60"
      id="workspace-main"
      role="main"
      tabIndex={-1}
      data-testid="notebook-workspace-layout"
      data-layout="desktop"
    >
      <Group orientation="horizontal" className="flex-1 min-h-0 w-full h-full p-2 gap-0">
        <Panel id="nb-sources" defaultSize={22} minSize={14} className="flex h-full min-h-0 flex-col overflow-hidden">
          <section
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
            aria-label={tx('Πηγές', 'Sources')}
            data-testid="notebook-sources-panel"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">{tx('Πηγές', 'Sources')}</h2>
              <button type="button" onClick={addSource} data-testid="notebook-add-source" className="flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-1 type-micro font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" />
                {tx('Προσθήκη', 'Add')}
              </button>
            </header>
            {sourcesBody}
            {sourcesFooter}
          </section>
        </Panel>

        <Separator className="w-2 bg-transparent hover:bg-brand-500/20 active:bg-brand-500/30 transition-colors cursor-col-resize" />

        <Panel id="nb-chat" defaultSize={46} minSize={28} className="flex h-full min-h-0 flex-col overflow-hidden">
          <section
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
            aria-label={tx('Συνομιλία', 'Chat')}
            data-testid="notebook-chat-panel"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">{tx('Συνομιλία', 'Chat')}</h2>
              <span className="type-micro text-text-muted truncate">
                {noteBundle.hasSource
                  ? tx('Θεμελιωμένη στις πηγές σου', 'Grounded in your sources')
                  : tx('Χωρίς πηγές ακόμα', 'No sources yet')}
              </span>
            </header>
            {chatBody}
          </section>
        </Panel>

        <Separator className="w-2 bg-transparent hover:bg-brand-500/20 active:bg-brand-500/30 transition-colors cursor-col-resize" />

        {studioToolOpen ? (
          <StudyWorkspaceToolSurface model={model} />
        ) : (
          <Panel id="nb-studio" defaultSize={32} minSize={20} className="flex h-full min-h-0 flex-col overflow-hidden">
            <section
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card"
              aria-label="Studio"
              data-testid="notebook-studio-panel"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 shrink-0">
                <h2 className="text-sm font-semibold text-text-primary">Studio</h2>
                <span className="type-micro text-text-muted">{tx('Εργαλεία με βοήθεια AI', 'AI-assisted tools')}</span>
              </header>
              {studioGrid}
            </section>
          </Panel>
        )}
      </Group>

      {studioToolOpen && (
        <div className="flex w-10 shrink-0 flex-col items-center gap-2 border-l border-border-subtle bg-surface-card py-3">
          {studioAskAiRail}
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
