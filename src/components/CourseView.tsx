import { useState, useMemo, useEffect } from 'react';
import { prefetchWorkspaceEntry, workspaceEntryPrefetchHandlers } from '../features/workspace';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BookOpen, Clock, BarChart3, Calendar, FileText,
  Lock, CheckCircle2, Circle, ChevronRight, Brain, Target,
  AlertTriangle, Sparkles, Play, MapPin, Upload, Trash2, RefreshCw, Lightbulb,
} from '@/lib/lucide-shim';
import type { Course, Topic, UploadedFile, GlossaryEntry, Task, UserSettings, LearnerModel } from '../types';
import { cn } from '../utils/cn';
import { ConceptGraph } from './visuals/ConceptGraph';
import { ProgressTimeline } from './visuals/DiagramGenerator';
import { ReadinessRing } from './visuals/ReadinessRing';
import { findConceptSpan } from '../lib/conceptProvenance';
import { GoToSourceButton } from './GoToSourceButton';
import { WorkspaceSourceStatusBar } from './workspace/WorkspaceSourceStatusBar';
import { courseQualityDismissKey, shouldShowCourseQualityBanner } from '../lib/courseQualityBanner';
import { buildReprocessPreview } from '../lib/reprocessPreview';
import { ReprocessPreviewModal } from './ReprocessPreviewModal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { AllCapsLabel } from './ui/AllCapsLabel';
import { useI18n } from '../lib/i18n';
import { buildDeleteFileCascadeCopy } from '../lib/deleteFileCascadeCopy';
import { buildDeleteCourseCascadeCopy } from '../lib/deleteCourseCascadeCopy';
import { countFilesForCourse } from '../lib/deleteCascade';
import { countGeneratedTasksForCourse } from '../lib/pipelineReprocess';
import { MASTERY_VAR, resolveCourseColor } from '../lib/masteryPalette';
import { courseDeleteStats } from '../lib/removeCourse';
import {
  readPersistedCourseTab,
  selectCoursePageStats,
  writePersistedCourseTab,
  type CourseTabId,
} from '../lib/coursePageSelectors';
import { syncCourseDeepLinkToUrl } from '../lib/courseDeepLink';
import { isDemoCourse } from '../lib/demoMode';
import { conceptGraphToCourseVisual, summarizeCourseGraph } from '../lib/courseConceptGraph';
import { PostUploadBanner } from './ui/PostUploadBanner';
import { AudioStudyGuideButton } from './AudioStudyGuideButton';
import { StudyGuideExportButton } from './StudyGuideExportButton';
import { VideoSummarizeButton } from './VideoSummarizeButton';
import { CourseMediaPanel } from './CourseMediaPanel';
import { NotebookLmExportPanel } from './NotebookLmExportPanel';
import { Page, PageHeader, PrimaryCTA, SecondaryCTA, AnimatedCard } from './ui/primitives';
import { Button } from './ui/Button';
import { PlatformEmptyState } from './ui/PlatformEmptyState';
import { QualityReportPanel } from './QualityReportPanel';
import { SectionHeader, TrustBadgeRow, UxCallout, DescriptiveStickyTabBar } from './ui/platformChrome';
import { McpCourseArtifactsPanel } from './course/McpCourseArtifactsPanel';

interface CourseViewProps {
  course: Course;
  uploadedFiles?: UploadedFile[];
  glossaryEntries?: GlossaryEntry[];
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  onBack: () => void;
  /** Open the Study Workspace. When a topic title is passed, the workspace opens
   * focused on that concept; otherwise it resumes the course's default entry. */
  onStartLesson: (topicTitle?: string) => void;
  onOpenAgent: () => void;
  onUploadMore?: () => void;
  onReprocessMaterial?: () => boolean | void;
  onSaveCourseExtractedText?: (courseId: string, text: string) => boolean;
  reprocessingMaterial?: boolean;
  onRemoveFile?: (fileId: string) => void;
  onRemoveCourse?: (courseId: string) => boolean;
  tasks?: Task[];
  showPostUploadBanner?: boolean;
  onDismissPostUpload?: () => void;
  userSettings?: UserSettings;
  onImportAudioTranscript?: (raw: string, courseId: string) => boolean;
  onUploadAudio?: (file: File, courseId: string) => Promise<boolean>;
  onAddAudioToFsrs?: (fileId: string, courseId: string) => void;
  learnerModel?: LearnerModel;
}

/** Real per-topic lesson count: explicit lessons if present, else derived from
 * the topic's concept density (2-6 micro-lessons). No placeholders. */
function topicLessonCount(topic: Topic): number {
  if (topic.lessons.length > 0) return topic.lessons.length;
  const concepts = topic.keyConcepts?.length || topic.conceptCount || 0;
  return Math.min(6, Math.max(2, Math.ceil(concepts / 2)));
}

type CourseTab = CourseTabId;

function buildSourcePreviewText(file: UploadedFile, course: Course): string | null {
  if (file.extractedText?.trim()) {
    const text = file.extractedText.replace(/\s+/g, ' ').trim();
    return text.length > 160 ? `${text.slice(0, 157)}…` : text;
  }
  const span = course.conceptSpans?.find((s) => s.fileId === file.id && s.sentence?.trim());
  if (span?.sentence) {
    const sentence = span.sentence.replace(/\s+/g, ' ').trim();
    return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
  }
  return null;
}

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function CourseView({
  course,
  uploadedFiles = [],
  glossaryEntries = [],
  onGoToSource,
  onBack,
  onStartLesson,
  onOpenAgent,
  onUploadMore,
  onReprocessMaterial,
  onSaveCourseExtractedText,
  reprocessingMaterial = false,
  onRemoveFile,
  onRemoveCourse,
  tasks = [],
  showPostUploadBanner = false,
  onDismissPostUpload,
  userSettings,
  onImportAudioTranscript,
  onUploadAudio,
  onAddAudioToFsrs,
  learnerModel,
}: CourseViewProps) {
  const [tab, setTab] = useState<CourseTab>(() => readPersistedCourseTab(course.id) ?? 'path');
  const [reprocessWizardOpen, setReprocessWizardOpen] = useState(false);
  const [reprocessApplied, setReprocessApplied] = useState(false);
  const [removeCourseOpen, setRemoveCourseOpen] = useState(false);
  const [qualityDismissed, setQualityDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(courseQualityDismissKey(course.id)) === '1';
    } catch {
      return false;
    }
  });
  const { lang, t } = useI18n();
  const pageStats = useMemo(() => selectCoursePageStats(course, tasks), [course, tasks]);
  const progress = pageStats.progressPercent;
  const graphSummary = useMemo(() => summarizeCourseGraph(course.conceptGraph), [course.conceptGraph]);
  const courseFileCount = useMemo(
    () => uploadedFiles.filter((f) => f.courseId === course.id).length,
    [uploadedFiles, course.id],
  );
  const courseTabs = useMemo(
    () => [
      { id: 'path' as const, label: t('courseTabPath'), summary: t('courseTabPathSummary'), count: course.topics.length },
      { id: 'map' as const, label: t('courseTabMap'), summary: t('courseTabMapSummary'), count: graphSummary.nodeCount },
      { id: 'sources' as const, label: t('courseTabSources'), summary: t('courseTabSourcesSummary'), count: courseFileCount },
      { id: 'analytics' as const, label: t('courseTabAnalytics'), summary: t('courseTabAnalyticsSummary'), count: course.topics.length },
    ],
    [t, course.topics.length, graphSummary.nodeCount, courseFileCount],
  );
  const quality = course.sourceQuality;
  const needsSourceUpgrade = Boolean(quality && (quality.needsMoreMaterial || quality.outlineAdjusted));
  const qualityBanner = shouldShowCourseQualityBanner({
    course,
    uploadedFiles,
    hasReuploadHandler: Boolean(onUploadMore),
  });
  const showReuploadHint = qualityBanner.showMigrationBanner;
  const showPre24Greek = qualityBanner.showPre24Greek;
  const showQualityBar = !qualityDismissed && (showReuploadHint || showPre24Greek || qualityBanner.show);

  const dismissQualityBar = () => {
    try {
      sessionStorage.setItem(courseQualityDismissKey(course.id), '1');
    } catch {
      /* ignore */
    }
    setQualityDismissed(true);
  };

  const openReprocessWizard = () => {
    if (reprocessingMaterial) return;
    setReprocessApplied(false);
    setReprocessWizardOpen(true);
  };

  useEffect(() => {
    writePersistedCourseTab(course.id, tab);
    syncCourseDeepLinkToUrl(course.id, tab);
  }, [course.id, tab]);

  useEffect(() => {
    const persisted = readPersistedCourseTab(course.id);
    if (persisted) setTab(persisted);
  }, [course.id]);

  const reprocessPreview = useMemo(() => {
    if (!reprocessWizardOpen) return null;
    return buildReprocessPreview(course, uploadedFiles, lang);
  }, [reprocessWizardOpen, course, uploadedFiles, lang]);

  const canDeleteCourse = Boolean(onRemoveCourse) && !isDemoCourse(course.id);
  const deleteCourseCopy = useMemo(() => {
    const stats = courseDeleteStats(course.id, uploadedFiles, tasks, glossaryEntries);
    return buildDeleteCourseCascadeCopy({
      lang,
      courseTitle: course.title,
      ...stats,
    });
  }, [course.id, course.title, uploadedFiles, tasks, glossaryEntries, lang]);

  const handleApplyReprocess = (editedText?: string) => {
    if (editedText && onSaveCourseExtractedText) {
      onSaveCourseExtractedText(course.id, editedText);
    }
    if (!onReprocessMaterial) return;
    const ok = onReprocessMaterial();
    if (ok !== false) setReprocessApplied(true);
  };

  /** B10/B11 — warm workspace + reader chunks while viewing course overview. */
  useEffect(() => {
    prefetchWorkspaceEntry();
  }, [course.id]);

  return (
    <Page
      className="course-page shell-edge-balance"
      gap="sm"
      data-testid="course-page"
      data-border-diet="cta-only"
      data-bleed="full"
      data-soft-sep="stack"
    >
      {/* OPT-K118 — course clarity: wash surfaces, width/type parity with dashboard */}
      <button
        type="button"
        onClick={onBack}
        data-testid="course-back"
        data-soft-card="off"
        className="inline-flex min-h-9 items-center gap-1.5 type-meta text-text-secondary hover:text-text-primary mb-1 transition-colors -mt-1"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('courseBackToLibrary')}
      </button>

      <PageHeader
        eyebrow={t('courseEyebrow')}
        title={<span data-testid="course-title">{course.title}</span>}
        subtitle={
          <>
            <span className="block max-w-xl">{course.description}</span>
            <span className="mt-2 flex flex-wrap items-center gap-3 type-caption text-text-tertiary">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {t('courseStatLessons').replace('{count}', String(course.totalLessons))}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {t('courseStatHours').replace('{hours}', String(course.estimatedHours))}
              </span>
              <span className="flex items-center gap-1" data-testid="course-stat-mastery">
                <BarChart3 className="w-3.5 h-3.5" />
                {pageStats.masteryPercent}% {t('courseStatMastery').toLowerCase()}
              </span>
              {course.examDate && (
                <span className="flex items-center gap-1 text-accent-amber">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('courseExamLabel').replace('{date}', new Date(course.examDate).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US'))}
                </span>
              )}
            </span>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2 shrink-0">
            {canDeleteCourse && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setRemoveCourseOpen(true)}
                data-testid="course-delete"
                aria-label={t('deleteCourseAria')}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('deleteLabel')}</span>
              </Button>
            )}
            {needsSourceUpgrade && onUploadMore && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onUploadMore}
                data-testid="course-upload-more"
              >
                <Upload className="w-4 h-4" />
                {t('coursePathEmptyAction')}
              </Button>
            )}
            <SecondaryCTA onClick={onOpenAgent} data-testid="course-ask-agent">
              <Sparkles className="w-4 h-4 text-text-secondary" />
              {t('askAgentShort')}
            </SecondaryCTA>
            <AudioStudyGuideButton course={course} lang={lang} settings={userSettings} />
            <StudyGuideExportButton course={course} glossaryEntries={glossaryEntries} lang={lang} />
            <PrimaryCTA
              onClick={() => onStartLesson()}
              data-testid="course-open-workspace"
              {...workspaceEntryPrefetchHandlers()}
            >
              <Play className="w-4 h-4" />
              {t('continue')}
            </PrimaryCTA>
          </div>
        }
      />

      <UxCallout variant="info" title={t('courseSectionTitle')} icon={<MapPin className="text-text-secondary" />} testId="course-entry-hint">
        {t('courseEntryHint')}
      </UxCallout>

      {userSettings && (
        <div data-focus-hide="">
          <TrustBadgeRow sourceMode={userSettings.sourceMode} lang={lang} className="mt-3" />
        </div>
      )}

      <div
        className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
        data-testid="course-page-stats"
      >
        <div className="ux-stat-card" data-testid="course-stat-progress">
          <p className="ux-stat-card-label"><AllCapsLabel>{t('courseStatProgress')}</AllCapsLabel></p>
          <p className="ux-stat-card-value">{pageStats.progressPercent}%</p>
        </div>
        <div className="ux-stat-card" data-testid="course-stat-mastery-card">
          <p className="ux-stat-card-label"><AllCapsLabel>{t('courseStatMastery')}</AllCapsLabel></p>
          <p className="ux-stat-card-value">{pageStats.masteryPercent}%</p>
        </div>
        <div className="ux-stat-card" data-testid="course-stat-pending-tasks">
          <p className="ux-stat-card-label"><AllCapsLabel>{t('courseStatPendingTasks')}</AllCapsLabel></p>
          <p className="ux-stat-card-value">{pageStats.pendingTasks}</p>
        </div>
        <div className="ux-stat-card" data-testid="course-stat-due-reviews">
          <p className="ux-stat-card-label"><AllCapsLabel>{t('courseStatDueReviews')}</AllCapsLabel></p>
          <p className="ux-stat-card-value">{pageStats.dueReviews}</p>
        </div>
        <div className="ux-stat-card" data-testid="course-stat-source-quality">
          <p className="ux-stat-card-label"><AllCapsLabel>{t('courseStatSourceQuality')}</AllCapsLabel></p>
          <p className="ux-stat-card-value">
            {pageStats.sourceQualityScore != null
              ? `${pageStats.sourceQualityScore}/100`
              : t('courseStatSourceQualityUnknown')}
          </p>
        </div>
      </div>

      {quality?.band === 'strong' && !quality.needsMoreMaterial && (
        <UxCallout variant="trust" title={t('courseTrustCalloutTitle')} icon={<Sparkles />} testId="course-trust-callout" className="mt-3">
          {t('courseTrustCalloutBody')}
        </UxCallout>
      )}

      {progress < 100 && (
        <UxCallout
          variant="next-action"
          title={t('courseContinueCalloutTitle')}
          icon={<Lightbulb />}
          testId="course-continue-callout"
          className="mt-3"
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onStartLesson()}
              data-testid="course-continue-callout-action"
              className="ws-empty-cta-secondary shrink-0"
            >
              {t('courseContinueCalloutAction')} <ArrowRight className="w-3 h-3" />
            </Button>
          }
        >
          {t('courseContinueCalloutBody').replace('{pct}', String(Math.round(progress)))}
        </UxCallout>
      )}

      {showPostUploadBanner && (
        <PostUploadBanner
          courseTitle={course.title}
          onOpenWorkspace={() => {
            onDismissPostUpload?.();
            onStartLesson();
          }}
          onViewCourse={() => onDismissPostUpload?.()}
          onDismiss={() => onDismissPostUpload?.()}
        />
      )}

      {/* OPT-K119 — Source quality: full-bleed wash panel (organized hierarchy + wash CTAs) */}
      {showQualityBar && (
        <WorkspaceSourceStatusBar
          lang={lang}
          score={qualityBanner.score}
          showMigration={showReuploadHint}
          showPre24Greek={showPre24Greek}
          showQualityWarning={qualityBanner.show}
          reprocessing={reprocessingMaterial}
          storedPipelineVersion={course.pipelineMeta?.version}
          textHygieneScore={quality?.metrics.textHygieneScore}
          textCorruptionScore={quality?.metrics.textCorruptionScore}
          textHygieneFlags={quality?.metrics.textHygieneFlags}
          onInspect={openReprocessWizard}
          onReprocess={onReprocessMaterial ? openReprocessWizard : undefined}
          onReupload={onUploadMore}
          onContinue={qualityBanner.show && !showReuploadHint ? dismissQualityBar : undefined}
          className="w-full max-w-none mt-1"
        />
      )}

      {quality && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          data-testid="course-generation-diagnostics"
          className={cn(
            /* OPT-K118 — diagnostics wash (no outline cage) */
            'rounded-xl border-0 p-3 sm:p-4',
            quality.band === 'strong'
              ? 'bg-accent-emerald/5'
              : quality.band === 'moderate'
                ? 'bg-accent-cyan/5'
                : 'bg-accent-amber/5',
          )}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-1 type-micro font-semibold',
                  quality.band === 'strong'
                    ? 'bg-accent-emerald/12 text-accent-emerald'
                    : quality.band === 'moderate'
                      ? 'bg-accent-cyan/12 text-accent-cyan'
                      : 'bg-accent-amber/12 text-accent-amber',
                )}>
                  {quality.needsMoreMaterial ? <AlertTriangle className="w-3 h-3" aria-hidden /> : <Sparkles className="w-3 h-3" aria-hidden />}
                  {quality.needsMoreMaterial
                    ? t('courseNeedsMoreMaterial')
                    : quality.band === 'strong'
                    ? t('courseBandStrong')
                    : quality.band === 'moderate'
                    ? t('courseBandModerate')
                    : t('courseBandWeak')}
                </span>
                <span className="type-caption text-text-muted">{t('courseQualityScoreLabel').replace('{score}', String(quality.score))}</span>
              </div>
              <h2 className="mt-3 type-meta font-semibold">{t('courseGenerationDiagnostics')}</h2>
              <p className="mt-1 type-body text-text-secondary max-w-3xl">
                {quality.outlineAdjusted
                  ? t('courseOutlineCompacted').replace('{count}', String(quality.finalTopicCount))
                  : t('courseOutlineNotCompacted').replace('{count}', String(quality.finalTopicCount))}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 type-caption">
              <div className="rounded-lg border-0 bg-surface-secondary/50 px-3 py-2">
                <p className="text-text-muted">{t('courseDetectedTopics')}</p>
                <p className="mt-1 font-semibold tabular-nums">{quality.detectedTopicCount}</p>
              </div>
              <div className="rounded-lg border-0 bg-surface-secondary/50 px-3 py-2">
                <p className="text-text-muted">{t('courseFinalTopics')}</p>
                <p className="mt-1 font-semibold tabular-nums">{quality.finalTopicCount}</p>
              </div>
              <div className="rounded-lg border-0 bg-surface-secondary/50 px-3 py-2">
                <p className="text-text-muted">{t('courseSections')}</p>
                <p className="mt-1 font-semibold tabular-nums">{quality.metrics.sectionCount}</p>
              </div>
              <div className="rounded-lg border-0 bg-surface-secondary/50 px-3 py-2">
                <p className="text-text-muted">{t('courseWorkedSignals')}</p>
                <p className="mt-1 font-semibold tabular-nums">{quality.metrics.workedExampleCount + quality.metrics.formulaCount}</p>
              </div>
            </div>
          </div>
          {quality.warnings.length > 0 && (
            <p className="mt-4 type-body text-text-secondary">
              <span className="font-semibold text-text-primary">{t('courseWatchOuts')}</span> {quality.warnings.join(' ')}
            </p>
          )}
          {quality.nextActions.length > 0 && (
            <p className="mt-2 type-body text-text-secondary">
              <span className="font-semibold text-text-primary">{t('courseBestNextUpgrade')}</span> {quality.nextActions[0]}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {quality.needsMoreMaterial && onUploadMore && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onUploadMore}
                data-testid="course-quality-upload-more"
              >
                <Upload className="w-3.5 h-3.5" />
                {t('courseQualityActionUpload')}
              </Button>
            )}
            {onReprocessMaterial && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openReprocessWizard}
                disabled={reprocessingMaterial}
                data-testid="course-quality-reprocess"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', reprocessingMaterial && 'animate-spin')} />
                {t('courseQualityActionReprocess')}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onStartLesson()}
              data-testid="course-quality-open-workspace"
            >
              <Play className="w-3.5 h-3.5" />
              {t('courseQualityActionWorkspace')}
            </Button>
          </div>
        </motion.div>
      )}

      {course.qualityReport && (
        <QualityReportPanel report={course.qualityReport} lang={lang} className="w-full max-w-none" />
      )}

      {/* Progress bar — OPT-K118 denser, borderless */}
      <AnimatedCard delay={0.1} className="border-0 shadow-none bg-transparent" padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="type-meta font-semibold text-text-primary">{t('coursePanelProgress')}</span>
          <span className="type-caption text-text-secondary tabular-nums">{course.completedLessons}/{course.totalLessons} {t('courseLessonsLabel')}</span>
        </div>
        {/* Wave P-2 C08 — Course Progress top-of-page track uses --viz-bar-track. */}
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: resolveCourseColor(course.color) }}
          />
        </div>
        <div className="flex justify-between mt-1.5 type-caption text-text-tertiary">
          <span>{Math.round(progress)}% {t('coursePctComplete')}</span>
          <span>~{Math.round(course.estimatedHours * (1 - progress / 100))}h {t('courseHoursRemaining')}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 pt-2">
          <div className="text-center"><p className="ux-kpi-value">{course.conceptCount}</p><p className="type-micro text-text-muted">{t('courseKpiConcepts')}</p></div>
          <div className="text-center"><p className="ux-kpi-value">{course.glossaryCount}</p><p className="type-micro text-text-muted">{t('courseKpiGlossary')}</p></div>
          <div className="text-center"><p className="ux-kpi-value">{course.exerciseCount}</p><p className="type-micro text-text-muted">{t('courseKpiExercises')}</p></div>
          <div className="text-center"><p className="type-caption font-semibold capitalize">{course.sourceMode}</p><p className="type-micro text-text-muted">{t('courseKpiSourceMode')}</p></div>
        </div>
      </AnimatedCard>

      {/* OPT-K120 / OPT-K121 — outline type rhythm (Dashboard scale on all pages) */}
      <SectionHeader
        eyebrow={t('courseSectionEyebrow')}
        title={t('courseSectionTitle')}
        subtitle={t('courseSectionSubtitle')}
        className="mt-2"
      />

      <DescriptiveStickyTabBar
        items={courseTabs}
        activeId={tab}
        onChange={setTab}
        testIdPrefix="course-tab"
        panelIdPrefix="course-panel"
        className="mt-2"
      />

      {/* Tab Content */}
      {tab === 'path' && (
        <div
          role="tabpanel"
          id="course-panel-path"
          data-testid="course-panel-path"
          aria-labelledby="course-tab-path"
          className="space-y-2"
        >
          <SectionHeader
            eyebrow={t('coursePathSectionEyebrow')}
            title={t('coursePathSectionTitle')}
            subtitle={t('coursePathSectionSubtitle')}
            animate={false}
          />
          {course.topics.map((topic, i) => (
            <TopicCard key={topic.id} topic={topic} index={i} courseColor={course.color} course={course} onGoToSource={onGoToSource} onStart={() => onStartLesson(topic.title)} />
          ))}
          {course.topics.length === 0 && (
            <PlatformEmptyState
              icon={Brain}
              title={t('coursePathEmptyTitle')}
              description={t('coursePathEmptyBody')}
              actionLabel={onUploadMore ? t('coursePathEmptyAction') : undefined}
              onAction={onUploadMore}
              data-testid="course-path-empty"
            />
          )}
        </div>
      )}

      {tab === 'map' && (
        <div role="tabpanel" id="course-panel-map" data-testid="course-panel-map" aria-labelledby="course-tab-map">
          <ConceptMap course={course} masteryPercent={pageStats.masteryPercent} onStartLesson={onStartLesson} />
        </div>
      )}
      {tab === 'sources' && (
        <div role="tabpanel" id="course-panel-sources" data-testid="course-panel-sources" aria-labelledby="course-tab-sources" className="space-y-4">
        <SourceFiles
          course={course}
          uploadedFiles={uploadedFiles}
          glossaryEntries={glossaryEntries}
          tasks={tasks}
          onGoToSource={onGoToSource}
          onRemoveFile={onRemoveFile}
          onReprocessMaterial={onReprocessMaterial ? openReprocessWizard : undefined}
          reprocessingMaterial={reprocessingMaterial}
          lang={lang}
          userSettings={userSettings}
          onImportAudioTranscript={onImportAudioTranscript}
          onUploadAudio={onUploadAudio}
          onAddAudioToFsrs={onAddAudioToFsrs}
          learnerModel={learnerModel}
          onUploadMore={onUploadMore}
        />
        <McpCourseArtifactsPanel course={course} lang={lang === 'el' ? 'el' : 'en'} />
        </div>
      )}
      {tab === 'analytics' && (
        <div role="tabpanel" id="course-panel-analytics" data-testid="course-panel-analytics" aria-labelledby="course-tab-analytics">
          <CourseAnalytics course={course} masteryPercent={pageStats.masteryPercent} />
        </div>
      )}

      <ReprocessPreviewModal
        open={reprocessWizardOpen}
        onClose={() => setReprocessWizardOpen(false)}
        preview={reprocessPreview}
        lang={lang}
        applying={reprocessingMaterial}
        applied={reprocessApplied}
        onApply={onReprocessMaterial ? handleApplyReprocess : undefined}
      />
      {canDeleteCourse && (
        <ConfirmDialog
          open={removeCourseOpen}
          title={deleteCourseCopy.title}
          description={deleteCourseCopy.description}
          confirmLabel={t('deleteLabel')}
          cancelLabel={t('cancel')}
          destructive
          data-testid="course-delete-confirm"
          onConfirm={() => {
            onRemoveCourse?.(course.id);
            setRemoveCourseOpen(false);
          }}
          onClose={() => setRemoveCourseOpen(false)}
        />
      )}
    </Page>
  );
}

function TopicCard({ topic, index, courseColor, course, onGoToSource, onStart }: {
  topic: Topic;
  index: number;
  courseColor: string;
  course: Course;
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  onStart: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const accent = resolveCourseColor(courseColor);
  const hasDetail = (topic.objectives?.length ?? 0) > 0 || (topic.keyConcepts?.length ?? 0) > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        /* OPT-K118 — topic row: wash/hover only (no outline cage) */
        'course-topic-card rounded-xl border-0 bg-transparent overflow-hidden transition-colors',
        topic.isLocked ? 'opacity-60' : 'hover:bg-surface-secondary/55',
      )}
      data-testid={`course-topic-card-${topic.id}`}
    >
      <div className="flex items-center gap-3 px-1 py-2.5 sm:px-2">
        <div className="relative">
          {topic.isLocked ? (
            <div className="w-9 h-9 rounded-lg bg-surface-secondary flex items-center justify-center">
              <Lock className="w-4 h-4 text-text-muted" />
            </div>
          ) : topic.mastery >= 90 ? (
            <div className="w-9 h-9 rounded-lg bg-accent-emerald/12 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
            </div>
          ) : topic.mastery > 0 ? (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}>
              <Circle className="w-4 h-4" style={{ color: accent }} />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-surface-secondary flex items-center justify-center">
              <Circle className="w-4 h-4 text-text-muted" />
            </div>
          )}
          <span className="absolute -top-1 -left-1 type-micro font-bold text-text-muted tabular-nums">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold type-meta">{topic.title}</h3>
          <p className="type-caption text-text-tertiary mt-0.5">{topic.description}</p>
          <div className="flex items-center gap-3 mt-2 type-caption text-text-muted">
            <span>{topic.estimatedMinutes}m</span>
            <span>{topicLessonCount(topic)} lessons</span>
            {topic.conceptCount > 0 && <span>{topic.conceptCount} concepts</span>}
            {topic.prerequisites.length > 0 && (
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {topic.prerequisites.length} prereq
              </span>
            )}
            {hasDetail && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="course-topic-details inline-flex min-h-9 items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
                {expanded ? 'Hide' : 'Details'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!topic.isLocked && (
            <>
              <div className="hidden sm:block w-20">
                <div className="flex justify-between type-caption mb-1">
                  <span className="text-text-muted">{t('courseLessonMastery')}</span>
                  <span className="font-medium">{topic.mastery}%</span>
                </div>
                {/* Wave P-2 C08 — Topic mastery track uses --viz-bar-track. */}
                <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${topic.mastery}%`,
                      backgroundColor: topic.mastery >= 80 ? MASTERY_VAR.strong : accent
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onStart}
                aria-label={`Start lesson: ${topic.title}`}
                className="course-topic-start inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl hover:bg-surface-hover transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && hasDetail && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-2 sm:px-3 pb-3 pt-1 border-0 space-y-3"
        >
          {(topic.objectives?.length ?? 0) > 0 && (
            <div className="pt-4">
              <p className="type-caption font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-text-secondary" /> Learning objectives
              </p>
              <ul className="space-y-1">
                {topic.objectives!.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 type-caption text-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald shrink-0 mt-0.5" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(topic.keyConcepts?.length ?? 0) > 0 && (
            <div>
              <p className="type-caption font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-accent-cyan" /> Key concepts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topic.keyConcepts!.map((c, i) => {
                  const span = onGoToSource ? findConceptSpan(course, c) : undefined;
                  return span ? (
                    <button
                      key={i}
                      onClick={() => onGoToSource!({ fileId: span.fileId, charStart: span.charStart, charEnd: span.charEnd })}
                      title="Go to source"
                      className="course-topic-chip group flex min-h-9 items-center gap-1 type-caption px-2 py-0.5 rounded-md bg-surface-secondary border-0 text-text-secondary hover:bg-surface-hover transition-colors"
                    >
                      {c}
                      <MapPin className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                    </button>
                  ) : (
                    <span key={i} className="type-caption px-2 py-0.5 rounded-md bg-surface-secondary border-0 text-text-secondary">
                      {c}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function ConceptMap({
  course,
  masteryPercent,
  onStartLesson,
}: {
  course: Course;
  masteryPercent: number;
  onStartLesson: (topicTitle?: string) => void;
}) {
  const { t } = useI18n();
  const topics = course.topics.filter(t => !t.isLocked);
  const graphSummary = summarizeCourseGraph(course.conceptGraph);
  const { nodes: graphNodes, edges: graphEdges } = conceptGraphToCourseVisual(course, topics);

  return (
    <div className="space-y-6">
      {graphSummary.nodeCount > 0 && (
        <p
          className="type-caption text-text-secondary"
          data-testid="course-knowledge-graph-meta"
        >
          {t('courseGraphMeta')
            .replace('{nodes}', String(graphSummary.nodeCount))
            .replace('{edges}', String(graphSummary.edgeCount))
            .replace('{status}', graphSummary.valid ? t('courseGraphValid') : t('courseGraphInvalid'))}
        </p>
      )}

      {graphNodes.length > 0 && (
        <>
          <p className="type-caption text-text-secondary">{t('courseConceptMapHint')}</p>
          <ConceptGraph
            nodes={graphNodes}
            edges={graphEdges}
            width={640}
            height={Math.max(280, Math.ceil(graphNodes.length / 4) * 110 + 80)}
            onOpenConcept={(label) => onStartLesson(label)}
            openConceptLabel={t('courseConceptMapOpenWorkspace')}
          />
        </>
      )}

      <ProgressTimeline
        title="Learning Milestones"
        milestones={topics.map(t => ({
          label: t.title,
          completed: t.mastery >= 80,
          date: t.mastery >= 80 ? 'Mastered' : `${t.mastery}% progress`,
          xp: t.mastery >= 80 ? t.estimatedMinutes * 2 : undefined,
        }))}
      />

      <div className="platform-panel-md flex items-center justify-center" data-testid="course-mastery-ring">
        <ReadinessRing
          value={masteryPercent}
          size={160}
          label={t('analyticsCourseMastery')}
          sublabel={t('courseMasterySublabel')}
        />
      </div>
    </div>
  );
}

function SourceFiles({
  course,
  uploadedFiles,
  glossaryEntries,
  tasks,
  onGoToSource,
  onRemoveFile,
  onReprocessMaterial,
  reprocessingMaterial = false,
  lang,
  userSettings,
  onImportAudioTranscript,
  onUploadAudio,
  onAddAudioToFsrs,
  learnerModel,
  onUploadMore,
}: {
  course: Course;
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
  tasks: Task[];
  onGoToSource?: (highlight: { fileId: string; charStart: number; charEnd: number }) => void;
  onRemoveFile?: (fileId: string) => void;
  onReprocessMaterial?: () => void;
  reprocessingMaterial?: boolean;
  lang: 'en' | 'el';
  userSettings?: UserSettings;
  onImportAudioTranscript?: (raw: string, courseId: string) => boolean;
  onUploadAudio?: (file: File, courseId: string) => Promise<boolean>;
  onAddAudioToFsrs?: (fileId: string, courseId: string) => void;
  learnerModel?: LearnerModel;
  onUploadMore?: () => void;
}) {
  const { t } = useI18n();
  const provenanceCount = course.conceptSpans?.length ?? 0;
  const [pendingRemove, setPendingRemove] = useState<UploadedFile | null>(null);
  const generatedTaskCount = countGeneratedTasksForCourse(tasks, course.id);
  const glossaryCount = glossaryEntries.filter((g) => g.courseId === course.id).length;

  const confirmRemove = (file: UploadedFile) => {
    if (!file.id || !onRemoveFile) return;
    setPendingRemove(file);
  };

  const cascadeCopy = useMemo(() => {
    if (!pendingRemove) return null;
    const remainingFilesForCourse = countFilesForCourse(
      uploadedFiles.filter((f) => f.id !== pendingRemove.id),
      course.id,
    );
    return buildDeleteFileCascadeCopy({
      lang,
      fileName: pendingRemove.name,
      courseTitle: course.title,
      remainingFilesForCourse,
      generatedTaskCount,
      glossaryCount,
    });
  }, [pendingRemove, uploadedFiles, course.id, course.title, lang, generatedTaskCount, glossaryCount]);

  const removeTitle = cascadeCopy?.title ?? '';
  const removeDescription = cascadeCopy?.description ?? '';

  return (
    <>
    <div className="space-y-6">
      <NotebookLmExportPanel
        course={course}
        glossaryEntries={glossaryEntries}
        learnerModel={learnerModel}
        lang={lang}
      />
      {onImportAudioTranscript && (
        <CourseMediaPanel
          courseId={course.id}
          courseTitle={course.title}
          files={uploadedFiles}
          lang={lang}
          onImportTranscript={onImportAudioTranscript}
          onUploadAudio={onUploadAudio}
          onAddAudioToFsrs={onAddAudioToFsrs}
          userSettings={userSettings}
        />
      )}
      <div className="platform-panel-lg">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-text-secondary" />
            {t('courseSourceFiles')}
          </h3>
          {onReprocessMaterial && uploadedFiles.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onReprocessMaterial}
              disabled={reprocessingMaterial}
              data-testid="course-reprocess-sources"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', reprocessingMaterial && 'animate-spin')} />
              {t('courseReprocessStoredText')}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {uploadedFiles.length === 0 && course.sourceFiles.length === 0 ? (
            <PlatformEmptyState
              icon={Upload}
              title={t('courseSourcesEmptyTitle')}
              description={t('courseSourcesEmptyBody')}
              actionLabel={onUploadMore ? t('courseSourcesEmptyAction') : undefined}
              onAction={onUploadMore}
              className="py-10"
              data-testid="course-sources-empty"
            />
          ) : (
          (uploadedFiles.length > 0 ? uploadedFiles : course.sourceFiles.map((name) => ({ name } as UploadedFile))).map((file, i) => {
            const preview = file.id ? buildSourcePreviewText(file, course) : null;
            return (
            <div key={file.id ?? i} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-secondary/40 border-0 flex-wrap" data-testid={file.id ? `source-file-${file.id}` : undefined}>
              <FileText className="w-5 h-5 text-text-tertiary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="type-meta font-medium block truncate">{file.name}</span>
                {'pipelineVersion' in file && file.pipelineVersion && (
                  <span className="type-micro text-text-muted">pipeline v{file.pipelineVersion}</span>
                )}
                {file.id && (
                  <p className="mt-2 type-caption text-text-secondary leading-relaxed">
                    <span className="font-medium">{t('courseSourcePreviewLabel')}: </span>
                    {preview ?? t('courseSourcePreviewEmpty')}
                  </p>
                )}
              </div>
              {'ocrUsed' in file && file.ocrUsed && (
                <span className="type-micro px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan">OCR</span>
              )}
              {'ingestMethod' in file && file.ingestMethod && (
                <span className="type-micro text-text-muted">{file.ingestMethod}</span>
              )}
              <span className="type-caption text-text-muted">{t('courseAnalyzed')}</span>
              {file.id && (
                <VideoSummarizeButton file={file} settings={userSettings} lang={lang} />
              )}
              {file.id && onRemoveFile && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => confirmRemove(file)}
                  data-testid={`remove-source-${file.id}`}
                  title={t('removeFileTitle')}
                  className="px-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            );
          })
          )}
        </div>
        {course.pipelineMeta && (
          <p className="mt-3 type-micro text-text-muted">
            Pipeline v{course.pipelineMeta.version} · {course.pipelineMeta.outlineSource} · {new Date(course.pipelineMeta.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {glossaryEntries.length > 0 && (
        <div className="platform-panel-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-emerald" />
            Glossary ({glossaryEntries.length})
          </h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {glossaryEntries.slice(0, 24).map((g) => {
              const span = findConceptSpan(course, g.term);
              return (
                <li key={g.term} className="flex items-start justify-between gap-2 type-body pb-2">
                  <div className="min-w-0">
                    <span className="font-medium text-text-secondary">{g.term}</span>
                    <p className="type-caption text-text-tertiary mt-0.5 line-clamp-2">{g.definition}</p>
                    {(g.relatedConcepts?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {g.relatedConcepts!.slice(0, 4).map((rc) => (
                          <span key={rc} className="type-micro px-1.5 py-0.5 rounded-md bg-surface-secondary border-0 text-text-muted">
                            {rc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {span && onGoToSource && (
                    <GoToSourceButton onClick={() => onGoToSource({
                      fileId: span.fileId,
                      charStart: span.charStart,
                      charEnd: span.charEnd,
                    })} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="platform-panel-lg">
        <div className="mt-0 p-3 rounded-lg bg-surface-secondary/45 border-0">
          <p className="type-caption text-text-tertiary mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-text-secondary" />
            Source Analysis Report
          </p>
          <ul className="type-caption text-text-secondary space-y-1">
            <li>‶ {provenanceCount} concept spans linked to source sentences</li>
            <li>‶ All content is source-grounded from your uploaded materials</li>
            {course.sourceQuality?.warnings.slice(0, 2).map((w) => (
              <li key={w}>‶ {w}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={!!pendingRemove}
      onClose={() => setPendingRemove(null)}
      onConfirm={() => {
        if (pendingRemove?.id && onRemoveFile) onRemoveFile(pendingRemove.id);
        setPendingRemove(null);
      }}
      title={removeTitle}
      description={removeDescription}
      confirmLabel={t('removeLabel')}
      cancelLabel={t('cancel')}
      destructive
      data-testid="course-file-delete-confirm"
    />
    </>
  );
}

function CourseAnalytics({ course, masteryPercent }: { course: Course; masteryPercent: number }) {
  const { t } = useI18n();
  const maxMinutes = Math.max(...course.topics.map((t) => t.estimatedMinutes || 0), 1);
  const totalConcepts = course.topics.reduce((s, t) => s + (t.conceptCount || 0), 0);
  const masteredConcepts = course.topics.reduce(
    (s, t) => s + Math.round((t.conceptCount || 0) * (t.mastery / 100)),
    0,
  );
  const progressFraction = course.completedLessons / Math.max(course.totalLessons, 1);
  const studiedHours = course.estimatedHours * progressFraction;
  const baselineCph = totalConcepts / Math.max(course.estimatedHours, 1);
  const actualCph = studiedHours > 0 ? masteredConcepts / studiedHours : 0;
  const velocity = baselineCph > 0 && actualCph > 0 ? actualCph / baselineCph : 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="platform-panel-md sm:col-span-2" data-testid="course-analytics-mastery">
        <p className="type-caption text-text-tertiary">{t('analyticsCourseMastery')}</p>
        <p className="mt-1 ux-kpi-value">{masteryPercent}%</p>
        <p className="mt-1 type-caption text-text-muted">{t('courseMasterySublabel')}</p>
      </div>
      <div className="platform-panel-md">
        <h4 className="type-meta font-semibold mb-3">{t('courseAnalyticsStudyTime')}</h4>
        <p className="type-caption text-text-tertiary mb-3">{t('courseAnalyticsStudyTimeHint')}</p>
        <div className="space-y-2">
          {course.topics.slice(0, 6).map(topic => (
            <div key={topic.id} className="flex items-center gap-2">
              <span className="type-caption text-text-secondary w-24 truncate">{topic.title}</span>
              {/* Wave P-2 C08 — Study Time Distribution track uses --viz-bar-track. */}
              <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--viz-bar-track)' }}>
                <div
                  className="h-2 rounded-full bg-brand-500 transition-all"
                  style={{ width: `${Math.max(8, ((topic.estimatedMinutes || 0) / maxMinutes) * 100)}%` }}
                />
              </div>
              <span className="type-micro text-text-muted w-10 text-right">{topic.estimatedMinutes}m</span>
            </div>
          ))}
        </div>
      </div>
      <div className="platform-panel-md">
        <h4 className="type-meta font-semibold mb-3">{t('courseAnalyticsRetention')}</h4>
        <div className="space-y-2">
          {course.topics.filter(topic => topic.mastery > 0).slice(0, 5).map(topic => {
            const retention = Math.max(0, topic.retentionPrediction || topic.mastery);
            return (
              <div key={topic.id} className="flex items-center justify-between">
                <span className="type-caption text-text-secondary truncate w-24">{topic.title}</span>
                <span className={cn(
                  'type-caption font-medium',
                  retention >= 70 ? 'text-accent-emerald' : retention >= 50 ? 'text-accent-amber' : 'text-accent-rose'
                )}>
                  {Math.round(retention)}% {t('courseAnalyticsRetentionPredicted')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="platform-panel-md sm:col-span-2">
        <h4 className="type-meta font-semibold mb-3">{t('courseAnalyticsCoverage')}</h4>
        <p className="type-caption text-text-secondary mb-4">{t('courseAnalyticsCoverageHint').replace('{count}', String(totalConcepts))}</p>
        {masteredConcepts > 0 ? (
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="ux-kpi-value text-accent-emerald">{masteredConcepts}<span className="type-meta text-text-muted">/{totalConcepts}</span></div>
              <p className="type-caption text-text-tertiary mt-1">{t('courseAnalyticsConceptsMastered')}</p>
            </div>
            {velocity > 0 && (
              <div>
                <div className={cn('ux-kpi-value', velocity >= 1 ? 'text-accent-emerald' : 'text-accent-amber')}>{velocity.toFixed(2)}×</div>
                <p className="type-caption text-text-tertiary mt-1">
                  {velocity >= 1.05 ? t('courseAnalyticsPaceAhead') : velocity <= 0.95 ? t('courseAnalyticsPaceBehind') : t('courseAnalyticsPaceOn')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="type-body text-text-tertiary">{t('courseAnalyticsStartHint')}</p>
        )}
      </div>
    </div>
  );
}
