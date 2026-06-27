import { useState, useMemo, useEffect } from 'react';
import { prefetchWorkspaceEntry, workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Clock, BarChart3, Calendar, FileText,
  Lock, CheckCircle2, Circle, ChevronRight, Brain, Target,
  AlertTriangle, Sparkles, Play, MapPin, Network, Upload, Trash2, RefreshCw
} from '@/lib/lucide-shim';
import type { Course, Topic, UploadedFile, GlossaryEntry, Task } from '../types';
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
import { useI18n } from '../lib/i18n';
import { buildDeleteFileCascadeCopy } from '../lib/deleteFileCascadeCopy';
import { buildDeleteCourseCascadeCopy } from '../lib/deleteCourseCascadeCopy';
import { countFilesForCourse } from '../lib/deleteCascade';
import { countGeneratedTasksForCourse } from '../lib/pipelineReprocess';
import { courseDeleteStats } from '../lib/removeCourse';
import { isDemoCourse } from '../lib/demoMode';
import { PostUploadBanner } from './ui/PostUploadBanner';
import { Page, PageHeader } from './ui/primitives';

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
  reprocessingMaterial?: boolean;
  onRemoveFile?: (fileId: string) => void;
  onRemoveCourse?: (courseId: string) => boolean;
  tasks?: Task[];
  showPostUploadBanner?: boolean;
  onDismissPostUpload?: () => void;
}

/** Real per-topic lesson count: explicit lessons if present, else derived from
 * the topic's concept density (2-6 micro-lessons). No placeholders. */
function topicLessonCount(topic: Topic): number {
  if (topic.lessons.length > 0) return topic.lessons.length;
  const concepts = topic.keyConcepts?.length || topic.conceptCount || 0;
  return Math.min(6, Math.max(2, Math.ceil(concepts / 2)));
}

type CourseTab = 'path' | 'map' | 'sources' | 'analytics';

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
  reprocessingMaterial = false,
  onRemoveFile,
  onRemoveCourse,
  tasks = [],
  showPostUploadBanner = false,
  onDismissPostUpload,
}: CourseViewProps) {
  const [tab, setTab] = useState<CourseTab>('path');
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
  const { lang } = useI18n();
  const progress = (course.completedLessons / Math.max(course.totalLessons, 1)) * 100;
  const quality = course.sourceQuality;
  const needsSourceUpgrade = Boolean(quality && (quality.needsMoreMaterial || quality.outlineAdjusted));
  const qualityBanner = shouldShowCourseQualityBanner({
    course,
    uploadedFiles,
    hasReuploadHandler: Boolean(onUploadMore),
  });
  const showReuploadHint = qualityBanner.showMigrationBanner;
  const showQualityBar = !qualityDismissed && (showReuploadHint || qualityBanner.show) && qualityBanner.score != null;

  const dismissQualityBar = () => {
    try {
      sessionStorage.setItem(courseQualityDismissKey(course.id), '1');
    } catch {
      /* ignore */
    }
    setQualityDismissed(true);
  };

  const openReprocessWizard = () => {
    setReprocessApplied(false);
    setReprocessWizardOpen(true);
  };

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

  const handleApplyReprocess = () => {
    if (!onReprocessMaterial) return;
    const ok = onReprocessMaterial();
    if (ok !== false) setReprocessApplied(true);
  };

  /** B10/B11 — warm workspace + reader chunks while viewing course overview. */
  useEffect(() => {
    prefetchWorkspaceEntry();
  }, [course.id]);

  return (
    <Page>
      <button
        type="button"
        onClick={onBack}
        data-testid="course-back"
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-2 transition-colors -mt-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </button>

      <PageHeader
        eyebrow={lang === 'el' ? 'Μάθημα' : 'Course'}
        title={<span data-testid="course-title">{course.title}</span>}
        subtitle={
          <>
            <span className="block max-w-xl">{course.description}</span>
            <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {course.totalLessons} lessons
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {course.estimatedHours}h estimated
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" />
                {course.mastery}% mastery
              </span>
              {course.examDate && (
                <span className="flex items-center gap-1 text-accent-amber">
                  <Calendar className="w-3.5 h-3.5" />
                  Exam: {new Date(course.examDate).toLocaleDateString()}
                </span>
              )}
            </span>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2 shrink-0">
            {canDeleteCourse && (
              <button
                type="button"
                onClick={() => setRemoveCourseOpen(true)}
                data-testid="course-delete"
                className="flex items-center gap-2 px-3 py-2.5 border border-accent-rose/30 hover:bg-accent-rose/10 rounded-xl text-sm font-medium text-accent-rose transition-all"
                aria-label={lang === 'el' ? 'Διαγραφή μαθήματος' : 'Delete course'}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'el' ? 'Διαγραφή' : 'Delete'}</span>
              </button>
            )}
            {needsSourceUpgrade && onUploadMore && (
              <button
                type="button"
                onClick={onUploadMore}
                data-testid="course-upload-more"
                className="flex items-center gap-2 px-4 py-2.5 border border-accent-amber/30 bg-accent-amber/10 hover:bg-accent-amber/15 rounded-xl text-sm font-medium text-accent-amber transition-all"
              >
                <Upload className="w-4 h-4" />
                Add material
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAgent}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-default hover:border-brand-500/30 rounded-xl text-sm font-medium transition-all"
            >
              <Sparkles className="w-4 h-4 text-brand-600" />
              Ask agent
            </button>
            <button
              type="button"
              onClick={() => onStartLesson()}
              data-testid="course-open-workspace"
              {...workspaceEntryPrefetchHandlers()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl text-sm font-medium hover:from-brand-500 hover:to-brand-400 transition-all"
            >
              <Play className="w-4 h-4" />
              Continue
            </button>
          </div>
        }
      />

      {showPostUploadBanner && (
        <PostUploadBanner
          courseTitle={course.title}
          lang={lang}
          onOpenWorkspace={() => {
            onDismissPostUpload?.();
            onStartLesson();
          }}
          onViewCourse={() => onDismissPostUpload?.()}
          onDismiss={() => onDismissPostUpload?.()}
        />
      )}

      {showQualityBar && (
        <WorkspaceSourceStatusBar
          lang={lang}
          score={qualityBanner.score}
          showMigration={showReuploadHint}
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
          className="max-w-[1600px] mx-auto"
        />
      )}

      {quality && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          data-testid="course-generation-diagnostics"
          className={cn(
            'rounded-2xl border p-5',
            quality.band === 'strong'
              ? 'border-accent-emerald/20 bg-accent-emerald/5'
              : quality.band === 'moderate'
                ? 'border-accent-cyan/20 bg-accent-cyan/5'
                : 'border-accent-amber/20 bg-accent-amber/5',
          )}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold',
                  quality.band === 'strong'
                    ? 'bg-accent-emerald/12 text-accent-emerald'
                    : quality.band === 'moderate'
                      ? 'bg-accent-cyan/12 text-accent-cyan'
                      : 'bg-accent-amber/12 text-accent-amber',
                )}>
                  {quality.needsMoreMaterial ? <AlertTriangle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  {quality.needsMoreMaterial ? 'Needs More Material' : `${quality.band[0]!.toUpperCase()}${quality.band.slice(1)} Source`}
                </span>
                <span className="text-xs text-text-muted">Source quality {quality.score}/100</span>
              </div>
              <h2 className="mt-3 text-sm font-semibold">Generation diagnostics</h2>
              <p className="mt-1 text-sm text-text-secondary max-w-3xl">
                {quality.outlineAdjusted
                  ? `The course outline was compacted to ${quality.finalTopicCount} modules so the source material stays grounded instead of being over-split.`
                  : `The current material supports ${quality.finalTopicCount} grounded modules without needing outline compaction.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-surface-primary/40 px-3 py-2">
                <p className="text-text-muted">Detected topics</p>
                <p className="mt-1 font-semibold">{quality.detectedTopicCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-primary/40 px-3 py-2">
                <p className="text-text-muted">Final topics</p>
                <p className="mt-1 font-semibold">{quality.finalTopicCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-primary/40 px-3 py-2">
                <p className="text-text-muted">Sections</p>
                <p className="mt-1 font-semibold">{quality.metrics.sectionCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-primary/40 px-3 py-2">
                <p className="text-text-muted">Worked signals</p>
                <p className="mt-1 font-semibold">{quality.metrics.workedExampleCount + quality.metrics.formulaCount}</p>
              </div>
            </div>
          </div>
          {quality.warnings.length > 0 && (
            <p className="mt-4 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Watch-outs:</span> {quality.warnings.join(' ')}
            </p>
          )}
          {quality.nextActions.length > 0 && (
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">Best next upgrade:</span> {quality.nextActions[0]}
            </p>
          )}
        </motion.div>
      )}

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="ws-bento p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Course Progress</span>
          <span className="text-sm text-text-secondary">{course.completedLessons}/{course.totalLessons} lessons</span>
        </div>
        <div className="w-full bg-surface-hover rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: course.color }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-tertiary">
          <span>{Math.round(progress)}% complete</span>
          <span>~{Math.round(course.estimatedHours * (1 - progress / 100))}h remaining</span>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border-subtle">
          <div className="text-center"><p className="text-lg font-bold">{course.conceptCount}</p><p className="text-[10px] text-text-muted">Concepts</p></div>
          <div className="text-center"><p className="text-lg font-bold">{course.glossaryCount}</p><p className="text-[10px] text-text-muted">Glossary</p></div>
          <div className="text-center"><p className="text-lg font-bold">{course.exerciseCount}</p><p className="text-[10px] text-text-muted">Exercises</p></div>
          <div className="text-center"><p className="text-lg font-bold capitalize text-xs">{course.sourceMode}</p><p className="text-[10px] text-text-muted">Source Mode</p></div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border-subtle">
        {[
          { key: 'path' as CourseTab, label: 'Learning Path', icon: MapPin },
          { key: 'map' as CourseTab, label: 'Concept Map', icon: Network },
          { key: 'sources' as CourseTab, label: 'Source Files', icon: FileText },
          { key: 'analytics' as CourseTab, label: 'Analytics', icon: BarChart3 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'pb-3 text-sm font-medium transition-all border-b-2 flex items-center gap-1.5',
              tab === t.key
                ? 'text-brand-400 border-brand-400'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'path' && (
        <div className="space-y-4">
          {course.topics.map((topic, i) => (
            <TopicCard key={topic.id} topic={topic} index={i} courseColor={course.color} course={course} onGoToSource={onGoToSource} onStart={() => onStartLesson(topic.title)} />
          ))}
          {course.topics.length === 0 && (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">Course is being generated... Topics will appear soon.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'map' && <ConceptMap course={course} />}
      {tab === 'sources' && (
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
        />
      )}
      {tab === 'analytics' && <CourseAnalytics course={course} />}

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
          confirmLabel={lang === 'el' ? 'Διαγραφή' : 'Delete'}
          cancelLabel={lang === 'el' ? 'Ακύρωση' : 'Cancel'}
          destructive
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
  const hasDetail = (topic.objectives?.length ?? 0) > 0 || (topic.keyConcepts?.length ?? 0) > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'rounded-2xl border bg-surface-card overflow-hidden transition-all',
        topic.isLocked ? 'border-border-subtle opacity-60' : 'border-border-subtle hover:border-brand-500/20'
      )}
    >
      <div className="flex items-center gap-4 p-5">
        <div className="relative">
          {topic.isLocked ? (
            <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center">
              <Lock className="w-5 h-5 text-text-muted" />
            </div>
          ) : topic.mastery >= 90 ? (
            <div className="w-10 h-10 rounded-xl bg-accent-emerald/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
            </div>
          ) : topic.mastery > 0 ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: courseColor + '15' }}>
              <Circle className="w-5 h-5" style={{ color: courseColor }} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center">
              <Circle className="w-5 h-5 text-text-muted" />
            </div>
          )}
          <span className="absolute -top-1 -left-1 text-[10px] font-bold text-text-muted">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{topic.title}</h3>
          <p className="text-xs text-text-tertiary mt-0.5">{topic.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
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
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors"
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
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">Mastery</span>
                  <span className="font-medium">{topic.mastery}%</span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${topic.mastery}%`,
                      backgroundColor: topic.mastery >= 80 ? '#34d399' : courseColor
                    }}
                  />
                </div>
              </div>
              <button
                onClick={onStart}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
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
          className="px-5 pb-5 pt-0 border-t border-border-subtle/60 space-y-4"
        >
          {(topic.objectives?.length ?? 0) > 0 && (
            <div className="pt-4">
              <p className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-brand-400" /> Learning objectives
              </p>
              <ul className="space-y-1">
                {topic.objectives!.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald shrink-0 mt-0.5" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(topic.keyConcepts?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
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
                      className="group flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 hover:bg-brand-500/20 transition-colors"
                    >
                      {c}
                      <MapPin className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                    </button>
                  ) : (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-hover border border-border-subtle text-text-secondary">
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

function ConceptMap({ course }: { course: Course }) {
  const topics = course.topics.filter(t => !t.isLocked);
  // Generate graph nodes from topics
  const graphNodes = topics.map((t, i) => ({
    id: t.id, label: t.title, mastery: t.mastery,
    type: 'concept' as const,
    x: 100 + (i % 3) * 200, y: 80 + Math.floor(i / 3) * 140,
  }));
  const graphEdges = topics.flatMap(t => t.prerequisites.map(p => ({
    from: p, to: t.id, relation: 'prerequisite' as const,
  }))).filter(e => graphNodes.some(n => n.id === e.from));

  return (
    <div className="space-y-6">
      {graphNodes.length > 0 && (
        <ConceptGraph nodes={graphNodes} edges={graphEdges} width={640} height={Math.max(280, Math.ceil(topics.length / 3) * 140 + 80)} />
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

      <div className="ws-bento p-5 flex items-center justify-center">
        <ReadinessRing value={course.mastery} size={160} label="Course Readiness" sublabel="Based on weighted concept mastery across all topics" />
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
}) {
  const el = lang === 'el';
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
      <div className="ws-bento p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            {el ? 'Αρχεία πηγής' : 'Source Files'}
          </h3>
          {onReprocessMaterial && uploadedFiles.length > 0 && (
            <button
              type="button"
              onClick={onReprocessMaterial}
              disabled={reprocessingMaterial}
              data-testid="course-reprocess-sources"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 text-xs font-medium text-brand-300 hover:bg-brand-500/10 disabled:opacity-60"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', reprocessingMaterial && 'animate-spin')} />
              {el ? 'Επανεπεξεργασία κειμένου' : 'Reprocess stored text'}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {(uploadedFiles.length > 0 ? uploadedFiles : course.sourceFiles.map((name) => ({ name } as UploadedFile))).map((file, i) => (
            <div key={file.id ?? i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-primary/50 border border-border-subtle flex-wrap" data-testid={file.id ? `source-file-${file.id}` : undefined}>
              <FileText className="w-5 h-5 text-text-tertiary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{file.name}</span>
                {'pipelineVersion' in file && file.pipelineVersion && (
                  <span className="text-[10px] text-text-muted">pipeline v{file.pipelineVersion}</span>
                )}
              </div>
              {'ocrUsed' in file && file.ocrUsed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan">OCR</span>
              )}
              {'ingestMethod' in file && file.ingestMethod && (
                <span className="text-[10px] text-text-muted">{file.ingestMethod}</span>
              )}
              <span className="text-xs text-text-muted">{el ? 'Αναλυμένο' : 'Analyzed'}</span>
              {file.id && onRemoveFile && (
                <button
                  type="button"
                  onClick={() => confirmRemove(file)}
                  data-testid={`remove-source-${file.id}`}
                  className="p-1.5 rounded-lg border border-accent-rose/30 text-accent-rose hover:bg-accent-rose/10 transition-colors"
                  title={el ? 'Αφαίρεση αρχείου' : 'Remove file'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {course.pipelineMeta && (
          <p className="mt-3 text-[10px] text-text-muted">
            Pipeline v{course.pipelineMeta.version} · {course.pipelineMeta.outlineSource} · {new Date(course.pipelineMeta.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {glossaryEntries.length > 0 && (
        <div className="ws-bento p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-emerald" />
            Glossary ({glossaryEntries.length})
          </h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {glossaryEntries.slice(0, 24).map((g) => {
              const span = findConceptSpan(course, g.term);
              return (
                <li key={g.term} className="flex items-start justify-between gap-2 text-sm border-b border-border-subtle/50 pb-2">
                  <div className="min-w-0">
                    <span className="font-medium text-brand-300">{g.term}</span>
                    <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{g.definition}</p>
                    {(g.relatedConcepts?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {g.relatedConcepts!.slice(0, 4).map((rc) => (
                          <span key={rc} className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover border border-border-subtle/60 text-text-muted">
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

      <div className="ws-bento p-6">
        <div className="mt-0 p-4 rounded-xl bg-surface-hover/50 border border-border-subtle">
          <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
            Source Analysis Report
          </p>
          <ul className="text-xs text-text-secondary space-y-1">
            <li>• {provenanceCount} concept spans linked to source sentences</li>
            <li>• All content is source-grounded from your uploaded materials</li>
            {course.sourceQuality?.warnings.slice(0, 2).map((w) => (
              <li key={w}>• {w}</li>
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
      confirmLabel={el ? 'Αφαίρεση' : 'Remove'}
      cancelLabel={el ? 'Ακύρωση' : 'Cancel'}
      destructive
      data-testid="course-remove-source-dialog"
    />
    </>
  );
}

function CourseAnalytics({ course }: { course: Course }) {
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
      <div className="ws-bento p-5">
        <h4 className="text-sm font-semibold mb-3">Study Time Distribution</h4>
        <p className="text-[11px] text-text-tertiary mb-3">Estimated minutes per module, from the generated outline</p>
        <div className="space-y-2">
          {course.topics.slice(0, 6).map(topic => (
            <div key={topic.id} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-24 truncate">{topic.title}</span>
              <div className="flex-1 bg-surface-hover rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-brand-500 transition-all"
                  style={{ width: `${Math.max(8, ((topic.estimatedMinutes || 0) / maxMinutes) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-text-muted w-10 text-right">{topic.estimatedMinutes}m</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ws-bento p-5">
        <h4 className="text-sm font-semibold mb-3">Retention Predictions</h4>
        <div className="space-y-2">
          {course.topics.filter(t => t.mastery > 0).slice(0, 5).map(topic => {
            const retention = Math.max(0, topic.retentionPrediction || topic.mastery);
            return (
              <div key={topic.id} className="flex items-center justify-between">
                <span className="text-xs text-text-secondary truncate w-24">{topic.title}</span>
                <span className={cn(
                  'text-xs font-medium',
                  retention >= 70 ? 'text-accent-emerald' : retention >= 50 ? 'text-accent-amber' : 'text-accent-rose'
                )}>
                  {Math.round(retention)}% predicted
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ws-bento p-5 sm:col-span-2">
        <h4 className="text-sm font-semibold mb-3">Concept Coverage &amp; Pace</h4>
        <p className="text-xs text-text-secondary mb-4">Mastered concepts relative to the {totalConcepts} concepts extracted from your material</p>
        {masteredConcepts > 0 ? (
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-3xl font-bold text-accent-emerald">{masteredConcepts}<span className="text-base text-text-muted">/{totalConcepts}</span></div>
              <p className="text-xs text-text-tertiary mt-1">concepts mastered</p>
            </div>
            {velocity > 0 && (
              <div>
                <div className={cn('text-3xl font-bold', velocity >= 1 ? 'text-accent-emerald' : 'text-accent-amber')}>{velocity.toFixed(2)}×</div>
                <p className="text-xs text-text-tertiary mt-1">
                  {velocity >= 1.05 ? 'Ahead of the expected pace' : velocity <= 0.95 ? 'Behind the expected pace' : 'On the expected pace'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">Start studying this course to see your concept mastery and pace.</p>
        )}
      </div>
    </div>
  );
}
