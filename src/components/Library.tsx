import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, BookOpen, FileText, ChevronRight, ChevronDown,
  Clock, BarChart3, Sparkles, Plus, Grid3X3, List, Loader2,
  File, Image, Code, Presentation, Table2, AlertTriangle, Trash2, RefreshCw,
} from 'lucide-react';
import type { Course, UploadedFile, UserSettings, Task, GlossaryEntry } from '../types';
import { cn } from '../utils/cn';
import { buildMaterialOutlinePreview } from '../lib/uploadOutlinePreview';
import { OutlinePreviewPanel } from './OutlinePreviewPanel';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { buildDeleteFileCascadeCopy } from '../lib/deleteFileCascadeCopy';
import { buildDeleteCourseCascadeCopy } from '../lib/deleteCourseCascadeCopy';
import { countFilesForCourse } from '../lib/deleteCascade';
import { countGeneratedTasksForCourse } from '../lib/pipelineReprocess';
import { courseDeleteStats } from '../lib/removeCourse';
import { isDemoCourse } from '../lib/demoMode';

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
}

type LibraryTab = 'courses' | 'files';
type ViewMode = 'grid' | 'list';

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
}: LibraryProps) {
  const userLanguage = userSettings?.language === 'el' ? 'el' : 'en';
  const [tab, setTab] = useState<LibraryTab>('courses');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filteredCourses = courses.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'in-progress') return c.status === 'in-progress';
    if (filter === 'completed') return c.status === 'completed';
    if (filter === 'generating') return c.status === 'generating';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:px-8 pb-24 lg:pb-6 w-full min-w-0 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Library</h1>
          <p className="text-text-secondary mt-1">Your uploaded materials and generated courses</p>
        </div>
        <button
          onClick={onUpload}
          data-testid="library-upload"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl font-medium text-sm hover:from-brand-500 hover:to-brand-400 transition-all whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          Upload Material
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border-subtle">
        {(['courses', 'files'] as LibraryTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'pb-3 text-sm font-medium transition-all border-b-2 capitalize',
              tab === t
                ? 'text-brand-400 border-brand-400'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            )}
          >
            {t} {t === 'courses' && `(${courses.length})`} {t === 'files' && `(${uploadedFiles.length})`}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search courses, topics, or files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'in-progress', 'generating', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize',
                filter === f
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                  : 'text-text-tertiary hover:text-text-secondary border border-border-subtle hover:border-border-default'
              )}
            >
              {f}
            </button>
          ))}
          <div className="hidden sm:flex items-center border border-border-subtle rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-l-lg', viewMode === 'grid' ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary')}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-r-lg', viewMode === 'list' ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'courses' && (
          <motion.div
            key="courses"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredCourses.length === 0 ? (
              <EmptyState onUpload={onUpload} />
            ) : (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-3'
              )}>
                {filteredCourses.map((course, i) => (
                  viewMode === 'grid'
                    ? <CourseCard key={course.id} course={course} index={i} tasks={tasks} glossaryEntries={glossaryEntries} uploadedFiles={uploadedFiles} userLanguage={userLanguage} onClick={() => onSelectCourse(course)} onRemoveCourse={onRemoveCourse} />
                    : <CourseListItem key={course.id} course={course} index={i} tasks={tasks} glossaryEntries={glossaryEntries} uploadedFiles={uploadedFiles} userLanguage={userLanguage} onClick={() => onSelectCourse(course)} onRemoveCourse={onRemoveCourse} />
                ))}
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
          >
            {uploadedFiles.length === 0 ? (
              <EmptyState onUpload={onUpload} />
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((file, i) => (
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
    </div>
  );
}

function CourseCard({
  course,
  index,
  onClick,
  onRemoveCourse,
  uploadedFiles,
  tasks = [],
  glossaryEntries = [],
  userLanguage = 'en',
}: {
  course: Course;
  index: number;
  onClick: () => void;
  onRemoveCourse?: (courseId: string) => boolean;
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
  const quality = course.sourceQuality;
  const qualityTone = quality?.band === 'strong'
    ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
    : quality?.band === 'moderate'
      ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
      : 'bg-accent-amber/10 text-accent-amber border-accent-amber/20';
  const qualityLabel = quality?.band === 'strong'
    ? 'Strong source'
    : quality?.band === 'moderate'
      ? 'Moderate source'
      : 'Needs more material';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      data-testid="library-course-card"
      className="p-5 rounded-2xl border border-border-subtle bg-surface-card hover:border-brand-500/30 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{course.icon}</div>
        <div className="flex items-center gap-1">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRemoveDialogOpen(true); }}
              data-testid="library-course-delete"
              className="rounded-lg p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-accent-rose/10 hover:text-accent-rose hover:opacity-100"
              aria-label={userLanguage === 'el' ? 'Διαγραφή μαθήματος' : 'Delete course'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isGenerating ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-amber/10 text-accent-amber text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating
          </div>
        ) : (
          <div className="text-xs text-text-tertiary font-medium capitalize px-2 py-1 rounded-full border border-border-subtle">
            {course.difficulty}
          </div>
        )}
        </div>
      </div>

      <h3 className="font-semibold mb-1 group-hover:text-brand-300 transition-colors" data-testid="library-course-title">{course.title}</h3>
      <p className="text-xs text-text-tertiary mb-4 line-clamp-2">{course.description}</p>
      {quality && !isGenerating && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium', qualityTone)}>
            {quality.needsMoreMaterial ? <AlertTriangle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {qualityLabel}
          </span>
          <span className="text-[10px] text-text-muted">{quality.score}/100</span>
        </div>
      )}
      {quality?.needsMoreMaterial && !isGenerating && (
        <p className="mb-3 text-[11px] text-accent-amber line-clamp-2">
          {quality.warnings[0] ?? 'Add more material to deepen grounding before intensive study.'}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-text-tertiary mb-3">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {course.totalLessons} lessons
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {course.estimatedHours}h
        </span>
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" />
          {course.mastery}%
        </span>
      </div>

      {!isGenerating && (
        <div className="w-full bg-surface-hover rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: course.color }}
          />
        </div>
      )}

      {isGenerating && (
        <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 bg-accent-amber shimmer" style={{ width: '60%' }} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {course.sourceFiles.slice(0, 2).map(f => (
            <span key={f} className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-surface-hover truncate max-w-[100px]">
              {f}
            </span>
          ))}
          {course.sourceFiles.length > 2 && (
            <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-surface-hover">
              +{course.sourceFiles.length - 2}
            </span>
          )}
        </div>
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
          course.sourceMode === 'strict' ? 'bg-accent-emerald/10 text-accent-emerald' : course.sourceMode === 'enriched' ? 'bg-brand-500/10 text-brand-300' : 'bg-surface-hover text-text-muted'
        )}>
          {course.sourceMode === 'strict' ? '🔒 Strict' : course.sourceMode === 'enriched' ? '✨ Enriched' : '📝 Notes'}
        </span>
      </div>
      {course.conceptCount > 0 && (
        <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
          <span>{course.conceptCount} concepts</span>
          <span>{course.glossaryCount} terms</span>
          <span>{course.exerciseCount} exercises</span>
        </div>
      )}
      {canDelete && (
        <ConfirmDialog
          open={removeDialogOpen}
          title={deleteCopy.title}
          description={deleteCopy.description}
          confirmLabel={userLanguage === 'el' ? 'Διαγραφή' : 'Delete'}
          cancelLabel={userLanguage === 'el' ? 'Ακύρωση' : 'Cancel'}
          destructive
          onConfirm={() => {
            onRemoveCourse?.(course.id);
            setRemoveDialogOpen(false);
          }}
          onClose={() => setRemoveDialogOpen(false)}
        />
      )}
    </motion.div>
  );
}

function CourseListItem({
  course,
  index,
  onClick,
  onRemoveCourse,
  uploadedFiles,
  tasks = [],
  glossaryEntries = [],
  userLanguage = 'en',
}: {
  course: Course;
  index: number;
  onClick: () => void;
  onRemoveCourse?: (courseId: string) => boolean;
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-surface-card hover:border-brand-500/30 cursor-pointer transition-all group"
    >
      <div className="text-2xl">{course.icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm group-hover:text-brand-300 transition-colors truncate">{course.title}</h3>
        <p className="text-xs text-text-tertiary mt-0.5">{course.subject} · {course.totalLessons} lessons · {course.estimatedHours}h</p>
        {quality && (
          <p className={cn(
            'text-[11px] mt-1 truncate',
            quality.needsMoreMaterial ? 'text-accent-amber' : 'text-text-muted',
          )}>
            {quality.needsMoreMaterial
              ? (quality.warnings[0] ?? 'Needs more material for stronger grounding.')
              : `Source quality ${quality.score}/100 · ${quality.finalTopicCount} modules`}
          </p>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-4">
        <div className="w-24">
          <div className="w-full bg-surface-hover rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: course.color }}
            />
          </div>
        </div>
        <span className="text-sm font-medium w-12 text-right">{course.mastery}%</span>
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setRemoveDialogOpen(true); }}
          data-testid="library-course-delete"
          className="rounded-lg p-1.5 text-text-tertiary opacity-80 transition-all hover:bg-accent-rose/10 hover:text-accent-rose hover:opacity-100"
          aria-label={userLanguage === 'el' ? 'Διαγραφή μαθήματος' : 'Delete course'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand-400" />
      {canDelete && (
        <ConfirmDialog
          open={removeDialogOpen}
          title={deleteCopy.title}
          description={deleteCopy.description}
          confirmLabel={userLanguage === 'el' ? 'Διαγραφή' : 'Delete'}
          cancelLabel={userLanguage === 'el' ? 'Ακύρωση' : 'Cancel'}
          destructive
          onConfirm={() => {
            onRemoveCourse?.(course.id);
            setRemoveDialogOpen(false);
          }}
          onClose={() => setRemoveDialogOpen(false)}
        />
      )}
    </motion.div>
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
  const [expanded, setExpanded] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const el = userLanguage === 'el';
  const outlinePreview = useMemo(() => {
    if (!file.extractedText?.trim() || file.status !== 'analyzed') return null;
    return buildMaterialOutlinePreview(file.extractedText, [file.name], userSettings);
  }, [file.extractedText, file.name, file.status, userSettings]);
  const canExpand = Boolean(outlinePreview);
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

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {(file.size / 1024).toFixed(1)} KB · {file.type.toUpperCase()}
            {course && <> · {course.title}</>}
            {outlinePreview && (
              <> · {outlinePreview.outline.topics.length} {el ? 'ενότητες' : 'modules'}</>
            )}
          </p>
          {file.pipelineVersion && (
            <p className="text-[10px] text-text-muted mt-0.5">pipeline v{file.pipelineVersion}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {file.status === 'uploading' && (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-surface-hover rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${file.progress}%` }} />
              </div>
              <span className="text-xs text-text-tertiary">{Math.round(file.progress || 0)}%</span>
            </div>
          )}
          {file.status === 'processing' && (
            <span className="flex items-center gap-1 text-xs text-accent-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing
            </span>
          )}
          {file.status === 'analyzed' && (
            <span className="flex items-center gap-1 text-xs text-accent-emerald">
              <Sparkles className="w-3 h-3" />
              {el ? 'Έτοιμο' : 'Ready'}
            </span>
          )}
          {canReprocess && (
            <button
              type="button"
              onClick={() => file.courseId && onReprocessCourse?.(file.courseId)}
              disabled={reprocessingMaterial}
              data-testid={`library-reprocess-${file.id}`}
              className="p-1.5 rounded-lg border border-brand-500/30 text-brand-300 hover:bg-brand-500/10 disabled:opacity-60 transition-colors"
              title={el ? 'Επανεπεξεργασία κειμένου μαθήματος' : 'Reprocess course stored text'}
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
              title={el ? 'Αφαίρεση αρχείου' : 'Remove file'}
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
              aria-label={expanded ? 'Hide outline preview' : 'Show outline preview'}
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && outlinePreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3"
          >
            <OutlinePreviewPanel
              preview={outlinePreview}
              compact
              language={userLanguage}
            />
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
      confirmLabel={el ? 'Αφαίρεση' : 'Remove'}
      cancelLabel={el ? 'Ακύρωση' : 'Cancel'}
      destructive
      data-testid={`library-remove-dialog-${file.id}`}
    />
    </>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center mb-6">
        <Plus className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No content yet</h3>
      <p className="text-text-secondary text-sm mb-6 max-w-sm">
        Upload your first document and the AI will transform it into an interactive learning course.
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-sm transition-all"
      >
        <Upload className="w-4 h-4" />
        Upload Material
      </button>
    </div>
  );
}
