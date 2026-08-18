import { useState, useMemo, useEffect, useRef, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition, expandHeight } from '../lib/motion';
import {
  Search, Upload, BookOpen, FileText, ChevronRight, ChevronDown,
  Clock, BarChart3, Sparkles, Grid3X3, List, Loader2, AlertCircle,
  File, Image, Code, Presentation, Table2, Trash2, RefreshCw, ExternalLink, X, MessageSquare,
  Pencil, Folder,
} from '@/lib/lucide-shim';
import type { Course, LibraryFolder, UploadedFile, UserSettings, Task, GlossaryEntry } from '../types';
import { groupFilesByFolder } from '../lib/libraryOrganize';
import { cn } from '../utils/cn';
import { prefetchWorkspaceEntry, workspaceEntryPrefetchHandlers } from '../features/workspace';
import { buildMaterialOutlinePreview } from '../features/upload';
import { OutlinePreviewPanel } from './OutlinePreviewPanel';
import { RecognitionReportPanel } from './RecognitionReportPanel';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { buildDeleteFileCascadeCopy } from '../lib/deleteFileCascadeCopy';
import { buildDeleteCourseCascadeCopy } from '../lib/deleteCourseCascadeCopy';
import { resolveCourseColor } from '../lib/masteryPalette';
import { countFilesForCourse } from '../lib/deleteCascade';
import { countGeneratedTasksForCourse } from '../lib/pipelineReprocess';
import { courseDeleteStats } from '../lib/removeCourse';
import { isDemoCourse, shouldShowDemo } from '../lib/demoMode';
import {
  canAutoSyncLibrary,
  loadLibraryViewPrefs,
  saveLibraryViewPrefs,
  type LibraryFilter,
  type LibrarySortBy,
  type LibraryViewMode,
  type LibrarySyncConflictItem,
} from '../features/library';
import { selectCourseTaskMetrics } from '../lib/coursePageSelectors';
import { CourseIcon } from './ui/CourseIcon';
import { UiIcon } from './ui/UiIcon';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { PostUploadBanner } from './ui/PostUploadBanner';
import { Page, PageHeader, PrimaryCTA } from './ui/primitives';
import { Button } from './ui/Button';
import { useWarmSandPageScope, warmSandScopeProps } from '../lib/useDocumentTheme';
import { DescriptiveStickyTabBar, InfoStack, MiniAlert } from './ui/platformChrome';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { t } from '../lib/i18n';
import { RagIndexProgressBanner } from './RagIndexProgressBanner';
import { CrossLibrarySynthesisPanel } from './CrossLibrarySynthesisPanel';
import { NotebookLmImportPanel } from './NotebookLmImportPanel';
import { LibraryNameDialog } from './LibraryNameDialog';
import { LibraryMoveFileDialog } from './LibraryMoveFileDialog';
import { LibrarySyncConflictPanel } from './LibrarySyncConflictPanel';
import { showCrossLibrarySynthesis } from '../lib/platformFocus';
import type { NotebookLmImportResult } from '../lib/notebooklmImport';
import { openNotebookLm, notebookLmSourceLabel } from '../lib/notebooklmBridge';
import { isDebugUiTopicLabel } from '../features/analytics/knowledgeFlowAnalytics';
import {
  buildTopicIdTitleMap,
  resolveTopicPrerequisiteTitles,
  resolveTopicRef,
} from '../lib/topicRefResolve';
import { QualityScoreBadge } from './ui/QualityScoreBadge';
import { CourseStatusBadge, type CourseStatusKind } from './ui/CourseStatusBadge';
import { CompactProgressBar } from './ui/CompactProgressBar';
import { OverflowChipRow } from './ui/OverflowChipRow';
import { useMinimalTheme } from '../lib/useMinimalTheme';

type LibraryTab = 'courses' | 'files';
type ViewMode = LibraryViewMode;

function courseStatusKind(course: Course): CourseStatusKind {
  if (course.status === 'generating') return 'generating';
  if (course.status === 'needs_review') return 'needs_review';
  if (course.status === 'completed') return 'complete';
  if (course.status === 'in-progress') return 'in_progress';
  return 'ready';
}

/** Open upload modal — omit for new course; pass extend + course id to add material. */
export type LibraryUploadIntent = { mode: 'new' | 'extend'; targetCourseId?: string; files?: File[] };

interface LibraryProps {
  courses: Course[];
  uploadedFiles: UploadedFile[];
  onSelectCourse: (course: Course) => void;
  onRemoveCourse?: (courseId: string) => boolean;
  onRenameCourse?: (courseId: string, title: string) => boolean;
  onUpload: (intent?: LibraryUploadIntent) => void;
  onRemoveFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, name: string) => boolean;
  onMoveFile?: (fileId: string, courseId: string | null, folderId?: string | null) => boolean;
  libraryFolders?: LibraryFolder[];
  onCreateFolder?: (name: string) => boolean;
  onRenameFolder?: (folderId: string, name: string) => boolean;
  onDeleteFolder?: (folderId: string) => boolean;
  onReprocessCourse?: (courseId: string) => void;
  reprocessingMaterial?: boolean;
  userSettings?: UserSettings;
  tasks?: Task[];
  glossaryEntries?: GlossaryEntry[];
  postUploadCourseId?: string | null;
  onOpenWorkspace?: () => void;
  onDismissPostUpload?: () => void;
  onImportNotebookLm?: (raw: string) => NotebookLmImportResult | null;
  onAddNotebookLmToFsrs?: (result: NotebookLmImportResult) => void;
  onOpenNotebookShell?: (courseId: string) => void;
  onOpenConcept?: (concept: string) => void;
  /** OPT-AI-C — Ask Agent about an analyzed library source (pins file). */
  onAskSource?: (file: UploadedFile, course?: Course) => void;
  /** Same signed-in pull as Settings — refreshes library from the account server. */
  onPullLibrary?: () => Promise<unknown>;
  /** OPT-L5 — signed-in pull conflict (remote already applied). */
  syncConflicts?: LibrarySyncConflictItem[];
  onKeepRemoteLibrary?: () => void;
  onRestoreLocalLibrary?: () => void;
  onDismissLibrarySyncConflict?: () => void;
}

const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: File,
  pptx: Presentation,
  txt: FileText,
  md: FileText,
  image: Image,
  csv: Table2,
  code: Code,
};

/* OPT-K98 — markup debt: decorative brand type -> ink */
/* OPT-K122/K149 — Library CTA-only diet + Tasks-parity icon/type/wash */
export function Library({
  courses,
  uploadedFiles,
  onSelectCourse,
  onRemoveCourse,
  onRenameCourse,
  onUpload,
  onRemoveFile,
  onRenameFile,
  onMoveFile,
  libraryFolders = [],
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onReprocessCourse,
  reprocessingMaterial = false,
  userSettings,
  tasks = [],
  glossaryEntries = [],
  postUploadCourseId = null,
  onOpenWorkspace,
  onDismissPostUpload,
  onImportNotebookLm,
  onAddNotebookLmToFsrs,
  onOpenNotebookShell,
  onOpenConcept,
  onAskSource,
  onPullLibrary,
  syncConflicts = [],
  onKeepRemoteLibrary,
  onRestoreLocalLibrary,
  onDismissLibrarySyncConflict,
}: LibraryProps) {
  const userLanguage = userSettings?.language === 'el' ? 'el' : 'en';
  const warmSandPage = useWarmSandPageScope();
  /** OPT-C5 — soft chrome under Minimal; list-first when no saved prefs. */
  const isMinimal = useMinimalTheme();
  const postUploadCourse = postUploadCourseId
    ? courses.find((c) => c.id === postUploadCourseId) ?? null
    : null;
  const [tab, setTab] = useState<LibraryTab>('courses');
  const initialPrefs = useMemo(() => loadLibraryViewPrefs(), []);
  const [viewMode, setViewMode] = useState<ViewMode>(initialPrefs.viewMode);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>(initialPrefs.filter);
  const [sortBy, setSortBy] = useState<LibrarySortBy>(initialPrefs.sortBy);
  /** Skip first paint so theme-default viewMode does not clobber unset prefs (OPT-L5). */
  const prefsReadyRef = useRef(false);
  const [dropActive, setDropActive] = useState(false);
  const [pullingLibrary, setPullingLibrary] = useState(false);
  const [pullStatus, setPullStatus] = useState<'ok' | 'fail' | null>(null);
  const [entryHintDismissed, setEntryHintDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('synapse:library-hint-dismiss') === '1';
    } catch {
      return false;
    }
  });
  const canPullLibrary = Boolean(
    onPullLibrary && userSettings && canAutoSyncLibrary(userSettings),
  );
  const [folderDialog, setFolderDialog] = useState<'create' | { rename: string } | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  const handlePullLibrary = async () => {
    if (!onPullLibrary || pullingLibrary) return;
    setPullingLibrary(true);
    setPullStatus(null);
    try {
      await onPullLibrary();
      setPullStatus('ok');
    } catch {
      setPullStatus('fail');
    } finally {
      setPullingLibrary(false);
    }
  };

  useEffect(() => {
    if (!prefsReadyRef.current) {
      prefsReadyRef.current = true;
      return;
    }
    saveLibraryViewPrefs({ filter, viewMode, sortBy });
  }, [filter, viewMode, sortBy]);

  const acceptDroppedFiles = (fileList: FileList | File[] | null | undefined) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) {
      onUpload();
      return;
    }
    onUpload({ mode: 'new', files });
  };

  const dropZoneHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(true);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDropActive(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      acceptDroppedFiles(e.dataTransfer.files);
    },
  };

  const dismissEntryHint = () => {
    try {
      sessionStorage.setItem('synapse:library-hint-dismiss', '1');
    } catch {
      /* ignore */
    }
    setEntryHintDismissed(true);
  };

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = courses.filter((c) => {
      if (query) {
        const searchableText = [
          c.title,
          c.subject,
          c.description,
          ...c.topics.map((topic) => topic.title),
          ...c.sourceFiles,
        ].join(' ').toLowerCase();
        if (!searchableText.includes(query)) return false;
      }
      if (filter === 'in-progress') return c.status === 'in-progress';
      if (filter === 'completed') return c.status === 'completed';
      if (filter === 'generating') return c.status === 'generating';
      if (filter === 'attention') {
        const { pendingTasks, dueReviews, isStalePipeline: isOldPipeline } = selectCourseTaskMetrics(c, tasks);
        return Boolean(c.sourceQuality?.needsMoreMaterial)
          || c.status === 'needs_review'
          || isOldPipeline
          || pendingTasks > 0
          || dueReviews > 0;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'progress') return b.mastery - a.mastery;
      if (sortBy === 'quality') return (b.sourceQuality?.score ?? 0) - (a.sourceQuality?.score ?? 0);
      const at = new Date(a.lastStudied ?? a.createdAt ?? 0).getTime();
      const bt = new Date(b.lastStudied ?? b.createdAt ?? 0).getTime();
      return bt - at;
    });
  }, [courses, search, filter, sortBy, tasks]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return uploadedFiles;
    return uploadedFiles.filter((file) => {
      const courseTitle = courses.find((course) => course.id === file.courseId)?.title ?? '';
      return [file.name, file.type, courseTitle].some((value) => value.toLowerCase().includes(query));
    });
  }, [courses, search, uploadedFiles]);

  const fileGroups = useMemo(
    () => groupFilesByFolder(filteredFiles, libraryFolders),
    [filteredFiles, libraryFolders],
  );

  const topicIdToTitle = useMemo(() => buildTopicIdTitleMap(courses), [courses]);

  const topicToCourse = useMemo(() => {
    const map = new Map<string, Course>();
    for (const course of courses) {
      for (const topic of course.topics) {
        if (!map.has(topic.title)) map.set(topic.title, course);
      }
    }
    return map;
  }, [courses]);

  const libraryInfo = useMemo(() => {
    /** OPT-K14 / L2 — full lists densified via +N; resolve opaque t1/t2 ids → titles. */
    const topics: string[] = [];
    const prereqSet = new Set<string>();
    for (const course of filteredCourses) {
      for (const topic of course.topics) {
        if (isDebugUiTopicLabel(topic.title)) continue;
        if (!topics.includes(topic.title)) topics.push(topic.title);
        for (const title of resolveTopicPrerequisiteTitles(topic, topicIdToTitle)) {
          prereqSet.add(title);
        }
        for (const concept of topic.keyConcepts ?? []) {
          const label = resolveTopicRef(concept, topicIdToTitle);
          if (label && !isDebugUiTopicLabel(label)) prereqSet.add(label);
        }
      }
    }
    const glossaryTerms = [...new Set(glossaryEntries.map((g) => g.term).filter(Boolean))];
    const examples = glossaryTerms;
    const prerequisites = [...prereqSet];
    /** Enrichments = glossary only (do not dump raw prerequisite ids into this row). */
    const enrichments = glossaryTerms.slice(0, 16);
    return { topics, prerequisites, examples, enrichments };
  }, [filteredCourses, glossaryEntries, topicIdToTitle]);

  const libraryTabs = useMemo(
    () => [
      {
        id: 'courses' as const,
        label: t('libCoursesTab', userLanguage),
        summary: t('libCoursesStatReady', userLanguage),
        count: courses.length,
      },
      {
        id: 'files' as const,
        label: t('libFilesTab', userLanguage),
        summary: t('libFilesStatSources', userLanguage),
        count: uploadedFiles.length,
      },
    ],
    [courses.length, uploadedFiles.length, userLanguage],
  );

  const libraryQualityAlerts = useMemo(() => {
    const needsMaterial = filteredCourses.some((c) => c.sourceQuality?.needsMoreMaterial);
    const outlineAdjusted = filteredCourses.some((c) => c.sourceQuality?.outlineAdjusted);
    return { needsMaterial, outlineAdjusted };
  }, [filteredCourses]);

  const filterLabels = useMemo<Record<LibraryFilter, string>>(
    () => ({
      all: t('libFilterAll', userLanguage),
      'in-progress': t('libFilterInProgress', userLanguage),
      generating: t('libFilterGenerating', userLanguage),
      completed: t('libFilterCompleted', userLanguage),
      attention: t('libFilterAttention', userLanguage),
    }),
    [userLanguage],
  );

  return (
    <div
      {...warmSandScopeProps(warmSandPage)}
      className={cn('w-full max-w-none', isMinimal && 'library-calm library-files-density')}
      data-testid="library-page"
      data-bleed="full"
      data-type-rhythm="library"
      /* OPT-K122/K149 — Library clarity: CTA-only + Tasks-parity washes/type */
      data-border-diet="cta-only"
    >
    <Page gap="sm" data-soft-sep="stack" data-type-rhythm="library">
      <PageHeader
        eyebrow={t('library', userLanguage)}
        title={t('libraryPageTitle', userLanguage)}
        subtitle={t('librarySubtitle', userLanguage)}
        actions={
          <>
            <PrimaryCTA
              onClick={() => onUpload()}
              data-testid="library-upload"
              data-tour="library-upload"
              size="sm"
              className="library-upload-cta whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              {t('libUpload', userLanguage)}
            </PrimaryCTA>
            {canPullLibrary && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handlePullLibrary()}
                disabled={pullingLibrary}
                aria-busy={pullingLibrary}
                data-testid="library-pull-from-server"
                className="whitespace-nowrap"
              >
                {pullingLibrary ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {pullingLibrary
                  ? t('libPulling', userLanguage)
                  : t('libPullFromServer', userLanguage)}
              </Button>
            )}
            {tab === 'courses' && (
              <div
                role="group"
                aria-label={t('libViewGroup', userLanguage)}
                data-testid="library-view-toggle"
                className="inline-flex items-center rounded-lg border-0 bg-surface-secondary/55 p-0.5 gap-0.5"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label={t('libGridView', userLanguage)}
                  aria-pressed={viewMode === 'grid'}
                  className={cn('inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border-0', viewMode === 'grid' ? 'bg-surface-primary text-text-primary' : 'text-text-tertiary hover:text-text-secondary')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label={t('libListView', userLanguage)}
                  aria-pressed={viewMode === 'list'}
                  className={cn('inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border-0', viewMode === 'list' ? 'bg-surface-primary text-text-primary' : 'text-text-tertiary hover:text-text-secondary')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        }
      />

      <div
        className="library-work-surface w-full max-w-none space-y-2"
        data-testid="library-work-surface"
        data-bleed="full"
        data-soft-card="off"
      >
      <RagIndexProgressBanner
        settings={userSettings}
        lang={userLanguage}
        variant="banner"
      />

      {/* L-L01: canvas order — RAG → success → NotebookLM → combined → tip.
          Tight stack avoids stacking Page space-y with per-child mb-*. */}
      <div className="space-y-1.5">
        {userSettings && shouldShowDemo(userSettings) && (
          <p
            className="type-caption text-text-secondary px-0.5"
            data-testid="library-demo-sandbox-hint"
          >
            {t('libraryDemoSandboxHint', userLanguage)}
          </p>
        )}
        {userSettings && canAutoSyncLibrary(userSettings) && (
          <p
            className="type-caption text-text-muted px-0.5"
            data-testid="library-sync-signed-in-hint"
          >
            {t('librarySyncSignedInHint', userLanguage)}
          </p>
        )}
        {pullStatus === 'ok' && (
          <p
            className="type-caption text-text-secondary px-0.5"
            role="status"
            data-testid="library-pull-status"
          >
            {t('libPullStatusOk', userLanguage)}
          </p>
        )}
        {pullStatus === 'fail' && (
          <p
            className="type-caption text-text-secondary px-0.5"
            role="status"
            data-testid="library-pull-status"
          >
            {t('libPullStatusFail', userLanguage)}
          </p>
        )}
        {syncConflicts.length > 0 && onKeepRemoteLibrary && onRestoreLocalLibrary && (
          <LibrarySyncConflictPanel
            conflicts={syncConflicts}
            language={userLanguage}
            onKeepRemote={onKeepRemoteLibrary}
            onRestoreLocal={onRestoreLocalLibrary}
            onDismiss={onDismissLibrarySyncConflict}
          />
        )}
        {postUploadCourse && onOpenWorkspace && (
          <PostUploadBanner
            courseTitle={postUploadCourse.title}
            onOpenWorkspace={() => {
              onSelectCourse(postUploadCourse);
              onDismissPostUpload?.();
              onOpenWorkspace();
            }}
            onViewCourse={() => {
              onSelectCourse(postUploadCourse);
              onDismissPostUpload?.();
            }}
            onDismiss={() => onDismissPostUpload?.()}
          />
        )}

        {(onImportNotebookLm || showCrossLibrarySynthesis() || !entryHintDismissed) && (
          <CollapsibleChromeSection
            title={t('chromeLibraryExtras', userLanguage)}
            data-testid="library-extras-chrome"
            alwaysCollapse
            defaultOpen={Boolean(userSettings && shouldShowDemo(userSettings))}
          >
            <div className="space-y-3 px-1 pb-2">
              {onImportNotebookLm && (
                <NotebookLmImportPanel
                  lang={userLanguage}
                  onImport={onImportNotebookLm}
                  onAddToFsrs={onAddNotebookLmToFsrs}
                  onOpenCourse={(courseId) => {
                    const course = courses.find((item) => item.id === courseId);
                    if (course) onSelectCourse(course);
                  }}
                  demoSample={Boolean(userSettings && shouldShowDemo(userSettings))}
                />
              )}

              {showCrossLibrarySynthesis() && (
                <CrossLibrarySynthesisPanel
                  courses={courses}
                  settings={userSettings}
                  lang={userLanguage}
                />
              )}

              {/* OPT-K149 — flush tip (no inset wash nest) */}
              {!entryHintDismissed && (
                <div
                  data-testid="library-tip-banner"
                  className="flex items-start justify-between gap-2 border-0 bg-transparent px-0 py-1"
                >
                  <p className="type-caption text-text-secondary">
                    <span className="font-semibold text-text-secondary">{t('libraryTipLabel', userLanguage)}</span>{' '}
                    {t('libraryEntryHint', userLanguage)}
                  </p>
                  <button
                    type="button"
                    onClick={dismissEntryHint}
                    className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-text-secondary"
                    aria-label={t('close', userLanguage)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </CollapsibleChromeSection>
        )}
      </div>

      {/* Counts live on tab badges — no separate stats strip (was a duplicate row). */}
      <DescriptiveStickyTabBar
        items={libraryTabs}
        activeId={tab}
        onChange={setTab}
        testIdPrefix="library-tab"
      />

      {/* Wave H4 — upload-first: drop strip above the course grid when materials exist. */}
      {tab === 'courses' && courses.length > 0 && !search.trim() && (
        <button
          type="button"
          onClick={() => onUpload()}
          data-testid="library-drop-zone-compact"
          data-bleed="full"
          data-soft-card="off"
          data-drop-active={dropActive ? 'true' : undefined}
          className={cn(
            'ux-library-drop-zone ux-library-drop-zone--compact ux-prompt-bar-surface flex w-full flex-row items-center justify-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary transition-colors',
            dropActive && 'ring-2 ring-brand-500/40 text-text-primary',
          )}
          {...dropZoneHandlers}
        >
          <Upload className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
          <span className="type-caption font-medium">{t('libDropZoneCompactTitle', userLanguage)}</span>
        </button>
      )}

      {/* Search stays visible; filters/sort nest as Find courses chrome. */}
      <div className="relative w-full" data-soft-card="off">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          placeholder={t('libSearchPlaceholder', userLanguage)}
          aria-label={t('libSearchAria', userLanguage)}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full min-h-11 pl-10 pr-10 py-2.5 rounded-md border-0 bg-surface-secondary/70 type-meta text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label={t('libClearSearch', userLanguage)}
            className="library-search-clear absolute right-2 top-1/2 -translate-y-1/2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </div>
      {tab === 'courses' && (
        <CollapsibleChromeSection
          title={t('libraryFindChrome', userLanguage)}
          data-testid="library-find-chrome"
          alwaysCollapse
        >
          <div className="flex items-center gap-2 flex-wrap px-1 pb-2">
            {(['all', 'in-progress', 'generating', 'completed', 'attention'] as const).map(f => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={active}
                  data-testid={`library-filter-${f}`}
                  className={cn(
                    'platform-pill min-h-9 px-3 py-1.5 rounded-md type-caption transition-colors border-0 text-text-primary font-mono',
                    active ? 'platform-pill-active bg-surface-secondary' : 'bg-surface-secondary/40',
                    f === 'attention' && active ? 'bg-surface-secondary text-text-secondary' : '',
                  )}
                >
                  {filterLabels[f]}
                </button>
              );
            })}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label={t('libSortLabel', userLanguage)}
              data-testid="library-sort"
              className="h-9 min-w-[9.5rem] rounded-md border-0 bg-surface-secondary/70 px-2 type-caption text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="recent">{t('libSortRecent', userLanguage)}</option>
              <option value="progress">{t('libSortProgress', userLanguage)}</option>
              <option value="quality">{t('libSortQuality', userLanguage)}</option>
              <option value="title">{t('libSortTitle', userLanguage)}</option>
            </select>
          </div>
        </CollapsibleChromeSection>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'courses' && (
          <motion.div
            key="courses"
            initial={isMinimal ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={emphasizedTransition}
          >
            {!search.trim() && filteredCourses.length === 0 && (
              <button
                type="button"
                onClick={() => onUpload()}
                data-testid="library-drop-zone"
                data-bleed="full"
                data-drop-active={dropActive ? 'true' : undefined}
                className={cn(
                  'ux-library-drop-zone ux-prompt-bar-surface mb-2 flex w-full max-w-none flex-col items-center gap-1.5 px-4 py-8 text-center text-text-secondary hover:text-text-primary transition-colors',
                  dropActive && 'ring-2 ring-brand-500/40 text-text-primary',
                )}
                {...dropZoneHandlers}
              >
                <Upload className="h-5 w-5 text-text-secondary" aria-hidden />
                <span className="type-meta font-medium">
                  {t('libDropZoneTitle', userLanguage)}
                </span>
                <span className="type-caption text-text-muted">
                  {t('libDropZoneFormats', userLanguage)}
                </span>
              </button>
            )}
            {filteredCourses.length === 0 ? (
              <PlatformEmptyState
                title={search.trim() || filter !== 'all' ? t('libNoMatchingCoursesTitle', userLanguage) : t('libraryEmptyCoursesTitle', userLanguage)}
                description={search.trim() || filter !== 'all' ? t('libNoMatchingCoursesDescription', userLanguage) : t('libraryEmptyCoursesDescription', userLanguage)}
                icon={null}
                className="library-empty-state"
                actionLabel={search.trim() || filter !== 'all' ? undefined : t('libUploadMaterial', userLanguage)}
                onAction={search.trim() || filter !== 'all' ? undefined : () => onUpload()}
                secondaryActionLabel={search.trim() || filter !== 'all' ? t('libResetFilters', userLanguage) : uploadedFiles.length > 0 ? t('libViewFiles', userLanguage) : undefined}
                onSecondaryAction={search.trim() || filter !== 'all' ? () => { setSearch(''); setFilter('all'); } : uploadedFiles.length > 0 ? () => setTab('files') : undefined}
              />
            ) : (
              <div className="space-y-2">
                {/* Courses (+ quality alerts) pack in masonry/list; Topics stacks are full-bleed below (OPT-L1). */}
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'columns-1 sm:columns-2 lg:columns-3 gap-2.5 [&>*]:mb-2.5 [&>*]:break-inside-avoid'
                      : 'space-y-2',
                  )}
                >
                  {filteredCourses.map((course, i) => (
                    viewMode === 'grid' ? (
                      <CourseCard
                        key={course.id}
                        course={course}
                        index={i}
                        tasks={tasks}
                        glossaryEntries={glossaryEntries}
                        uploadedFiles={uploadedFiles}
                        userLanguage={userLanguage}
                        onClick={() => onSelectCourse(course)}
                        onRemoveCourse={onRemoveCourse}
                        onRenameCourse={onRenameCourse}
                        onOpenNotebookShell={onOpenNotebookShell}
                        onUpload={() => onUpload({ mode: 'extend', targetCourseId: course.id })}
                        onOpenTopic={onOpenConcept}
                      />
                    ) : (
                      <CourseListItem
                        key={course.id}
                        course={course}
                        index={i}
                        tasks={tasks}
                        glossaryEntries={glossaryEntries}
                        uploadedFiles={uploadedFiles}
                        userLanguage={userLanguage}
                        onClick={() => onSelectCourse(course)}
                        onRemoveCourse={onRemoveCourse}
                        onRenameCourse={onRenameCourse}
                        onOpenNotebookShell={onOpenNotebookShell}
                        onUpload={() => onUpload({ mode: 'extend', targetCourseId: course.id })}
                        onOpenTopic={onOpenConcept}
                      />
                    )
                  ))}
                  {!search.trim() && (libraryQualityAlerts.needsMaterial || libraryQualityAlerts.outlineAdjusted) && (
                    <CollapsibleChromeSection
                      title={t('chromeAlerts', userLanguage)}
                      data-testid="library-quality-alerts-chrome"
                      alwaysCollapse
                      meta={
                        (libraryQualityAlerts.needsMaterial ? 1 : 0)
                        + (libraryQualityAlerts.outlineAdjusted ? 1 : 0)
                        || undefined
                      }
                    >
                      <div className="space-y-2 px-1 pb-2">
                        {libraryQualityAlerts.needsMaterial && (
                          <MiniAlert
                            tone="amber"
                            title={t('libraryMiniAlertGapTitle', userLanguage)}
                            body={t('libraryMiniAlertGapBody', userLanguage)}
                            actionLabel={t('libraryMiniAlertUploadAction', userLanguage)}
                            onAction={() => onUpload()}
                          />
                        )}
                        {libraryQualityAlerts.outlineAdjusted && (
                          <MiniAlert
                            tone="violet"
                            title={t('libraryMiniAlertContradictionTitle', userLanguage)}
                            body={t('libraryMiniAlertContradictionBody', userLanguage)}
                            actionLabel={t('libraryMiniAlertUploadAction', userLanguage)}
                            onAction={() => onUpload()}
                          />
                        )}
                      </div>
                    </CollapsibleChromeSection>
                  )}
                </div>
                {!search.trim() && (libraryInfo.topics.length > 0 || libraryInfo.examples.length > 0) && (
                  <CollapsibleChromeSection
                    title={t('libraryTopicsChrome', userLanguage)}
                    data-testid="library-topics-chrome"
                    alwaysCollapse
                    defaultOpen
                    meta={libraryInfo.topics.length || undefined}
                  >
                    <div
                      className="library-info-stacks grid grid-cols-1 gap-2 px-1 pb-2 lg:grid-cols-2 lg:gap-2.5"
                      data-testid="library-info-stacks"
                    >
                      {libraryInfo.topics.length > 0 && (
                        <InfoStack
                          title={t('libraryInfoStackTopicsTitle', userLanguage)}
                          items={libraryInfo.topics}
                          secondary={libraryInfo.prerequisites}
                          secondaryLabel={t('libraryInfoStackPrereqLabel', userLanguage)}
                          onItemClick={(topicTitle) => {
                            // OPT-L1 — open study workspace on the topic (demo + prod); fallback to course.
                            if (onOpenConcept) {
                              onOpenConcept(topicTitle);
                              return;
                            }
                            const owning = topicToCourse.get(topicTitle);
                            if (owning) onSelectCourse(owning);
                          }}
                          onSecondaryClick={(label) => {
                            if (onOpenConcept) onOpenConcept(label);
                          }}
                          itemHint={t('libTopicOpenHint', userLanguage)}
                          secondaryHint={t('libPrereqOpenHint', userLanguage)}
                        />
                      )}
                      {libraryInfo.examples.length > 0 && (
                        <InfoStack
                          title={t('libraryInfoStackExamplesTitle', userLanguage)}
                          items={libraryInfo.examples}
                          secondary={libraryInfo.enrichments}
                          secondaryLabel={t('libraryInfoStackEnrichmentLabel', userLanguage)}
                          onItemClick={onOpenConcept}
                          onSecondaryClick={onOpenConcept}
                          itemHint={t('libConceptOpenHint', userLanguage)}
                          secondaryHint={t('libConceptOpenHint', userLanguage)}
                        />
                      )}
                    </div>
                  </CollapsibleChromeSection>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'files' && (
          <motion.div
            key="files"
            initial={isMinimal ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={emphasizedTransition}
            className="space-y-3"
          >
            {onCreateFolder && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFolderDialog('create')}
                  data-testid="library-new-folder"
                >
                  <Folder className="w-3.5 h-3.5" />
                  {t('libNewFolder', userLanguage)}
                </Button>
              </div>
            )}
            {filteredFiles.length === 0 ? (
              <PlatformEmptyState
                title={search.trim() ? t('libNoMatchingFilesTitle', userLanguage) : t('libraryEmptyFilesTitle', userLanguage)}
                description={search.trim() ? t('libNoMatchingFilesDescription', userLanguage) : t('libraryEmptyFilesDescription', userLanguage)}
                icon={null}
                className="library-empty-state"
                actionLabel={search.trim() ? undefined : t('libUploadMaterial', userLanguage)}
                onAction={search.trim() ? undefined : () => onUpload()}
                secondaryActionLabel={search.trim() ? t('libClearSearch', userLanguage) : t('libViewCourses', userLanguage)}
                onSecondaryAction={search.trim() ? () => setSearch('') : () => setTab('courses')}
              />
            ) : (
              <div className={cn('space-y-3', isMinimal && 'library-files-dense')}>
                {fileGroups.map((group) => (
                  (group.files.length > 0 || group.folder) ? (
                    <section
                      key={group.folder?.id ?? 'unfiled'}
                      className="space-y-2"
                      data-testid={group.folder ? `library-folder-${group.folder.id}` : 'library-folder-unfiled'}
                    >
                      <div className="flex items-center gap-2">
                        <p className="type-caption font-semibold text-text-secondary flex-1">
                          {group.folder ? group.folder.name : t('libUnfiled', userLanguage)}
                        </p>
                        {group.folder && onRenameFolder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFolderDialog({ rename: group.folder!.id })}
                            data-testid={`library-folder-rename-${group.folder.id}`}
                          >
                            {t('libRenameFileTooltip', userLanguage)}
                          </Button>
                        )}
                        {group.folder && onDeleteFolder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingFolderId(group.folder!.id)}
                            data-testid={`library-folder-delete-${group.folder.id}`}
                          >
                            {t('libDeleteFolderTitle', userLanguage)}
                          </Button>
                        )}
                      </div>
                      {group.files.map((file, i) => (
                        <FileItem
                          key={file.id}
                          file={file}
                          index={i}
                          course={courses.find((c) => c.id === file.courseId)}
                          folderName={group.folder?.name}
                          uploadedFiles={uploadedFiles}
                          tasks={tasks}
                          glossaryEntries={glossaryEntries}
                          userSettings={userSettings}
                          userLanguage={userLanguage}
                          onRemoveFile={onRemoveFile}
                          onRenameFile={onRenameFile}
                          onMoveFile={onMoveFile}
                          moveCourses={courses
                            .filter((item) => !isDemoCourse(item.id) && item.status !== 'generating')
                            .map((item) => ({ id: item.id, title: item.title }))}
                          moveFolders={libraryFolders.map((folder) => ({ id: folder.id, name: folder.name }))}
                          onReprocessCourse={onReprocessCourse}
                          reprocessingMaterial={reprocessingMaterial}
                          onAskSource={onAskSource}
                        />
                      ))}
                    </section>
                  ) : null
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <LibraryNameDialog
        open={folderDialog === 'create'}
        lang={userLanguage}
        title={t('libNewFolder', userLanguage)}
        initialValue=""
        testId="library-folder-create-dialog"
        onClose={() => setFolderDialog(null)}
        onSave={(name) => onCreateFolder?.(name) ?? false}
      />
      <LibraryNameDialog
        open={typeof folderDialog === 'object' && folderDialog !== null}
        lang={userLanguage}
        title={t('libRenameFolderTitle', userLanguage)}
        initialValue={
          typeof folderDialog === 'object' && folderDialog
            ? libraryFolders.find((folder) => folder.id === folderDialog.rename)?.name ?? ''
            : ''
        }
        testId="library-folder-rename-dialog"
        onClose={() => setFolderDialog(null)}
        onSave={(name) => {
          if (typeof folderDialog !== 'object' || !folderDialog) return false;
          return onRenameFolder?.(folderDialog.rename, name) ?? false;
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingFolderId)}
        title={t('libDeleteFolderTitle', userLanguage)}
        description={t('libDeleteFolderBody', userLanguage)}
        confirmLabel={t('libDeleteFolderTitle', userLanguage)}
        cancelLabel={t('cancel', userLanguage)}
        destructive
        data-testid="library-folder-delete-dialog"
        onClose={() => setDeletingFolderId(null)}
        onConfirm={() => {
          if (deletingFolderId) onDeleteFolder?.(deletingFolderId);
          setDeletingFolderId(null);
        }}
      />
    </Page>
    </div>
  );
}

function courseDifficultyLabel(difficulty: Course['difficulty'], lang: 'en' | 'el') {
  const keyByDifficulty = {
    beginner: 'libDifficultyBeginner',
    intermediate: 'libDifficultyIntermediate',
    advanced: 'libDifficultyAdvanced',
    mixed: 'libDifficultyMixed',
  } as const;
  return t(keyByDifficulty[difficulty], lang);
}

function CourseCard({
  course,
  index,
  onClick,
  onRemoveCourse,
  onRenameCourse,
  onOpenNotebookShell,
  onUpload,
  onOpenTopic,
  uploadedFiles,
  tasks = [],
  glossaryEntries = [],
  userLanguage = 'en',
}: {
  course: Course;
  index: number;
  onClick: () => void;
  onRemoveCourse?: (courseId: string) => boolean;
  onRenameCourse?: (courseId: string, title: string) => boolean;
  onOpenNotebookShell?: (courseId: string) => void;
  onUpload?: () => void;
  /** OPT-L1 — topic chip → study workspace for that topic. */
  onOpenTopic?: (topicTitle: string) => void;
  uploadedFiles: UploadedFile[];
  tasks?: Task[];
  glossaryEntries?: GlossaryEntry[];
  userLanguage?: 'en' | 'el';
}) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const canDelete = Boolean(onRemoveCourse) && !isDemoCourse(course.id);
  const deleteCopy = useMemo(() => {
    const stats = courseDeleteStats(course.id, uploadedFiles, tasks, glossaryEntries);
    return buildDeleteCourseCascadeCopy({
      lang: userLanguage,
      courseTitle: course.title,
      ...stats,
    });
  }, [course.id, course.title, uploadedFiles, tasks, glossaryEntries, userLanguage]);

  const progress = (course.completedLessons / Math.max(course.totalLessons, 1)) * 100;
  const isGenerating = course.status === 'generating';
  const canRename = Boolean(onRenameCourse) && !isDemoCourse(course.id) && !isGenerating;
  const needsReview = course.status === 'needs_review';
  const quality = course.sourceQuality;
  const showMaterialGap = Boolean(quality?.needsMoreMaterial);
  const showMisconception = Boolean(quality?.outlineAdjusted);
  const topicChips = (course.topics ?? []).filter((topic) => !isDebugUiTopicLabel(topic.title));
  const { pendingTasks, dueReviews, isStalePipeline: isOldPipeline } = selectCourseTaskMetrics(course, tasks);
  const openCourse = () => {
    if (isGenerating) return;
    prefetchWorkspaceEntry();
    onClick();
  };

  return (
    <BlueprintSurface
      as={motion.div}
      // Skip fade-in — opacity wash fails WCAG contrast mid-animation (a11y CI).
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      // Wave E14 — no role=button on card (nested Open/Notebook/Delete buttons).
      onClick={isGenerating ? undefined : openCourse}
      data-testid="library-course-card"
      {...(isGenerating ? {} : workspaceEntryPrefetchHandlers())}
      className={cn(
        /* OPT-K122 — denser wash card (no outline cage / hover border) */
        'relative p-3 border-0 transition-colors group hover:bg-surface-secondary/40',
        isGenerating
          ? 'cursor-default pointer-events-none opacity-90'
          : 'cursor-pointer',
      )}
    >
      {!isGenerating && (showMaterialGap || showMisconception) && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex max-w-[55%] flex-col items-end gap-1">
          {showMaterialGap && (
            <span
              data-testid={`library-corner-gap-${course.id}`}
              className="rounded-md border-0 bg-surface-secondary px-1.5 py-0.5 type-micro font-medium text-text-secondary"
            >
              {t('libCornerMaterialGap', userLanguage)}
            </span>
          )}
          {showMisconception && (
            <span
              data-testid={`library-corner-misconception-${course.id}`}
              className="rounded-md border-0 bg-surface-secondary/80 px-1.5 py-0.5 type-micro font-medium text-text-secondary"
            >
              {t('libCornerMisconception', userLanguage)}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between mb-2.5">
        <CourseIcon icon={course.icon} size="lg" colorClassName="text-text-secondary" />
        <div className="flex items-center gap-1">
          {canRename && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRenameOpen(true); }}
              data-testid="library-course-rename"
              className="pointer-events-auto inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border-0 p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-surface-secondary hover:text-text-secondary hover:opacity-100"
              aria-label={t('libRenameCourseAria', userLanguage)}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canDelete && !isGenerating && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRemoveDialogOpen(true); }}
              data-testid="library-course-delete"
              className="pointer-events-auto inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border-0 p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-surface-secondary hover:text-text-secondary hover:opacity-100"
              aria-label={t('libDeleteCourseAria', userLanguage)}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isOldPipeline && !isGenerating && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md type-micro font-semibold border-0 bg-surface-secondary text-text-secondary"
              title={t('libOldPipelineHint', userLanguage)}
            >
              <RefreshCw className="w-3 h-3" />
              {t('libOldPipeline', userLanguage)}
            </div>
          )}
          {isGenerating ? (
          <CourseStatusBadge kind="generating" />
        ) : needsReview ? (
          <CourseStatusBadge kind="needs_review" />
        ) : (
          <span className="type-micro text-text-tertiary font-medium capitalize px-2 py-1 rounded-md border-0 bg-surface-secondary/70">
            {courseDifficultyLabel(course.difficulty, userLanguage)}
          </span>
        )}
        </div>
      </div>

      <h3 className="type-meta font-semibold mb-0.5 text-text-primary group-hover:text-text-primary transition-colors" data-testid="library-course-title">{course.title}</h3>
      <p className="type-caption text-text-tertiary mb-2.5 line-clamp-2 leading-snug">{course.description}</p>
      {course.recognitionSummary && !isGenerating && (
        <p className="type-micro text-text-muted mb-2">
          {t('recognitionReportTitle', userLanguage)}:{' '}
          {course.recognitionSummary.conceptCount} {t('libConcepts', userLanguage)}
          {' · '}
          {course.recognitionSummary.sectionCount} {t('recognitionMetricSections', userLanguage).toLowerCase()}
        </p>
      )}
      {quality && !isGenerating && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <QualityScoreBadge score={quality.score} />
          <CourseStatusBadge kind={courseStatusKind(course)} />
        </div>
      )}
      {quality?.needsMoreMaterial && !isGenerating && (
        <p className="mb-2 type-caption text-text-secondary line-clamp-2">
          {quality.warnings[0] ?? t('libNeedsMoreHint', userLanguage)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5 type-caption text-text-tertiary mb-2">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {course.totalLessons} {t('libLessons', userLanguage)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {course.estimatedHours}h
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <BarChart3 className="w-3.5 h-3.5" />
          {course.mastery}%
        </span>
        {!isGenerating && pendingTasks > 0 && (
          <span className="flex items-center gap-1 text-text-secondary" title={t('libCardTasks', userLanguage)}>
            <List className="w-3.5 h-3.5" />
            {pendingTasks}
          </span>
        )}
        {!isGenerating && dueReviews > 0 && (
          <span className="flex items-center gap-1 text-text-secondary" title={t('libCardReviews', userLanguage)}>
            <Clock className="w-3.5 h-3.5" />
            {dueReviews}
          </span>
        )}
      </div>

      {!isGenerating && (
        <CompactProgressBar
          pct={progress}
          color={resolveCourseColor(course.color)}
          aria-label={`${course.title} ${Math.round(progress)}%`}
        />
      )}

      {isGenerating && (
        /* Wave P-2 C08 — course generation shimmer track uses --viz-bar-track. */
        <div className="w-full rounded-full h-1 overflow-hidden" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
          <div className="h-1 bg-accent-amber shimmer" style={{ width: '60%' }} />
        </div>
      )}

      {!isGenerating && (
        <div className="mt-2.5 flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            data-testid={`library-open-course-${course.id}`}
            className="flex-1 ux-solid-brand-cta"
          >
            {t('libOpenCourse', userLanguage)}
          </Button>
          {onOpenNotebookShell && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotebookShell(course.id);
              }}
              data-testid={`library-notebook-shell-${course.id}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {t('libNotebookShellShort', userLanguage)}
            </Button>
          )}
        </div>
      )}

      {!isGenerating && (
        <OverflowChipRow
          testId={`library-topic-chips-${course.id}`}
          className="mt-2.5"
          maxVisible={3}
          moreAriaLabel={(n) => t('libChipOverflowMoreAria', userLanguage).replace('{n}', String(n))}
          lessAriaLabel={t('libChipOverflowLessAria', userLanguage)}
          chipClassName="!max-w-[10rem] type-micro border-0 bg-surface-secondary/70"
          items={topicChips.map((topic) => ({
            key: topic.id,
            label: topic.title,
            title: t('libTopicOpenHint', userLanguage),
            onClick: onOpenTopic ? () => onOpenTopic(topic.title) : undefined,
          }))}
          trailing={
            onUpload ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpload();
                }}
                data-testid={`library-add-file-${course.id}`}
                className="min-h-9 rounded-md border-0 bg-surface-secondary/70 px-1.5 py-0.5 type-micro font-medium text-text-secondary hover:bg-surface-hover"
              >
                {t('libAddFileChip', userLanguage)}
              </button>
            ) : undefined
          }
        />
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {course.sourceFiles.slice(0, 2).map(f => (
            <span key={f} className="platform-meta-chip border-0 bg-surface-secondary/60 px-1.5 py-0.5 rounded truncate max-w-[100px]">
              {f}
            </span>
          ))}
          {course.sourceFiles.length > 2 && (
            <span className="platform-meta-chip border-0 bg-surface-secondary/60 px-1.5 py-0.5 rounded">
              +{course.sourceFiles.length - 2}
            </span>
          )}
        </div>
        <span className={cn(
          'platform-source-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border-0 font-medium type-micro',
          course.sourceMode === 'strict' ? 'platform-source-badge--strict' : course.sourceMode === 'enriched' ? 'platform-source-badge--enriched' : 'platform-source-badge--notes',
        )}>
          <UiIcon id={course.sourceMode === 'strict' ? 'lock' : course.sourceMode === 'enriched' ? 'sparkle' : 'notes'} size="xs" />
          {course.sourceMode === 'strict' ? t('libSourceModeStrict', userLanguage) : course.sourceMode === 'enriched' ? t('libSourceModeEnriched', userLanguage) : t('libSourceModeNotes', userLanguage)}
        </span>
      </div>
      {course.conceptCount > 0 && (
        <div className="mt-1.5 flex items-center gap-2.5 type-caption text-text-muted tabular-nums">
          <span>{course.conceptCount} {t('libConcepts', userLanguage)}</span>
          <span>{course.glossaryCount} {t('libTerms', userLanguage)}</span>
          <span>{course.exerciseCount} {t('libExercises', userLanguage)}</span>
        </div>
      )}
      {canRename && (
        <LibraryNameDialog
          open={renameOpen}
          lang={userLanguage}
          title={t('libRenameCourseTitle', userLanguage)}
          initialValue={course.title}
          testId="library-course-rename-dialog"
          onClose={() => setRenameOpen(false)}
          onSave={(title) => onRenameCourse?.(course.id, title) !== false}
        />
      )}
      {canDelete && (
        <ConfirmDialog
          open={removeDialogOpen}
          data-testid="library-course-delete-confirm"
          title={deleteCopy.title}
          description={deleteCopy.description}
          confirmLabel={t('delete', userLanguage)}
          cancelLabel={t('cancel', userLanguage)}
          destructive
          onConfirm={() => {
            onRemoveCourse?.(course.id);
            setRemoveDialogOpen(false);
          }}
          onClose={() => setRemoveDialogOpen(false)}
        />
      )}
    </BlueprintSurface>
  );
}

function CourseListItem({
  course,
  index,
  onClick,
  onRemoveCourse,
  onRenameCourse,
  onOpenNotebookShell,
  onUpload,
  onOpenTopic,
  uploadedFiles,
  tasks = [],
  glossaryEntries = [],
  userLanguage = 'en',
}: {
  course: Course;
  index: number;
  onClick: () => void;
  onRemoveCourse?: (courseId: string) => boolean;
  onRenameCourse?: (courseId: string, title: string) => boolean;
  onOpenNotebookShell?: (courseId: string) => void;
  onUpload?: () => void;
  onOpenTopic?: (topicTitle: string) => void;
  uploadedFiles: UploadedFile[];
  tasks?: Task[];
  glossaryEntries?: GlossaryEntry[];
  userLanguage?: 'en' | 'el';
}) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const canDelete = Boolean(onRemoveCourse) && !isDemoCourse(course.id);
  const deleteCopy = useMemo(() => {
    const stats = courseDeleteStats(course.id, uploadedFiles, tasks, glossaryEntries);
    return buildDeleteCourseCascadeCopy({
      lang: userLanguage,
      courseTitle: course.title,
      ...stats,
    });
  }, [course.id, course.title, uploadedFiles, tasks, glossaryEntries, userLanguage]);

  const progress = (course.completedLessons / Math.max(course.totalLessons, 1)) * 100;
  const quality = course.sourceQuality;
  const { pendingTasks, dueReviews, isStalePipeline: isOldPipeline } = selectCourseTaskMetrics(course, tasks);
  const isGenerating = course.status === 'generating';
  const canRename = Boolean(onRenameCourse) && !isDemoCourse(course.id) && !isGenerating;
  const topicChips = (course.topics ?? []).filter((topic) => !isDebugUiTopicLabel(topic.title));
  const openCourse = () => {
    if (isGenerating) return;
    prefetchWorkspaceEntry();
    onClick();
  };

  return (
    <BlueprintSurface
      as={motion.div}
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      // Wave E14 — primary open control; actions stay siblings (no nested-interactive).
      data-testid="library-course-card"
      className={cn(
        /* OPT-K122 — list row wash (no outline / hover border) */
        'flex flex-col gap-2 p-3 border-0 transition-colors group hover:bg-surface-secondary/40',
        isGenerating ? 'opacity-90' : '',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={openCourse}
        disabled={isGenerating}
        aria-label={t('libOpenCourse', userLanguage)}
        data-testid={`library-open-course-list-${course.id}`}
        {...(isGenerating ? {} : workspaceEntryPrefetchHandlers())}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-4 rounded-lg bg-transparent text-left text-text-primary',
          isGenerating
            ? 'cursor-default'
            : 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
        )}
      >
        <CourseIcon icon={course.icon} size="lg" colorClassName="text-text-secondary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold type-meta text-text-primary transition-colors truncate" data-testid="library-course-title">{course.title}</h3>
            {isOldPipeline && !isGenerating && (
              <span
                className="inline-flex items-center gap-1 rounded-md border-0 bg-surface-secondary px-1.5 py-0.5 type-caption font-medium text-text-secondary"
                title={t('libOldPipelineHint', userLanguage)}
              >
                <RefreshCw className="w-3 h-3" />
                {t('libOldPipeline', userLanguage)}
              </span>
            )}
          </div>
          <p className="mt-0.5 type-caption font-medium text-text-secondary">{course.subject} · {course.totalLessons} {t('libLessons', userLanguage)} · {course.estimatedHours}h{pendingTasks > 0 ? ` · ${pendingTasks} ${t('libCardTasks', userLanguage)}` : ''}{dueReviews > 0 ? ` · ${dueReviews} ${t('libCardReviews', userLanguage)}` : ''}</p>
          {quality && (
            <p className={cn(
              'type-caption mt-1 truncate text-text-secondary',
            )}>
              {quality.needsMoreMaterial
                ? (quality.warnings[0] ?? t('libNeedsMoreHint', userLanguage))
                : t('libSourceQualityList', userLanguage)
                    .replace('{score}', String(quality.score))
                    .replace('{modules}', String(quality.finalTopicCount))}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="w-24">
            {/* Wave P-2 C08 — library list-view mastery track uses --viz-bar-track. */}
            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: resolveCourseColor(course.color) }}
              />
            </div>
          </div>
          <span className="type-meta font-medium w-12 text-right text-text-primary">{course.mastery}%</span>
        </div>
        <span className="sm:hidden type-caption tabular-nums text-text-secondary shrink-0">{course.mastery}%</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-text-secondary" />
      </button>
      {onOpenNotebookShell && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenNotebookShell(course.id)}
          data-testid={`library-notebook-shell-list-${course.id}`}
          aria-label={t('libNotebookShellShort', userLanguage)}
          className="min-w-9 px-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('libNotebookShellShort', userLanguage)}</span>
        </Button>
      )}
      {canRename && (
        <button
          type="button"
          onClick={() => setRenameOpen(true)}
          data-testid="library-course-rename"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border-0 p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-surface-secondary hover:text-text-secondary hover:opacity-100"
          aria-label={t('libRenameCourseAria', userLanguage)}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => setRemoveDialogOpen(true)}
          data-testid="library-course-delete"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border-0 p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-surface-secondary hover:text-text-secondary hover:opacity-100"
          aria-label={t('libDeleteCourseAria', userLanguage)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      </div>
      {!isGenerating && topicChips.length > 0 && (
        <OverflowChipRow
          testId={`library-topic-chips-list-${course.id}`}
          className="pl-14 sm:pl-[4.25rem]"
          maxVisible={2}
          moreAriaLabel={(n) => t('libChipOverflowMoreAria', userLanguage).replace('{n}', String(n))}
          lessAriaLabel={t('libChipOverflowLessAria', userLanguage)}
          chipClassName="!max-w-[10rem] type-micro border-0 bg-surface-secondary/70"
          items={topicChips.map((topic) => ({
            key: topic.id,
            label: topic.title,
            title: t('libTopicOpenHint', userLanguage),
            onClick: onOpenTopic ? () => onOpenTopic(topic.title) : undefined,
          }))}
          trailing={
            onUpload ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpload();
                }}
                data-testid={`library-add-file-list-${course.id}`}
                className="min-h-9 rounded-md border-0 bg-surface-secondary/70 px-1.5 py-0.5 type-micro font-medium text-text-secondary hover:bg-surface-hover"
              >
                {t('libAddFileChip', userLanguage)}
              </button>
            ) : undefined
          }
        />
      )}
      {canRename && (
        <LibraryNameDialog
          open={renameOpen}
          lang={userLanguage}
          title={t('libRenameCourseTitle', userLanguage)}
          initialValue={course.title}
          testId="library-course-rename-dialog"
          onClose={() => setRenameOpen(false)}
          onSave={(title) => onRenameCourse?.(course.id, title) !== false}
        />
      )}
      {canDelete && (
        <ConfirmDialog
          open={removeDialogOpen}
          data-testid="library-course-delete-confirm"
          title={deleteCopy.title}
          description={deleteCopy.description}
          confirmLabel={t('delete', userLanguage)}
          cancelLabel={t('cancel', userLanguage)}
          destructive
          onConfirm={() => {
            onRemoveCourse?.(course.id);
            setRemoveDialogOpen(false);
          }}
          onClose={() => setRemoveDialogOpen(false)}
        />
      )}
    </BlueprintSurface>
  );
}

function FileItem({
  file,
  index,
  course,
  uploadedFiles,
  tasks = [],
  glossaryEntries = [],
  userSettings,
  userLanguage = 'en',
  onRemoveFile,
  onRenameFile,
  onMoveFile,
  moveCourses = [],
  moveFolders = [],
  folderName,
  onReprocessCourse,
  reprocessingMaterial = false,
  onAskSource,
}: {
  file: UploadedFile;
  index: number;
  course?: Course;
  uploadedFiles: UploadedFile[];
  tasks?: Task[];
  glossaryEntries?: GlossaryEntry[];
  userSettings?: UserSettings;
  userLanguage?: 'en' | 'el';
  onRemoveFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, name: string) => boolean;
  onMoveFile?: (fileId: string, courseId: string | null, folderId?: string | null) => boolean;
  moveCourses?: { id: string; title: string }[];
  moveFolders?: { id: string; name: string }[];
  folderName?: string;
  onReprocessCourse?: (courseId: string) => void;
  reprocessingMaterial?: boolean;
  onAskSource?: (file: UploadedFile, course?: Course) => void;
}) {
  const Icon = fileTypeIcons[file.type] || FileText;
  const pathDense = useMinimalTheme();
  const [expanded, setExpanded] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const outlinePreview = useMemo(() => {
    if (!file.extractedText?.trim() || file.status !== 'analyzed') return null;
    return buildMaterialOutlinePreview(file.extractedText, [file.name], userSettings);
  }, [file.extractedText, file.name, file.status, userSettings]);
  const recognitionSnapshot = file.documentModelSnapshot;
  const canExpand = Boolean(outlinePreview || recognitionSnapshot);
  const isError = file.status === 'error';
  const canReprocess = Boolean(
    file.courseId
    && onReprocessCourse
    && (file.status === 'analyzed' || isError),
  );
  const canRemove = Boolean(
    file.id
    && onRemoveFile
    && !file.id.startsWith('demo-file-')
    && (file.status === 'analyzed' || isError || file.status === 'uploading' || file.status === 'processing'),
  );
  const canOrganize = Boolean(
    file.id
    && !file.id.startsWith('demo-file-')
    && (file.status === 'analyzed' || isError),
  );

  const confirmRemove = () => {
    if (!file.id || !onRemoveFile) return;
    setRemoveDialogOpen(true);
  };

  const cascadeCopy = useMemo(() => {
    if (!file.courseId) {
      return buildDeleteFileCascadeCopy({
        lang: userLanguage,
        fileName: file.name,
        remainingFilesForCourse: 0,
        generatedTaskCount: 0,
        glossaryCount: 0,
      });
    }
    const remainingFilesForCourse = countFilesForCourse(
      uploadedFiles.filter((f) => f.id !== file.id),
      file.courseId,
    );
    return buildDeleteFileCascadeCopy({
      lang: userLanguage,
      fileName: file.name,
      courseTitle: course?.title,
      remainingFilesForCourse,
      generatedTaskCount: countGeneratedTasksForCourse(tasks, file.courseId),
      glossaryCount: glossaryEntries.filter((g) => g.courseId === file.courseId).length,
    });
  }, [file, uploadedFiles, course?.title, tasks, glossaryEntries, userLanguage]);

  const removeTitle = cascadeCopy.title;
  const removeDescription = cascadeCopy.description;

  const pathMeta = [
    `${(file.size / 1024).toFixed(1)} KB`,
    file.type.toUpperCase(),
    outlinePreview ? `${outlinePreview.outline.topics.length} ${t('libModules', userLanguage)}` : null,
    recognitionSnapshot ? `${recognitionSnapshot.quality.conceptCount} ${t('libConcepts', userLanguage)}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      data-testid="library-file-row"
      className="library-file-row rounded-xl border-0 bg-surface-secondary/50 overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <div className="library-file-icon w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="library-file-name type-meta font-medium truncate">
            {pathDense && course ? `${course.title}/${file.name}` : file.name}
          </p>
          <p className="library-file-meta type-caption text-text-tertiary mt-0.5">
            {pathDense
              ? pathMeta
              : (
                <>
                  {(file.size / 1024).toFixed(1)} KB · {file.type.toUpperCase()}
                  {course && <> · {course.title}</>}
                  {folderName && <> · {folderName}</>}
                  {outlinePreview && (
                    <> · {outlinePreview.outline.topics.length} {t('libModules', userLanguage)}</>
                  )}
                  {recognitionSnapshot && (
                    <> · {recognitionSnapshot.quality.conceptCount} {t('libConcepts', userLanguage)}</>
                  )}
                </>
              )}
          </p>
          {file.pipelineVersion && (
            <p className="type-micro text-text-muted mt-0.5">{t('libPipelineVersion', userLanguage).replace('{version}', file.pipelineVersion)}</p>
          )}
        </div>
        <div className="library-file-actions shrink-0 flex flex-wrap items-center justify-end gap-1.5">
          {file.status === 'uploading' && (
            <div className="flex items-center gap-2">
              {/* Wave P-2 C08 — file upload progress track uses --viz-bar-track. */}
              <div className="w-16 rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${file.progress}%` }} />
              </div>
              <span className="type-caption text-text-tertiary">{Math.round(file.progress || 0)}%</span>
            </div>
          )}
          {file.status === 'processing' && (
            <span className="flex items-center gap-1 type-caption text-text-secondary">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('libAnalyzing', userLanguage)}
            </span>
          )}
          {file.status === 'analyzed' && (
            <span className="flex items-center gap-1 type-caption text-text-secondary">
              <Sparkles className="w-3 h-3" />
              {t('libReady', userLanguage)}
            </span>
          )}
          {isError && (
            <span
              data-testid={`library-file-error-${file.id}`}
              className="flex items-center gap-1 type-caption text-text-secondary"
            >
              <AlertCircle className="w-3 h-3" />
              {t('libError', userLanguage)}
            </span>
          )}
          {file.status === 'analyzed' && (
            <button
              type="button"
              onClick={() => void openNotebookLm({
                sourceTitle: notebookLmSourceLabel(file.name, file.ingestMethod),
                lang: userLanguage,
              })}
              data-testid={`library-open-nlm-${file.id}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              title={t('libOpenNotebookLmTitle', userLanguage)}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {file.status === 'analyzed' && onAskSource && (
            <button
              type="button"
              onClick={() => onAskSource(file, course)}
              data-testid={`library-ask-source-${file.id}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              title={t('libAskSourceTitle', userLanguage)}
              aria-label={t('libAskSourceTitle', userLanguage)}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          {canReprocess && (
            <button
              type="button"
              onClick={() => file.courseId && onReprocessCourse?.(file.courseId)}
              disabled={reprocessingMaterial}
              data-testid={`library-reprocess-${file.id}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-60 transition-colors"
              title={t(isError ? 'libRetryTooltip' : 'libReprocessTooltip', userLanguage)}
              aria-label={t(isError ? 'libRetryTooltip' : 'libReprocessTooltip', userLanguage)}
            >
              <RefreshCw className={cn('w-4 h-4', reprocessingMaterial && 'animate-spin')} />
            </button>
          )}
          {canOrganize && onRenameFile && (
            <button
              type="button"
              onClick={() => setRenameOpen(true)}
              data-testid={`library-rename-${file.id}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              title={t('libRenameFileTooltip', userLanguage)}
              aria-label={t('libRenameFileTooltip', userLanguage)}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canOrganize && onMoveFile && (
            <button
              type="button"
              onClick={() => setMoveOpen(true)}
              data-testid={`library-move-${file.id}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              title={t('libMoveFileTooltip', userLanguage)}
              aria-label={t('libMoveFileTooltip', userLanguage)}
            >
              <Folder className="w-4 h-4" />
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={confirmRemove}
              data-testid={`library-remove-${file.id}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              title={t('libRemoveFileTooltip', userLanguage)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 rounded-lg border-0 hover:bg-surface-hover text-text-secondary"
              aria-expanded={expanded}
              aria-label={expanded ? t('libHideOutline', userLanguage) : t('libShowOutline', userLanguage)}
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (outlinePreview || recognitionSnapshot) && (
          <motion.div
            variants={expandHeight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={emphasizedTransition}
            className="px-3 pb-3 space-y-3"
          >
            {recognitionSnapshot && (
              <RecognitionReportPanel
                snapshot={recognitionSnapshot}
                compact
                language={userLanguage}
              />
            )}
            {outlinePreview && (
              <OutlinePreviewPanel
                preview={outlinePreview}
                compact
                language={userLanguage}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    <ConfirmDialog
      open={removeDialogOpen}
      onClose={() => setRemoveDialogOpen(false)}
      onConfirm={() => {
        if (file.id && onRemoveFile) onRemoveFile(file.id);
        setRemoveDialogOpen(false);
      }}
      title={removeTitle}
      description={removeDescription}
      confirmLabel={t('remove', userLanguage)}
      cancelLabel={t('cancel', userLanguage)}
      destructive
      data-testid={`library-remove-dialog-${file.id}`}
    />
    {canOrganize && onRenameFile && (
      <LibraryNameDialog
        open={renameOpen}
        lang={userLanguage}
        title={t('libRenameFileTitle', userLanguage)}
        initialValue={file.name}
        testId={`library-file-rename-dialog-${file.id}`}
        onClose={() => setRenameOpen(false)}
        onSave={(name) => onRenameFile(file.id, name) !== false}
      />
    )}
    {canOrganize && onMoveFile && (
      <LibraryMoveFileDialog
        open={moveOpen}
        lang={userLanguage}
        fileName={file.name}
        currentCourseId={file.courseId}
        currentFolderId={file.folderId}
        courses={moveCourses}
        folders={moveFolders}
        onClose={() => setMoveOpen(false)}
        onMove={(courseId, nextFolderId) => onMoveFile(file.id, courseId, nextFolderId) !== false}
      />
    )}
    </>
  );
}
