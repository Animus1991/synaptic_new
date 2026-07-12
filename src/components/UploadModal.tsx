import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, Image, Code, Presentation,
  File, CheckCircle2, Sparkles, ArrowRight, Link2,
  AlertCircle, MessageSquare, Loader2
} from '@/lib/lucide-shim';
import { cn } from '../utils/cn';

import type { UploadPayload } from '../lib/uploadPipeline';
import type { Course, UserSettings } from '../types';
import { isDemoCourse } from '../lib/demoMode';
import { previewUploadOutline, type UploadOutlinePreview } from '../lib/uploadOutlinePreview';
import { OutlinePreviewPanel } from './OutlinePreviewPanel';
import { applyEditedTopicTitles, outlineTopicsWereEdited } from '../lib/outlineTopicEdit';
import { UiIcon } from './ui/UiIcon';
import type { UiIconId } from '../lib/uiIconRegistry';
import { t } from '../lib/i18n';
import { ModalHeaderStack } from './ui/ModalHeaderStack';
import { validateUploadInput, createUploadJobId } from '../lib/uploadValidation';
import type { I18nKey } from '../lib/i18n';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  onProcessUpload?: (payload: UploadPayload) => Promise<unknown>;
  /** Called after a successful processUpload with the generated/extended course. */
  onUploadComplete?: (course: Course) => void;
  onProceed: () => void;
  courses?: Course[];
  defaultUploadMode?: 'new' | 'extend';
  defaultTargetCourseId?: string;
  userSettings?: UserSettings;
}

const acceptedFormats = [
  { ext: 'PDF', icon: FileText, color: 'text-red-400' },
  { ext: 'DOCX', icon: File, color: 'text-blue-400' },
  { ext: 'PPTX', icon: Presentation, color: 'text-orange-400' },
  { ext: 'TXT/MD', icon: FileText, color: 'text-text-secondary' },
  { ext: 'ChatGPT JSON/ZIP', icon: MessageSquare, color: 'text-brand-400' },
  { ext: 'Images', icon: Image, color: 'text-accent-emerald' },
  { ext: 'Code', icon: Code, color: 'text-accent-teal' },
];

type SourceMode = 'strict' | 'enriched' | 'notes-only';
type UploadMode = 'new' | 'extend';
type UploadFocusKey = 'exam' | 'deep' | 'quick' | 'practice' | 'beginner';

const UPLOAD_FOCUS_KEYS: UploadFocusKey[] = ['exam', 'deep', 'quick', 'practice', 'beginner'];
const DEFAULT_UPLOAD_FOCUS: UploadFocusKey = 'deep';

const FOCUS_PIPELINE_LABELS: Record<UploadFocusKey, string> = {
  exam: 'Exam preparation',
  deep: 'Deep understanding',
  quick: 'Quick review',
  practice: 'Practice-heavy',
  beginner: 'Beginner-friendly',
};

const FOCUS_I18N: Record<UploadFocusKey, 'uploadFocusExam' | 'uploadFocusDeep' | 'uploadFocusQuick' | 'uploadFocusPractice' | 'uploadFocusBeginner'> = {
  exam: 'uploadFocusExam',
  deep: 'uploadFocusDeep',
  quick: 'uploadFocusQuick',
  practice: 'uploadFocusPractice',
  beginner: 'uploadFocusBeginner',
};

const SOURCE_MODES: { mode: SourceMode; labelKey: 'uploadSourceStrict' | 'uploadSourceEnriched' | 'uploadSourceNotesOnly'; descKey: 'uploadSourceStrictDesc' | 'uploadSourceEnrichedDesc' | 'uploadSourceNotesOnlyDesc'; icon: UiIconId }[] = [
  { mode: 'strict', labelKey: 'uploadSourceStrict', descKey: 'uploadSourceStrictDesc', icon: 'lock' },
  { mode: 'enriched', labelKey: 'uploadSourceEnriched', descKey: 'uploadSourceEnrichedDesc', icon: 'sparkle' },
  { mode: 'notes-only', labelKey: 'uploadSourceNotesOnly', descKey: 'uploadSourceNotesOnlyDesc', icon: 'notes' },
];

const FLOW_STAGES = [
  { key: 'upload', labelKey: 'uploadStageInput', hintKey: 'uploadStageInputHint' },
  { key: 'configure', labelKey: 'uploadStageOutline', hintKey: 'uploadStageOutlineHint' },
  { key: 'processing', labelKey: 'uploadStageCourse', hintKey: 'uploadStageCourseHint' },
] as const;

export function UploadModal({
  isOpen,
  onClose,
  onUpload,
  onProcessUpload,
  onUploadComplete,
  onProceed,
  courses = [],
  defaultUploadMode = 'new',
  defaultTargetCourseId,
  userSettings,
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [pastedContent, setPastedContent] = useState('');
  const [sourceMode, setSourceMode] = useState<SourceMode>('enriched');
  const [step, setStep] = useState<'upload' | 'configure' | 'processing' | 'error'>('upload');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [focusTags, setFocusTags] = useState<UploadFocusKey[]>([DEFAULT_UPLOAD_FOCUS]);
  const [examDate, setExamDate] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('new');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [outlinePreview, setOutlinePreview] = useState<UploadOutlinePreview | null>(null);
  const [editedTopicTitles, setEditedTopicTitles] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{ key: I18nKey; detail?: string }[]>([]);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const previewLang = userSettings?.language === 'el' ? 'el' : 'en';

  const extendableCourses = courses.filter((c) => !isDemoCourse(c.id));

  const toggleFocus = (tag: UploadFocusKey) => {
    setFocusTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resolveDefaultUploadMode = useCallback((): UploadMode => {
    if (
      defaultUploadMode === 'extend'
      && defaultTargetCourseId
      && extendableCourses.some((course) => course.id === defaultTargetCourseId)
    ) {
      return 'extend';
    }
    return 'new';
  }, [defaultTargetCourseId, defaultUploadMode, extendableCourses]);

  const resetForm = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setPastedContent('');
    setYoutubeUrl('');
    setFocusTags([DEFAULT_UPLOAD_FOCUS]);
    setExamDate('');
    setSourceMode(userSettings?.sourceMode ?? 'enriched');
    const nextUploadMode = resolveDefaultUploadMode();
    setUploadMode(nextUploadMode);
    setTargetCourseId(nextUploadMode === 'extend' ? (defaultTargetCourseId ?? '') : '');
    setProcessingError(null);
    setOutlinePreview(null);
    setEditedTopicTitles([]);
    setPreviewLoading(false);
    setPreviewError(null);
    setValidationIssues([]);
    setCloseConfirmOpen(false);
    setIsSubmitting(false);
    setUploadJobId(null);
  }, [defaultTargetCourseId, resolveDefaultUploadMode, userSettings?.sourceMode]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      resetForm();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSubmitting) {
          e.preventDefault();
          setCloseConfirmOpen(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  const requestClose = () => {
    if (isSubmitting) {
      setCloseConfirmOpen(true);
      return;
    }
    onClose();
  };

  const collectValidation = useCallback(() => {
    const issues = validateUploadInput({
      files,
      pastedContent,
      youtubeUrl,
      uploadMode,
      targetCourseId,
      hasExtendTarget: extendableCourses.length > 0,
    });
    setValidationIssues(issues);
    return issues;
  }, [files, pastedContent, youtubeUrl, uploadMode, targetCourseId, extendableCourses.length]);

  const goToConfigure = () => {
    const issues = collectValidation();
    if (issues.length > 0) return;
    setStep('configure');
  };

  const handleProceed = async () => {
    if (isSubmitting) return;
    const issues = collectValidation();
    if (issues.length > 0) return;

    const editedOutline = outlinePreview && outlineTopicsWereEdited(outlinePreview.outline, editedTopicTitles)
      ? applyEditedTopicTitles(outlinePreview.outline, editedTopicTitles)
      : outlinePreview?.outline;

    const payload: UploadPayload = {
      files,
      pastedContent: pastedContent.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      sourceMode,
      focusTags: focusTags.map((key) => FOCUS_PIPELINE_LABELS[key]),
      examDate: examDate || undefined,
      uploadMode,
      targetCourseId: uploadMode === 'extend' && targetCourseId ? targetCourseId : undefined,
      editedOutline,
    };
    const jobId = createUploadJobId();
    setUploadJobId(jobId);
    setStep('processing');
    setProcessingError(null);
    setIsSubmitting(true);
    try {
      if (onProcessUpload) {
        const result = await onProcessUpload(payload);
        if (result && typeof result === 'object' && 'id' in result) {
          onUploadComplete?.(result as Course);
        }
      } else if (files.length > 0) {
        onUpload(files);
      }
      resetForm();
      onProceed();
      onClose();
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : t('uploadFailed', previewLang));
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== 'configure') return;

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setOutlinePreview(null);

    previewUploadOutline(
      {
        files,
        pastedContent: pastedContent.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
      },
      userSettings,
    )
      .then((result) => {
        if (cancelled) return;
        setOutlinePreview(result);
        if (result) {
          setEditedTopicTitles(result.outline.topics.map((topic) => topic.title));
        }
        if (!result) {
          setPreviewError(t('uploadPreviewTooShort', previewLang));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : t('uploadPreviewFailed', previewLang));
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, files, pastedContent, youtubeUrl, userSettings, previewLang]);

  const activeFlowIndex = step === 'upload' ? 0 : step === 'configure' ? 1 : 2;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/70" onClick={requestClose} aria-hidden="true" />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] ux-modal-panel rounded-2xl border border-border-subtle bg-surface-secondary overflow-y-auto"
          data-testid="upload-modal"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-5 border-b border-border-subtle">
            <ModalHeaderStack
              eyebrow={t('uploadModalEyebrow', previewLang)}
              title={t('uploadModalTitle', previewLang)}
              titleId="upload-modal-title"
              subtitle={
                step === 'upload' ? t('uploadModalStepUpload', previewLang)
                : step === 'configure' ? t('uploadModalStepConfigure', previewLang)
                : step === 'processing' ? t('uploadModalStepProcessing', previewLang)
                : t('uploadModalStepError', previewLang)
              }
            />
            <button type="button" onClick={requestClose} disabled={false} aria-label={t('close', previewLang)} className="p-2 rounded-lg hover:bg-surface-hover shrink-0">
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {closeConfirmOpen && (
            <div className="mx-5 mt-4 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-4" data-testid="upload-close-confirm">
              <p className="text-sm font-semibold">{t('uploadCloseWhileProcessingTitle', previewLang)}</p>
              <p className="text-xs text-text-secondary mt-1">{t('uploadCloseWhileProcessingBody', previewLang)}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setCloseConfirmOpen(false)} className="px-3 py-1.5 text-xs rounded-lg border border-border-subtle">
                  {t('uploadCancel', previewLang)}
                </button>
                <button type="button" onClick={() => { setCloseConfirmOpen(false); onClose(); }} className="px-3 py-1.5 text-xs rounded-lg bg-accent-rose/20 text-accent-rose">
                  {t('uploadCloseConfirm', previewLang)}
                </button>
              </div>
            </div>
          )}

          {validationIssues.length > 0 && step === 'upload' && (
            <div className="mx-5 mt-4 rounded-xl border border-accent-rose/30 bg-accent-rose/10 p-4" data-testid="upload-validation-errors" role="alert">
              <p className="text-xs font-semibold mb-2">{t('uploadValidationSummary', previewLang)}</p>
              <ul className="space-y-1 text-xs text-text-secondary">
                {validationIssues.map((issue, i) => (
                  <li key={`${issue.key}-${i}`}>
                    {t(issue.key, previewLang)}{issue.detail ? `: ${issue.detail}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-5 pt-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {FLOW_STAGES.map((stage, index) => {
                const isActive = activeFlowIndex === index;
                const isDone = activeFlowIndex > index;
                return (
                  <div
                    key={stage.key}
                    className={cn(
                      'rounded-xl border p-3 transition-colors',
                      isActive
                        ? 'border-brand-500/40 bg-brand-500/8'
                        : isDone
                          ? 'border-accent-emerald/25 bg-accent-emerald/8'
                          : 'border-border-subtle bg-surface-card/50',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        'grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold',
                        isActive
                          ? 'bg-brand-500 text-white'
                          : isDone
                            ? 'bg-accent-emerald text-white'
                            : 'bg-surface-hover text-text-tertiary',
                      )}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                      <p className="text-sm font-medium text-text-primary">{t(stage.labelKey, previewLang)}</p>
                    </div>
                    <p className="text-xs text-text-secondary">{t(stage.hintKey, previewLang)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {step === 'upload' && (
              <>
                {/* Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'ux-upload-drop-zone ux-prompt-bar-surface border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                    dragActive
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-border-default hover:border-brand-500/50 hover:bg-surface-hover/50'
                  )}
                  data-active={dragActive || undefined}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    data-testid="upload-file-input"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv,.py,.js,.ts,.r,.sql,.jpg,.jpeg,.png,.gif,.webp,.json,.zip"
                  />
                  <Upload className={cn(
                    'w-10 h-10 mx-auto mb-3 transition-colors',
                    dragActive ? 'text-brand-400' : 'text-text-muted'
                  )} />
                  <p className="text-sm font-medium mb-1">
                    {dragActive ? t('uploadDropActive', previewLang) : t('uploadDropIdle', previewLang)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {t('uploadFormatsHint', previewLang)}
                  </p>
                </div>

                {/* Accepted formats */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {acceptedFormats.map(f => (
                    <span key={f.ext} className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <f.icon className={cn('w-3.5 h-3.5', f.color)} />
                      {f.ext}
                    </span>
                  ))}
                </div>

                {/* Selected files */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-text-tertiary font-medium">
                      {t('uploadFilesSelected', previewLang).replace('{count}', String(files.length))}
                    </p>
                    {files.map((file, i) => {
                      const isChatGpt = /\.(json|zip)$/i.test(file.name);
                      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
                      return (
                      <div key={fileKey} className="flex items-center gap-3 p-3 rounded-xl bg-surface-card border border-border-subtle">
                        {isChatGpt ? (
                          <MessageSquare className="w-4 h-4 text-brand-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                        )}
                        <span className="text-sm flex-1 truncate">{file.name}</span>
                        {isChatGpt && (
                          <span className="text-[10px] font-medium text-brand-300 shrink-0">{t('uploadChatGptExportBadge', previewLang)}</span>
                        )}
                        <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                        <button
                          onClick={e => { e.stopPropagation(); removeFile(i); }}
                          className="text-text-muted hover:text-accent-rose"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );})}
                  </div>
                )}

                {/* Or paste content */}
                <div className="ux-prompt-bar">
                  <label className="text-xs text-text-tertiary font-medium block mb-2">{t('uploadPasteLabel', previewLang)}</label>
                  <textarea
                    data-testid="upload-paste"
                    value={pastedContent}
                    onChange={e => setPastedContent(e.target.value)}
                    placeholder={t('uploadPastePlaceholder', previewLang)}
                    rows={4}
                    className="ux-prompt-bar-input w-full px-4 py-3 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 resize-none"
                  />
                </div>

                <div className="rounded-xl border border-border-subtle bg-surface-hover/40 p-3">
                  <p className="text-xs text-text-secondary">{t('uploadNextStepHint', previewLang)}</p>
                </div>

                {/* YouTube URL */}
                <div>
                  <label className="text-xs text-text-tertiary font-medium block mb-2">
                    <Link2 className="w-3.5 h-3.5 inline mr-1" />
                    {t('uploadYoutubeLabel', previewLang)}
                  </label>
                  <input
                    type="url"
                    data-testid="upload-youtube-url"
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                    placeholder={t('uploadYoutubePlaceholder', previewLang)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50"
                  />
                </div>
              </>
            )}

            {step === 'configure' && (
              <>
                <div className="rounded-xl border border-brand-500/15 bg-brand-500/5 p-3">
                  <p className="text-xs text-text-secondary">{t('uploadConfigureHint', previewLang)}</p>
                </div>

                <OutlinePreviewPanel
                  preview={outlinePreview}
                  loading={previewLoading}
                  error={previewError}
                  language={previewLang}
                  editable
                  editedTopicTitles={editedTopicTitles}
                  onTopicTitleChange={(index, title) => {
                    setEditedTopicTitles((prev) => {
                      const next = [...prev];
                      next[index] = title;
                      return next;
                    });
                  }}
                />

                {extendableCourses.length > 0 && (
                  <div>
                    <label className="text-sm font-medium block mb-3">{t('uploadCourseTarget', previewLang)}</label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setUploadMode('new')}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border text-sm transition-all',
                          uploadMode === 'new' ? 'border-brand-500/50 bg-brand-500/10' : 'border-border-subtle',
                        )}
                      >
                        {t('uploadModeNew', previewLang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('extend')}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border text-sm transition-all',
                          uploadMode === 'extend' ? 'border-brand-500/50 bg-brand-500/10' : 'border-border-subtle',
                        )}
                      >
                        {t('uploadModeExtend', previewLang)}
                      </button>
                      {uploadMode === 'extend' && (
                        <select
                          value={targetCourseId}
                          onChange={(e) => setTargetCourseId(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-surface-input border border-border-subtle text-sm"
                        >
                          <option value="">{t('uploadSelectCourse', previewLang)}</option>
                          {extendableCourses.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Source mode */}
                <div>
                  <label className="text-sm font-medium block mb-3">{t('uploadSourceModeLabel', previewLang)}</label>
                  <div className="space-y-2">
                    {SOURCE_MODES.map((s) => (
                      <button
                        key={s.mode}
                        onClick={() => setSourceMode(s.mode)}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border transition-all',
                          sourceMode === s.mode
                            ? 'border-brand-500/50 bg-brand-500/10'
                            : 'border-border-subtle hover:border-brand-500/20'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <UiIcon id={s.icon} size="sm" className="text-brand-600" />
                          <span className="font-medium text-sm">{t(s.labelKey, previewLang)}</span>
                        </div>
                        <p className="text-xs text-text-secondary ml-6">{t(s.descKey, previewLang)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Focus */}
                <div>
                  <label className="text-sm font-medium block mb-3">{t('uploadLearningFocus', previewLang)}</label>
                  <div className="flex flex-wrap gap-2">
                    {UPLOAD_FOCUS_KEYS.map((focus) => (
                      <button
                        key={focus}
                        type="button"
                        onClick={() => toggleFocus(focus)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          focusTags.includes(focus)
                            ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                            : 'border-border-subtle hover:border-brand-500/30 hover:bg-brand-500/5',
                        )}
                      >
                        {t(FOCUS_I18N[focus], previewLang)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam date */}
                <div>
                  <label className="text-sm font-medium block mb-2">{t('uploadExamDateLabel', previewLang)}</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
                  />
                </div>

                <div className="p-3 rounded-xl bg-surface-hover/50 border border-border-subtle">
                  <p className="text-xs text-text-secondary flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    {t('uploadQualityHint', previewLang)}
                  </p>
                </div>
              </>
            )}

            {step === 'error' && (
              <div className="text-center py-8 space-y-4" data-testid="upload-error">
                <AlertCircle className="w-12 h-12 text-accent-rose mx-auto" />
                <h3 className="text-lg font-semibold">{t('uploadErrorTitle', previewLang)}</h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto">{processingError}</p>
                <button
                  type="button"
                  onClick={() => setStep('configure')}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500"
                >
                  {t('uploadBackToSettings', previewLang)}
                </button>
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-8">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-teal animate-pulse" />
                  <div className="absolute inset-1 rounded-xl bg-surface-secondary flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-brand-400 animate-float" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('uploadProcessingTitle', previewLang)}</h3>
                <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                  {t('uploadProcessingBody', previewLang)}
                </p>
                <p className="text-xs text-text-tertiary mb-5">{t('uploadProcessingSummary', previewLang)}</p>
                {uploadJobId && (
                  <p className="text-[10px] text-text-muted mb-3 font-mono" data-testid="upload-job-id">{uploadJobId.slice(0, 8)}</p>
                )}
                <div
                  className="flex items-center justify-center gap-2 text-sm text-text-secondary"
                  role="status"
                  aria-live="polite"
                  data-testid="upload-processing-status"
                >
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin shrink-0" aria-hidden />
                  <span>{t('uploadProcessingIndeterminate', previewLang)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'processing' && step !== 'error' && (
            <div className="p-5 border-t border-border-subtle flex items-center justify-between">
              <button
                onClick={step === 'configure' ? () => setStep('upload') : requestClose}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {step === 'configure' ? t('uploadBack', previewLang) : t('uploadCancel', previewLang)}
              </button>
              <button
                data-testid={step === 'upload' ? 'upload-continue' : 'upload-generate'}
                onClick={step === 'upload' ? goToConfigure : handleProceed}
                disabled={isSubmitting || (step === 'configure' && uploadMode === 'extend' && !targetCourseId)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
                  isSubmitting || (step === 'configure' && uploadMode === 'extend' && !targetCourseId)
                    ? 'bg-surface-hover text-text-muted cursor-not-allowed'
                    : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-500 hover:to-brand-400'
                )}
              >
                {step === 'upload' ? t('continue', previewLang) : t('uploadGenerateCourse', previewLang)}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
