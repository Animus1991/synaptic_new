import { useCallback, useEffect, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  ChevronRight, FileText, LayoutGrid, MessageSquare, Plus, RefreshCw,
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
import { PdfPageThumbnailStrip } from '../PdfPageThumbnailStrip';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import type { WorkspaceTool } from './types';
import { useMinimalTheme } from '../../../lib/useMinimalTheme';
import { isWorkspacePhoneWidth } from '../../../lib/workspaceViewport';
import { InfoHint } from '../../ui/InfoHint';
import { useI18n } from '../../../lib/i18n';
import { useAppStore } from '../../../store/useStore';

interface NotebookWorkspaceLayoutProps {
  model: StudyWorkspaceModel;
}

type StudioGenState = 'idle' | 'running' | 'done' | 'error';

type MobileTab = 'sources' | 'chat' | 'studio';

/** OPT-N1 / OPT-K67 — phone tabs only below 768; tablet+desktop get multi-panel. */
type NotebookViewport = 'phone' | 'tablet' | 'desktop';

function resolveNotebookViewport(width: number): NotebookViewport {
  if (isWorkspacePhoneWidth(width)) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/** Reader lives in the Sources column; every other tool becomes a Studio card. */
const STUDIO_TOOLS = WORKSPACE_TOOLS.filter((tool) => tool.id !== 'reader');

/**
 * NotebookLM-style 3-panel workspace: Sources (left) | AI chat (center) | Studio (right).
 * Mobile: bottom tabs Sources | Chat | Studio.
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
    showPre24Greek,
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
    effectiveCourseId,
  } = model;

  const { openNoteAnalysis, closeStudyWorkspace } = useAppStore();
  const { t } = useI18n();

  const tx = useCallback(
    (el: string, en: string) => (lang === 'el' ? el : en),
    [lang],
  );
  /** OPT-C4 — chat column inherits ChatGPT-calm under Minimal. */
  const notebookCalm = useMinimalTheme();

  const [nbViewport, setNbViewport] = useState<NotebookViewport>(() =>
    typeof window !== 'undefined' ? resolveNotebookViewport(window.innerWidth) : 'desktop',
  );
  const phoneLayout = nbViewport === 'phone';

  useEffect(() => {
    const onResize = () => setNbViewport(resolveNotebookViewport(window.innerWidth));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [studioToolOpen, setStudioToolOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [activeSourceKey, setActiveSourceKey] = useState<string | null>(null);
  const [pdfPageIndex, setPdfPageIndex] = useState(0);
  const [studioGen, setStudioGen] = useState<Partial<Record<string, StudioGenState>>>({});
  const [audioOverviewGen, setAudioOverviewGen] = useState<AudioOverviewGenState>('idle');
  const concept = effectiveFocus?.term ?? quizConcept;
  const sectionTitle = STEPS[currentStep]?.title;
  const notebookTitle = courseName ?? linkedCourse?.title ?? quizConcept;
  /** OPT-N3 — quality strip always present when sources exist (not only low-quality). */
  const showQualityStrip = noteBundle.hasSource;

  const openSourceCheck = useCallback(() => {
    if (effectiveCourseId) {
      closeStudyWorkspace();
      openNoteAnalysis(effectiveCourseId);
      return;
    }
    openReprocessWizard();
  }, [effectiveCourseId, closeStudyWorkspace, openNoteAnalysis, openReprocessWizard]);

  const openStudioTool = useCallback(
    (tool: WorkspaceTool) => {
      openWorkspaceTool(tool);
      setStudioToolOpen(true);
      if (phoneLayout) setMobileTab('studio');
    },
    [openWorkspaceTool, phoneLayout],
  );

  const askAiForTool = useCallback(
    (tool: WorkspaceTool) => {
      const prompt = buildToolDefaultAgentPrompt(tool, lang, concept, sectionTitle);
      openStudioTool(tool);
      openAgentForTool(tool, prompt);
      if (phoneLayout) setMobileTab('chat');
    },
    [lang, concept, sectionTitle, openStudioTool, openAgentForTool, phoneLayout],
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
      if (phoneLayout) setMobileTab('chat');
      setStudioGen((prev) => ({ ...prev, [actionId]: 'idle' }));
    },
    [lang, concept, notebookTitle, openStudioTool, openAgentForTool, phoneLayout],
  );

  const openSourceGuide = useCallback(() => {
    openStudioTool('reader');
    const prompt =
      lang === 'el'
        ? `Δώσε μου έναν σύντομο οδηγό πηγής για το «${notebookTitle}»: τα βασικά θέματα, τις κεντρικές έννοιες και 3 προτεινόμενες ερωτήσεις μελέτης, με βάση τις πηγές μου.`
        : `Give me a brief source guide for "${notebookTitle}": the key topics, the central concepts and 3 suggested study questions, grounded in my sources.`;
    openAgentForTool('reader', prompt);
    if (phoneLayout) setMobileTab('chat');
  }, [lang, notebookTitle, openStudioTool, openAgentForTool, phoneLayout]);

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
      Pick<UploadedFile, 'id' | 'thumbnailRef' | 'thumbnailStatus' | 'pageCount'>
    >;
  };

  const sourceRows: SourceRow[] = noteBundle.hasSource
    ? (courseSourceFiles.length > 0
      ? courseSourceFiles.map((file) => ({
          key: file.id,
          label: file.name,
          meta: file.pageCount
            ? (file.type === 'pdf'
              ? tx(`PDF · ${file.pageCount} σελίδες`, `PDF · ${file.pageCount} pages`)
              : tx(`${file.pageCount} σελίδες`, `${file.pageCount} pages`))
            : (file.type === 'pdf' ? 'PDF' : undefined),
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

  const openPdfPage = useCallback(
    (pageIndex: number) => {
      setPdfPageIndex(pageIndex);
      const key = pinnedSourceKey ?? sourceRows[0]?.key;
      if (key) setActiveSourceKey(key);
      openStudioTool('reader');
    },
    [openStudioTool, pinnedSourceKey, sourceRows],
  );

  /* OPT-K137/K138 — Sources: files first; secondary actions collapsed; no purpose stack */
  const sourcesBody = (
    <div className="flex-1 min-h-0 overflow-y-auto p-2">
      {noteBundle.hasSource ? (
        <>
          <ul className="space-y-1.5" data-testid="notebook-source-list">
            {orderedSourceRows.map((source) => {
              const isPinned = source.key === pinnedSourceKey;
              const isReaderActive = readerOpen && isPinned;
              return (
              <li key={source.key}>
                <div
                  className={cn(
                    /* OPT-K126 — wash source rows (no ring/outline cage) */
                    'rounded-xl border-0 px-2.5 py-2 transition-colors',
                    isReaderActive
                      ? 'bg-surface-secondary text-text-primary'
                      : isPinned
                        ? 'bg-surface-secondary/70 text-text-primary'
                        : 'bg-transparent text-text-secondary hover:bg-surface-secondary/40',
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
                    <NotebookSourceThumbnail file={source.file} label={source.label} settings={userSettings} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate type-caption font-medium">{source.label}</span>
                      {source.meta && (
                        <span className="block type-caption text-text-secondary">{source.meta}</span>
                      )}
                      {isReaderActive && (
                        <span className="block type-caption text-text-muted">
                          {tx('Ανοιχτό στον αναγνώστη', 'Open in reader')}
                        </span>
                      )}
                    </span>
                  </button>
                  {needsSourceThumbnailReprocessHint(source.file) && (
                    <button
                      type="button"
                      onClick={() => openReprocessWizard()}
                      data-testid="source-thumbnail-reprocess-hint"
                      className="mt-0.5 ml-11 block type-caption font-medium text-text-secondary hover:text-text-primary hover:underline text-left"
                    >
                      {tx('Επανεπεξεργασία για προεπισκόπηση', 'Reprocess for preview')}
                    </button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>

          <details className="group mt-2 rounded-xl border-0 bg-surface-secondary/40 px-2.5 py-1.5" data-testid="notebook-sources-more">
            <summary className="cursor-pointer type-caption font-medium text-text-secondary hover:text-text-primary list-none flex items-center justify-between gap-2">
              <span>{tx('Περισσότερα', 'More')}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="mt-2 space-y-2 pb-1">
              <button
                type="button"
                onClick={openSourceGuide}
                data-testid="notebook-source-guide"
                className="flex w-full items-center justify-between gap-2 rounded-lg border-0 bg-surface-secondary/55 px-2.5 py-2 text-left hover:bg-surface-hover transition-colors"
              >
                <span className="type-caption font-medium text-text-secondary truncate">
                  {tx('Σύνοψη αρχείου', 'File summary')}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
              </button>
              {(() => {
                const pinned = orderedSourceRows.find((s) => s.key === pinnedSourceKey)?.file;
                const pages = pinned?.pageCount ?? 0;
                if (!pinned || pinned.type !== 'pdf' || pages <= 1) return null;
                return (
                  <div className="space-y-1" data-testid="notebook-pdf-page-strip">
                    <p className="type-caption font-medium text-text-secondary px-0.5">
                      {t('agentPdfPagesLabel')}
                    </p>
                    <PdfPageThumbnailStrip
                      pageCount={pages}
                      activePageIndex={pdfPageIndex}
                      onSelectPage={openPdfPage}
                      lang={lang === 'el' ? 'el' : 'en'}
                      className="notebook-pdf-page-strip"
                    />
                  </div>
                );
              })()}
            </div>
          </details>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="type-meta font-medium text-text-primary">
            {tx('Πρόσθεσε το υλικό σου', 'Add your material')}
          </p>
          <button
            type="button"
            onClick={() => handleToolUpload?.()}
            className="rounded-full bg-brand-600 px-3.5 py-1.5 type-caption font-medium text-white hover:bg-brand-700 transition-colors"
          >
            {tx('Προσθήκη πηγής', 'Add source')}
          </button>
        </div>
      )}
    </div>
  );

  const sourcesFooter = showQualityStrip ? (
    <footer className="flex items-center justify-between gap-2 border-t border-transparent px-3 py-2 shrink-0">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={openSourceCheck}
          title={tx('Άνοιγμα ανάλυσης πηγής', 'Open source analysis')}
          className="ws-pill type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer text-left"
          data-testid="notebook-source-quality"
        >
          {showPre24Greek
            ? tx('Προ-v2.4 ελληνικά', 'Pre-v2.4 Greek')
            : sourceQualityScore != null
              ? `${sourceQualityScore}% ${tx('ποιότητα πηγής', 'source quality')}`
              : tx('Έλεγχος πηγής', 'Source check')}
        </button>
        <InfoHint
          label={t('agentSourceQualityHint')}
          triggerAriaLabel={tx('Τι σημαίνει ποιότητα πηγής', 'What source quality means')}
          data-testid="notebook-source-quality-hint"
          maxWidth={280}
        />
      </div>
      <button
        type="button"
        onClick={openReprocessWizard}
        disabled={reprocessingMaterial}
        data-testid="notebook-source-reprocess"
        title={t('agentSourceQualityHint')}
        className="flex min-h-9 items-center gap-1 type-caption font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 px-1"
      >
        {reprocessingMaterial && (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
        )}
        {reprocessingMaterial ? tx('Επεξεργασία…', 'Processing…') : tx('Επανεπεξεργασία', 'Reprocess')}
      </button>
    </footer>
  ) : null;

  const chatBody = (
    <div className="flex-1 min-h-0 overflow-hidden">
      {renderCenterAgent ? (
        renderCenterAgent()
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="type-meta font-semibold text-text-primary">
            {tx('Ρώτησε για το υλικό σου', 'Ask about your material')}
          </p>
          <p className="type-caption text-text-secondary max-w-sm leading-snug">
            {tx(
              'Απαντήσεις από τις πηγές σου, με παραπομπή στο σημείο του κειμένου.',
              'Answers from your sources, with citations back to the text.',
            )}
          </p>
          <button
            type="button"
            onClick={handleOpenAgent}
            data-testid="notebook-chat-launcher"
            className="rounded-full bg-brand-600 px-4 py-2 type-caption font-medium text-white hover:bg-brand-700 transition-colors"
          >
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
        className="rounded-full border-0 bg-surface-secondary/70 px-2.5 py-1 type-micro font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors disabled:opacity-60"
      >
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
        className="rounded-full border-0 bg-surface-secondary/70 px-2.5 py-1 type-micro font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors disabled:opacity-60"
      >
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
      className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1 type-micro font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
    >
      AI
    </button>
  );

  const studioGrid = (
    <div className="flex-1 min-h-0 overflow-y-auto p-3">
      {/* OPT-K138 — title-only studio cards; description via title/hover */}
      {studioQuickActions}
      <div
        className={cn(
          'grid gap-2',
          phoneLayout ? 'grid-cols-2 min-[400px]:grid-cols-3' : 'grid-cols-2 xl:grid-cols-3',
        )}
        data-testid="notebook-studio-grid"
      >
        {STUDIO_TOOLS.map(({ id }) => {
          const genKey = id === 'quiz' ? 'quiz-from-source' : id === 'concept-map' ? 'mindmap-from-source' : null;
          const genState = genKey ? studioGen[genKey] : undefined;
          return (
          <div key={id} className="relative">
            <button
              type="button"
              onClick={() => openStudioTool(id)}
              data-testid={`studio-card-${id}`}
              data-generation-state={genState ?? 'idle'}
              data-active={studioToolOpen && activeTool === id ? 'true' : undefined}
              aria-pressed={studioToolOpen && activeTool === id}
              title={workspaceToolDescription(id, lang)}
              className={cn(
                /* OPT-K126 — denser wash studio cards (no outline / ring cage) */
                'flex w-full flex-col items-start justify-center gap-0.5 rounded-xl border-0 px-2.5 py-2.5 pr-9 text-left transition-colors min-h-[3.25rem]',
                studioToolOpen && activeTool === id
                  ? 'bg-surface-secondary text-text-primary'
                  : 'bg-surface-secondary/45 hover:bg-surface-hover',
              )}
            >
              <span className="type-caption font-medium text-text-primary leading-tight">
                {workspaceToolLabel(id, lang)}
              </span>
              {genState === 'running' && (
                <span className="type-micro text-text-secondary">{tx('Δημιουργία…', 'Generating…')}</span>
              )}
              {genState === 'done' && (
                <span className="type-micro text-text-secondary">{tx('Έτοιμο', 'Ready')}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => askAiForTool(id)}
              data-testid={`studio-card-ai-${id}`}
              title={buildToolDefaultAgentPrompt(id, lang, concept, sectionTitle)}
              aria-label={`${workspaceToolLabel(id, lang)} — ${tx('Ζήτα βοήθεια από το AI', 'Ask AI for help')}`}
              className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-md px-1 type-micro font-semibold text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
            >
              AI
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );

  const mobileTabs = (
    <nav
      className="flex shrink-0 border-t border-transparent bg-surface-card"
      aria-label={tx('Πλοήγηση notebook', 'Notebook navigation')}
      data-testid="notebook-mobile-tabs"
    >
      {([
        {
          id: 'sources' as const,
          label: notebookCalm ? tx('Αρχεία', 'Files') : tx('Πηγές', 'Sources'),
          icon: FileText,
        },
        {
          id: 'chat' as const,
          label: notebookCalm ? tx('Βοηθός', 'Tutor') : tx('Συνομιλία', 'Chat'),
          icon: MessageSquare,
        },
        {
          id: 'studio' as const,
          label: notebookCalm ? tx('Εργαλεία', 'Tools') : 'Studio',
          icon: LayoutGrid,
        },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMobileTab(id)}
          data-testid={`notebook-tab-${id}`}
          aria-current={mobileTab === id ? 'page' : undefined}
          className={cn(
            'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 type-caption font-medium transition-colors',
            mobileTab === id
              ? 'text-text-secondary bg-surface-secondary'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover',
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );

  if (phoneLayout) {
    return (
      <div
        className={cn(
          'relative z-10 flex flex-1 flex-col overflow-hidden bg-surface-secondary/60',
          notebookCalm && 'notebook-calm notebook-canvas',
        )}
        id="workspace-main"
        role="main"
        tabIndex={-1}
        data-testid="notebook-workspace-layout"
        data-layout="phone"
        data-border-diet="cta-only"
        data-type-rhythm="dashboard"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 pb-0">
          {studioToolOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-surface-card shadow-none">
              <StudyWorkspaceToolSurface model={model} />
            </div>
          ) : (
            <>
              {mobileTab === 'sources' && (
                <section
                  className="flex h-full min-h-0 flex-col overflow-hidden workspace-glass-panel rounded-2xl border-0 bg-surface-card shadow-none"
                  data-testid="notebook-sources-panel"
                >
                  <header className="flex items-center justify-between gap-2 border-b border-transparent px-4 py-3 shrink-0">
                    <h2 className="type-caption font-semibold text-text-primary">
                      {notebookCalm ? tx('Τα αρχεία σου', 'Your files') : tx('Πηγές', 'Sources')}
                    </h2>
                    <button type="button" onClick={addSource} data-testid="notebook-add-source" className="flex items-center gap-1 rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover">
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
                  className="flex h-full min-h-0 flex-col overflow-hidden workspace-glass-panel rounded-2xl border-0 bg-surface-card shadow-none"
                  data-testid="notebook-chat-panel"
                >
                  <header className="border-b border-transparent px-4 py-3 shrink-0">
                    <h2 className="type-caption font-semibold text-text-primary">
                      {notebookCalm ? tx('Βοηθός', 'Tutor') : tx('Συνομιλία', 'Chat')}
                    </h2>
                  </header>
                  {chatBody}
                </section>
              )}
              {mobileTab === 'studio' && (
                <section
                  className="flex h-full min-h-0 flex-col overflow-hidden workspace-glass-panel rounded-2xl border-0 bg-surface-card shadow-none"
                  data-testid="notebook-studio-panel"
                >
                  <header className="border-b border-transparent px-4 py-3 shrink-0">
                    <h2 className="type-caption font-semibold text-text-primary">
                      {notebookCalm ? tx('Εργαλεία μελέτης', 'Study tools') : 'Studio'}
                    </h2>
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
              className="flex items-center justify-center gap-1 rounded-lg border-0 bg-surface-secondary/70 py-2 type-caption text-text-secondary"
            >
              <LayoutGrid className="h-4 w-4" />
              {tx('Πίσω στο Studio', 'Back to Studio')}
            </button>
          </div>
        ) : mobileTabs}
      </div>
    );
  }

  const chatGrounding = noteBundle.hasSource
    ? tx('Απαντά με βάση τις σημειώσεις σου', 'Answers from your notes')
    : tx('Χωρίς πηγές ακόμα', 'No sources yet');

  return (
    <div
      className={cn(
        'relative z-10 flex-1 flex overflow-hidden bg-surface-secondary/60',
        notebookCalm && 'notebook-calm notebook-canvas',
      )}
      id="workspace-main"
      role="main"
      tabIndex={-1}
      /* OPT-K126 — Workspace Agent clarity: CTA-only border diet */
      data-testid="notebook-workspace-layout"
      data-layout={nbViewport}
      data-border-diet="cta-only"
      data-type-rhythm="dashboard"
    >
      {/* OPT-K133/K134 — thin 1px panel rules (no wide gutters); panels stay flexible */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
      <Group
        orientation="horizontal"
        className="h-full min-h-0 w-full flex-1 gap-0 overflow-hidden rounded-2xl bg-surface-card p-0"
      >
        <Panel
          id="nb-sources"
          defaultSize={nbViewport === 'tablet' ? 26 : 22}
          minSize={nbViewport === 'tablet' ? 18 : 14}
          className="flex h-full min-h-0 flex-col overflow-hidden"
        >
          <section
            className="flex h-full min-h-0 flex-col overflow-hidden workspace-glass-panel rounded-none border-0 bg-surface-card shadow-none"
            aria-label={notebookCalm ? tx('Τα αρχεία σου', 'Your files') : tx('Πηγές', 'Sources')}
            data-testid="notebook-sources-panel"
          >
            <header className="flex items-center justify-between gap-2 border-b border-transparent px-4 py-3 shrink-0">
              <h2 className="font-sans type-meta font-semibold normal-case tracking-normal text-text-primary">
                {notebookCalm ? tx('Τα αρχεία σου', 'Your files') : tx('Πηγές', 'Sources')}
              </h2>
              <button type="button" onClick={addSource} data-testid="notebook-add-source" className="flex items-center gap-1 rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors">
                <Plus className="h-3.5 w-3.5" />
                {tx('Προσθήκη', 'Add')}
              </button>
            </header>
            {sourcesBody}
            {sourcesFooter}
          </section>
        </Panel>

        <Separator
          className="notebook-panel-resizer w-px shrink-0 cursor-col-resize"
          data-testid="notebook-resizer-sources-chat"
          aria-orientation="vertical"
        />

        <Panel id="nb-chat" defaultSize={46} minSize={28} className="flex h-full min-h-0 flex-col overflow-hidden">
          <section
            className="flex h-full min-h-0 flex-col overflow-hidden workspace-glass-panel rounded-none border-0 bg-surface-card shadow-none"
            aria-label={notebookCalm ? tx('Βοηθός', 'Tutor') : tx('Συνομιλία', 'Chat')}
            data-testid="notebook-chat-panel"
          >
            {/* OPT-K138 — when agent is embedded, its chrome is the only header row */}
            {!renderCenterAgent && (
              <header
                className="flex items-center justify-between gap-2 border-b border-transparent px-4 py-3 shrink-0"
                title={chatGrounding}
              >
                <h2 className="font-sans type-meta font-semibold normal-case tracking-normal text-text-primary">
                  {notebookCalm ? tx('Βοηθός', 'Tutor') : tx('Συνομιλία', 'Chat')}
                </h2>
              </header>
            )}
            {chatBody}
          </section>
        </Panel>

        <Separator
          className="notebook-panel-resizer w-px shrink-0 cursor-col-resize"
          data-testid="notebook-resizer-chat-studio"
          aria-orientation="vertical"
        />

        {studioToolOpen ? (
          <StudyWorkspaceToolSurface model={model} />
        ) : (
          <Panel id="nb-studio" defaultSize={32} minSize={20} className="flex h-full min-h-0 flex-col overflow-hidden">
            <section
              className="flex h-full min-h-0 flex-col overflow-hidden workspace-glass-panel rounded-none border-0 bg-surface-card shadow-none"
              aria-label={notebookCalm ? tx('Εργαλεία μελέτης', 'Study tools') : 'Studio'}
              data-testid="notebook-studio-panel"
            >
              <header
                className="flex items-center justify-between gap-2 border-b border-transparent px-4 py-3 shrink-0"
                title={tx('Εργαλεία μελέτης πάνω στις πηγές σου', 'Study tools on your sources')}
              >
                <h2 className="font-sans type-meta font-semibold normal-case tracking-normal text-text-primary">
                  {notebookCalm ? tx('Εργαλεία μελέτης', 'Study tools') : 'Studio'}
                </h2>
              </header>
              {studioGrid}
            </section>
          </Panel>
        )}
      </Group>
      </div>

      {studioToolOpen && (
        <div className="my-2 mr-2 flex w-10 shrink-0 flex-col items-center gap-2 rounded-2xl border-0 border-l-0 bg-surface-card py-3">
          {studioAskAiRail}
          <button
            type="button"
            onClick={() => setStudioToolOpen(false)}
            title={tx('Πίσω στο Studio', 'Back to Studio')}
            aria-label={tx('Πίσω στο Studio', 'Back to Studio')}
            data-testid="notebook-studio-rail-back"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
