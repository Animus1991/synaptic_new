import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition, expandHeight } from '../lib/motion';
import {
  Search, Upload, BookOpen, FileText, ChevronRight, ChevronDown,
  Clock, BarChart3, Sparkles, Grid3X3, List, Loader2,
  File, Image, Code, Presentation, Table2, Trash2, RefreshCw, ExternalLink, X,
} from '@/lib/lucide-shim';
import type { Course, UploadedFile, UserSettings, Task, GlossaryEntry } from '../types';
import { cn } from '../utils/cn';
import { prefetchWorkspaceEntry, workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';
import { buildMaterialOutlinePreview } from '../lib/uploadOutlinePreview';
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
import { canAutoSyncLibrary } from '../lib/libraryRemoteSync';
import { selectCourseTaskMetrics } from '../lib/coursePageSelectors';
import {
  loadLibraryViewPrefs,
  saveLibraryViewPrefs,
  type LibraryFilter,
  type LibrarySortBy,
  type LibraryViewMode,
} from '../lib/libraryViewPrefs';
import type { LibrarySyncConflictItem } from '../lib/librarySync';
import { CourseIcon } from './ui/CourseIcon';
import { AllCapsLabel } from './ui/AllCapsLabel';
import { UiIcon } from './ui/UiIcon';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { PostUploadBanner } from './ui/PostUploadBanner';
import { Page, PageHeader, PrimaryCTA } from './ui/primitives';
import { useWarmSandPageScope, warmSandScopeProps } from '../lib/useDocumentTheme';
import { DescriptiveStickyTabBar, InfoStack, MiniAlert } from './ui/platformChrome';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { t } from '../lib/i18n';
import { RagIndexProgressBanner } from './RagIndexProgressBanner';
import { CrossLibrarySynthesisPanel } from './CrossLibrarySynthesisPanel';
import { NotebookLmImportPanel } from './NotebookLmImportPanel';
import { LibrarySyncConflictPanel } from './LibrarySyncConflictPanel';
import { showCrossLibrarySynthesis } from '../lib/platformFocus';
import type { NotebookLmImportResult } from '../lib/notebooklmImport';
import { openNotebookLm, notebookLmSourceLabel } from '../lib/notebooklmBridge';
import { isDebugUiTopicLabel } from '../lib/knowledgeFlowAnalytics';
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

interface LibraryProps {
  courses: Course[];
  uploadedFiles: UploadedFile[];
  onSelectCourse: (course: Course) => void;
  onRemoveCourse?: (courseId: string) => boolean;
  onUpload: () => void;
  onRemoveFile?: (fileId: string) => void;
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

export function Library({
  courses,
  uploadedFiles,
  onSelectCourse,
  onRemoveCourse,
  onUpload,
  onRemoveFile,
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
  const [entryHintDismissed, setEntryHintDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('synapse:library-hint-dismiss') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!prefsReadyRef.current) {
      prefsReadyRef.current = true;
      return;
    }
    saveLibraryViewPrefs({ filter, viewMode, sortBy });
  }, [filter, viewMode, sortBy]);

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
        label: t('libCoursesStat', userLanguage).replace('{count}', String(courses.length)),
        summary: t('libCoursesStatReady', userLanguage),
        count: courses.length,
      },
      {
        id: 'files' as const,
        label: t('libFilesStat', userLanguage).replace('{count}', String(uploadedFiles.length)),
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
      className={cn(isMinimal && 'library-calm library-files-density')}
      data-testid="library-page"
    >
    <Page gap="sm">
      <PageHeader
        eyebrow={t('library', userLanguage)}
        title={t('libraryPageTitle', userLanguage)}
        subtitle={t('librarySubtitle', userLanguage)}
        icon={BookOpen}
        actions={
          <PrimaryCTA onClick={onUpload} data-testid="library-upload" data-tour="library-upload" className="whitespace-nowrap">
            <Upload className="w-4 h-4" aria-hidden="true" />
            {t('libUpload', userLanguage)}
          </PrimaryCTA>
        }
      />

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
            className="text-xs text-text-secondary px-0.5"
            data-testid="library-demo-sandbox-hint"
          >
            {t('libraryDemoSandboxHint', userLanguage)}
          </p>
        )}
        {userSettings && canAutoSyncLibrary(userSettings) && (
          <p
            className="text-xs text-text-muted px-0.5"
            data-testid="library-sync-signed-in-hint"
          >
            {t('librarySyncSignedInHint', userLanguage)}
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
          >
            <div className="space-y-3 px-1 pb-2">
              {onImportNotebookLm && (
                <NotebookLmImportPanel
                  lang={userLanguage}
                  onImport={onImportNotebookLm}
                  onAddToFsrs={onAddNotebookLmToFsrs}
                />
              )}

              {showCrossLibrarySynthesis() && (
                <CrossLibrarySynthesisPanel
                  courses={courses}
                  settings={userSettings}
                  lang={userLanguage}
                />
              )}

              {!entryHintDismissed && (
                <div
                  data-testid="library-tip-banner"
                  className="flex items-start justify-between gap-3 rounded-xl border border-dashed border-brand-500/35 bg-surface-card/40 px-3 py-2"
                >
                  <p className="text-xs text-text-secondary">
                    <span className="font-semibold text-brand-800">{t('libraryTipLabel', userLanguage)}</span>{' '}
                    {t('libraryEntryHint', userLanguage)}
                  </p>
                  <button
                    type="button"
                    onClick={dismissEntryHint}
                    className="shrink-0 text-text-muted hover:text-text-secondary p-0.5"
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

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            placeholder={t('libSearchPlaceholder', userLanguage)}
            aria-label={t('libSearchAria', userLanguage)}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-md bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('libClearSearch', userLanguage)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
        {tab === 'courses' && (
          <div className="flex items-center gap-2 flex-wrap">
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
                    'platform-pill px-3 py-1.5 rounded-md text-xs transition-colors border',
                    active ? 'platform-pill-active' : '',
                    f === 'attention' && active ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber' : '',
                  )}
                  style={{ fontFamily: 'var(--font-mono)' }}
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
              className="h-8 rounded-md border border-border-subtle bg-surface-input px-2 text-xs text-text-primary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40"
            >
              <option value="recent">{t('libSortRecent', userLanguage)}</option>
              <option value="progress">{t('libSortProgress', userLanguage)}</option>
              <option value="quality">{t('libSortQuality', userLanguage)}</option>
              <option value="title">{t('libSortTitle', userLanguage)}</option>
            </select>
            <div className="hidden sm:flex items-center border border-border-subtle rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label={t('libGridView', userLanguage)}
                aria-pressed={viewMode === 'grid'}
                className={cn('p-2', viewMode === 'grid' ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary hover:text-text-secondary')}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label={t('libListView', userLanguage)}
                aria-pressed={viewMode === 'list'}
                className={cn('p-2 border-l border-border-subtle', viewMode === 'list' ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary hover:text-text-secondary')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'courses' && (
          <motion.div
            key="courses"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={emphasizedTransition}
          >
            {!search.trim() && filteredCourses.length === 0 && (
              <button
                type="button"
                onClick={onUpload}
                data-testid="library-drop-zone"
                className="ux-library-drop-zone ux-prompt-bar-surface mb-2 flex w-full flex-col items-center gap-2 px-6 py-8 text-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <Upload className="h-8 w-8 text-brand-600" aria-hidden />
                <span className="text-sm font-medium">
                  {t('libDropZoneTitle', userLanguage)}
                </span>
                <span className="text-xs text-text-muted">
                  {t('libDropZoneFormats', userLanguage)}
                </span>
              </button>
            )}
            {filteredCourses.length === 0 ? (
              <PlatformEmptyState
                title={search.trim() || filter !== 'all' ? t('libNoMatchingCoursesTitle', userLanguage) : t('libraryEmptyCoursesTitle', userLanguage)}
                description={search.trim() || filter !== 'all' ? t('libNoMatchingCoursesDescription', userLanguage) : t('libraryEmptyCoursesDescription', userLanguage)}
                actionLabel={search.trim() || filter !== 'all' ? undefined : t('libUploadMaterial', userLanguage)}
                onAction={search.trim() || filter !== 'all' ? undefined : onUpload}
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
                        onOpenNotebookShell={onOpenNotebookShell}
                        onUpload={onUpload}
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
                        onOpenNotebookShell={onOpenNotebookShell}
                      />
                    )
                  ))}
                  {!search.trim() && (libraryQualityAlerts.needsMaterial || libraryQualityAlerts.outlineAdjusted) && (
                    <CollapsibleChromeSection
                      title={t('chromeAlerts', userLanguage)}
                      data-testid="library-quality-alerts-chrome"
                      defaultOpen
                    >
                      <div className="space-y-2 px-1 pb-2">
                        {libraryQualityAlerts.needsMaterial && (
                          <MiniAlert
                            tone="amber"
                            title={t('libraryMiniAlertGapTitle', userLanguage)}
                            body={t('libraryMiniAlertGapBody', userLanguage)}
                            actionLabel={t('libraryMiniAlertUploadAction', userLanguage)}
                            onAction={onUpload}
                          />
                        )}
                        {libraryQualityAlerts.outlineAdjusted && (
                          <MiniAlert
                            tone="violet"
                            title={t('libraryMiniAlertContradictionTitle', userLanguage)}
                            body={t('libraryMiniAlertContradictionBody', userLanguage)}
                            actionLabel={t('libraryMiniAlertUploadAction', userLanguage)}
                            onAction={onUpload}
                          />
                        )}
                      </div>
                    </CollapsibleChromeSection>
                  )}
                </div>
                {!search.trim() && (libraryInfo.topics.length > 0 || libraryInfo.examples.length > 0) && (
                  <div
                    className="library-info-stacks grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-2.5"
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
                )}
                {!search.trim() && (
                  <button
                    type="button"
                    onClick={onUpload}
                    data-testid="library-drop-zone-compact"
                    className="ux-library-drop-zone ux-library-drop-zone--compact ux-prompt-bar-surface flex w-full flex-row items-center justify-center gap-3 px-4 py-2.5 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Upload className="h-5 w-5 text-brand-600 shrink-0" aria-hidden />
                    <span className="text-sm font-medium">{t('libDropZoneCompactTitle', userLanguage)}</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'files' && (
          <motion.div
            key="files"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={emphasizedTransition}
          >
            {filteredFiles.length === 0 ? (
              <PlatformEmptyState
                title={search.trim() ? t('libNoMatchingFilesTitle', userLanguage) : t('libraryEmptyFilesTitle', userLanguage)}
                description={search.trim() ? t('libNoMatchingFilesDescription', userLanguage) : t('libraryEmptyFilesDescription', userLanguage)}
                actionLabel={search.trim() ? undefined : t('libUploadMaterial', userLanguage)}
                onAction={search.trim() ? undefined : onUpload}
                secondaryActionLabel={search.trim() ? t('libClearSearch', userLanguage) : t('libViewCourses', userLanguage)}
                onSecondaryAction={search.trim() ? () => setSearch('') : () => setTab('courses')}
              />
            ) : (
              <div className={cn('space-y-2', isMinimal && 'library-files-dense')}>
                {filteredFiles.map((file, i) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    index={i}
                    course={courses.find((c) => c.id === file.courseId)}
                    uploadedFiles={uploadedFiles}
                    tasks={tasks}
                    glossaryEntries={glossaryEntries}
                    userSettings={userSettings}
                    userLanguage={userLanguage}
                    onRemoveFile={onRemoveFile}
                    onReprocessCourse={onReprocessCourse}
                    reprocessingMaterial={reprocessingMaterial}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
  const needsReview = course.status === 'needs_review';
  const quality = course.sourceQuality;
  const showMaterialGap = Boolean(quality?.needsMoreMaterial);
  const showMisconception = Boolean(quality?.outlineAdjusted);
  const topicChips = (course.topics ?? []).filter((topic) => !isDebugUiTopicLabel(topic.title));
  const { pendingTasks, dueReviews, isStalePipeline: isOldPipeline } = selectCourseTaskMetrics(course, tasks);

  return (
    <BlueprintSurface
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => {
        if (isGenerating) return;
        prefetchWorkspaceEntry();
        onClick();
      }}
      data-testid="library-course-card"
      {...(isGenerating ? {} : workspaceEntryPrefetchHandlers())}
      className={cn(
        'relative p-3.5 hover:border-brand-500/35 transition-all group',
        isGenerating ? 'cursor-default pointer-events-none opacity-90' : 'cursor-pointer',
      )}
    >
      {!isGenerating && (showMaterialGap || showMisconception) && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex max-w-[55%] flex-col items-end gap-1">
          {showMaterialGap && (
            <span
              data-testid={`library-corner-gap-${course.id}`}
              className="rounded-md border border-accent-amber/40 bg-accent-amber/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-amber"
            >
              <AllCapsLabel>{t('libCornerMaterialGap', userLanguage)}</AllCapsLabel>
            </span>
          )}
          {showMisconception && (
            <span
              data-testid={`library-corner-misconception-${course.id}`}
              className="rounded-md border border-brand-500/35 bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700"
            >
              <AllCapsLabel>{t('libCornerMisconception', userLanguage)}</AllCapsLabel>
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <CourseIcon icon={course.icon} size="lg" colorClassName="text-brand-600" />
        <div className="flex items-center gap-1">
          {canDelete && !isGenerating && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRemoveDialogOpen(true); }}
              data-testid="library-course-delete"
              className="pointer-events-auto rounded-lg p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-accent-rose/10 hover:text-accent-rose hover:opacity-100"
              aria-label={t('libDeleteCourseAria', userLanguage)}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isOldPipeline && !isGenerating && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
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
          <span className="text-[10px] text-text-tertiary font-medium capitalize px-2 py-1 rounded-full border border-border-subtle">
            {courseDifficultyLabel(course.difficulty, userLanguage)}
          </span>
        )}
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-1 text-text-primary group-hover:text-brand-700 transition-colors" data-testid="library-course-title">{course.title}</h3>
      <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{course.description}</p>
      {course.recognitionSummary && !isGenerating && (
        <p className="text-[10px] text-text-muted mb-2">
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
        <p className="mb-2.5 text-[11px] text-accent-amber line-clamp-2">
          {quality.warnings[0] ?? t('libNeedsMoreHint', userLanguage)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary mb-2.5">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {course.totalLessons} {t('libLessons', userLanguage)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {course.estimatedHours}h
        </span>
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" />
          {course.mastery}%
        </span>
        {!isGenerating && pendingTasks > 0 && (
          <span className="flex items-center gap-1 text-accent-cyan" title={t('libCardTasks', userLanguage)}>
            <List className="w-3.5 h-3.5" />
            {pendingTasks}
          </span>
        )}
        {!isGenerating && dueReviews > 0 && (
          <span className="flex items-center gap-1 text-accent-amber" title={t('libCardReviews', userLanguage)}>
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
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            data-testid={`library-open-course-${course.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 text-white px-2 py-1.5 text-xs font-semibold hover:bg-brand-600 transition-colors"
          >
            {t('libOpenCourse', userLanguage)}
          </button>
          {onOpenNotebookShell && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotebookShell(course.id);
              }}
              data-testid={`library-notebook-shell-${course.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/5 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-500/10 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {t('libNotebookShellShort', userLanguage)}
            </button>
          )}
        </div>
      )}

      {!isGenerating && (
        <OverflowChipRow
          testId={`library-topic-chips-${course.id}`}
          className="mt-3"
          maxVisible={3}
          moreAriaLabel={(n) => t('libChipOverflowMoreAria', userLanguage).replace('{n}', String(n))}
          lessAriaLabel={t('libChipOverflowLessAria', userLanguage)}
          chipClassName="!max-w-[10rem] text-[10px] sm:text-xs"
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
                className="rounded-md border border-dashed border-brand-500/40 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-brand-700 hover:bg-brand-500/10"
              >
                {t('libAddFileChip', userLanguage)}
              </button>
            ) : undefined
          }
        />
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {course.sourceFiles.slice(0, 2).map(f => (
            <span key={f} className="platform-meta-chip px-1.5 py-0.5 rounded truncate max-w-[100px]">
              {f}
            </span>
          ))}
          {course.sourceFiles.length > 2 && (
            <span className="platform-meta-chip px-1.5 py-0.5 rounded">
              +{course.sourceFiles.length - 2}
            </span>
          )}
        </div>
        <span className={cn(
          'platform-source-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium',
          course.sourceMode === 'strict' ? 'platform-source-badge--strict' : course.sourceMode === 'enriched' ? 'platform-source-badge--enriched' : 'platform-source-badge--notes',
        )}>
          <UiIcon id={course.sourceMode === 'strict' ? 'lock' : course.sourceMode === 'enriched' ? 'sparkle' : 'notes'} size="xs" />
          {course.sourceMode === 'strict' ? t('libSourceModeStrict', userLanguage) : course.sourceMode === 'enriched' ? t('libSourceModeEnriched', userLanguage) : t('libSourceModeNotes', userLanguage)}
        </span>
      </div>
      {course.conceptCount > 0 && (
        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          <span>{course.conceptCount} {t('libConcepts', userLanguage)}</span>
          <span>{course.glossaryCount} {t('libTerms', userLanguage)}</span>
          <span>{course.exerciseCount} {t('libExercises', userLanguage)}</span>
        </div>
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
  onOpenNotebookShell,
  uploadedFiles,
  tasks = [],
  glossaryEntries = [],
  userLanguage = 'en',
}: {
  course: Course;
  index: number;
  onClick: () => void;
  onRemoveCourse?: (courseId: string) => boolean;
  onOpenNotebookShell?: (courseId: string) => void;
  uploadedFiles: UploadedFile[];
  tasks?: Task[];
  glossaryEntries?: GlossaryEntry[];
  userLanguage?: 'en' | 'el';
}) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
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

  return (
    <BlueprintSurface
      as={motion.div}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      data-testid="library-course-card"
      {...workspaceEntryPrefetchHandlers()}
      className="flex items-center gap-4 p-4 hover:border-brand-500/35 cursor-pointer transition-all group"
    >
      <CourseIcon icon={course.icon} size="lg" colorClassName="text-brand-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm group-hover:text-brand-300 transition-colors truncate" data-testid="library-course-title">{course.title}</h3>
          {isOldPipeline && !isGenerating && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-amber"
              title={t('libOldPipelineHint', userLanguage)}
            >
              <RefreshCw className="w-3 h-3" />
              {t('libOldPipeline', userLanguage)}
            </span>
          )}
        </div>
        <p className="text-xs text-text-tertiary mt-0.5">{course.subject} · {course.totalLessons} {t('libLessons', userLanguage)} · {course.estimatedHours}h{pendingTasks > 0 ? ` · ${pendingTasks} ${t('libCardTasks', userLanguage)}` : ''}{dueReviews > 0 ? ` · ${dueReviews} ${t('libCardReviews', userLanguage)}` : ''}</p>
        {quality && (
          <p className={cn(
            'text-[11px] mt-1 truncate',
            quality.needsMoreMaterial ? 'text-accent-amber' : 'text-text-muted',
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
        <span className="text-sm font-medium w-12 text-right">{course.mastery}%</span>
      </div>
      {onOpenNotebookShell && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenNotebookShell(course.id); }}
          data-testid={`library-notebook-shell-list-${course.id}`}
          className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-brand-500/30 px-2 py-1 text-[10px] font-medium text-brand-700 hover:bg-brand-500/10"
        >
          <BookOpen className="w-3 h-3" />
          {t('libNotebookShellShort', userLanguage)}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setRemoveDialogOpen(true); }}
          data-testid="library-course-delete"
          className="rounded-lg p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-accent-rose/10 hover:text-accent-rose hover:opacity-100"
          aria-label={t('libDeleteCourseAria', userLanguage)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand-400" />
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
  onReprocessCourse,
  reprocessingMaterial = false,
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
  onReprocessCourse?: (courseId: string) => void;
  reprocessingMaterial?: boolean;
}) {
  const Icon = fileTypeIcons[file.type] || FileText;
  const pathDense = useMinimalTheme();
  const [expanded, setExpanded] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const outlinePreview = useMemo(() => {
    if (!file.extractedText?.trim() || file.status !== 'analyzed') return null;
    return buildMaterialOutlinePreview(file.extractedText, [file.name], userSettings);
  }, [file.extractedText, file.name, file.status, userSettings]);
  const recognitionSnapshot = file.documentModelSnapshot;
  const canExpand = Boolean(outlinePreview || recognitionSnapshot);
  const canReprocess = Boolean(file.courseId && onReprocessCourse && file.status === 'analyzed');

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
      className="library-file-row rounded-xl border border-border-subtle bg-surface-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <div className="library-file-icon w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="library-file-name text-sm font-medium truncate">
            {pathDense && course ? `${course.title}/${file.name}` : file.name}
          </p>
          <p className="library-file-meta text-xs text-text-tertiary mt-0.5">
            {pathDense
              ? pathMeta
              : (
                <>
                  {(file.size / 1024).toFixed(1)} KB · {file.type.toUpperCase()}
                  {course && <> · {course.title}</>}
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
            <p className="text-[10px] text-text-muted mt-0.5">{t('libPipelineVersion', userLanguage).replace('{version}', file.pipelineVersion)}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {file.status === 'uploading' && (
            <div className="flex items-center gap-2">
              {/* Wave P-2 C08 — file upload progress track uses --viz-bar-track. */}
              <div className="w-16 rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${file.progress}%` }} />
              </div>
              <span className="text-xs text-text-tertiary">{Math.round(file.progress || 0)}%</span>
            </div>
          )}
          {file.status === 'processing' && (
            <span className="flex items-center gap-1 text-xs text-accent-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('libAnalyzing', userLanguage)}
            </span>
          )}
          {file.status === 'analyzed' && (
            <span className="flex items-center gap-1 text-xs text-accent-emerald">
              <Sparkles className="w-3 h-3" />
              {t('libReady', userLanguage)}
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
              className="p-1.5 rounded-lg border border-brand-500/30 text-brand-600 hover:bg-brand-500/10 transition-colors"
              title={t('libOpenNotebookLmTitle', userLanguage)}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {canReprocess && (
            <button
              type="button"
              onClick={() => file.courseId && onReprocessCourse?.(file.courseId)}
              disabled={reprocessingMaterial}
              data-testid={`library-reprocess-${file.id}`}
              className="p-1.5 rounded-lg border border-brand-500/30 text-brand-300 hover:bg-brand-500/10 disabled:opacity-60 transition-colors"
              title={t('libReprocessTooltip', userLanguage)}
            >
              <RefreshCw className={cn('w-4 h-4', reprocessingMaterial && 'animate-spin')} />
            </button>
          )}
          {file.id && onRemoveFile && file.status === 'analyzed' && (
            <button
              type="button"
              onClick={confirmRemove}
              data-testid={`library-remove-${file.id}`}
              className="p-1.5 rounded-lg border border-accent-rose/30 text-accent-rose hover:bg-accent-rose/10 transition-colors"
              title={t('libRemoveFileTooltip', userLanguage)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary"
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
    </>
  );
}
