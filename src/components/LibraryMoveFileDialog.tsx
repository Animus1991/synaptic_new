import { useEffect, useState } from 'react';
import { X } from '@/lib/lucide-shim';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { Button } from './ui/Button';
import { FocusTrapDialog } from './ui/FocusTrapDialog';
import { ModalHeaderStack } from './ui/ModalHeaderStack';

const fieldClass =
  'w-full min-h-9 rounded-lg border-0 bg-surface-secondary/55 px-3 py-2 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35';

export type LibraryMoveCourseOption = {
  id: string;
  title: string;
};

export type LibraryMoveFolderOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  lang: Lang;
  fileName: string;
  currentCourseId?: string;
  currentFolderId?: string;
  courses: LibraryMoveCourseOption[];
  folders?: LibraryMoveFolderOption[];
  onClose: () => void;
  onMove: (courseId: string | null, folderId: string | null) => boolean | void;
};

export function LibraryMoveFileDialog({
  open,
  lang,
  fileName,
  currentCourseId,
  currentFolderId,
  courses,
  folders = [],
  onClose,
  onMove,
}: Props) {
  const [courseId, setCourseId] = useState(currentCourseId ?? '');
  const [folderId, setFolderId] = useState(currentFolderId ?? '');

  useEffect(() => {
    if (!open) return;
    setCourseId(currentCourseId ?? '');
    setFolderId(currentFolderId ?? '');
  }, [open, currentCourseId, currentFolderId]);

  const handleSave = () => {
    const nextCourse = courseId.trim() ? courseId : null;
    const nextFolder = folderId.trim() ? folderId : null;
    const ok = onMove(nextCourse, nextFolder);
    if (ok !== false) onClose();
  };

  return (
    <FocusTrapDialog
      open={open}
      onClose={onClose}
      title={t('libMoveFileTitle', lang)}
      hideHeader
      size="sm"
      zIndex={160}
      align="bottom-mobile"
      data-testid="library-move-dialog"
      bodyClassName="p-0"
    >
      <div className="relative flex items-start justify-between gap-3 p-5 border-b border-border-subtle">
        <ModalHeaderStack
          eyebrow={t('libMoveEyebrow', lang)}
          title={t('libMoveFileTitle', lang)}
          subtitle={fileName}
          titleId="library-move-title"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('cancel', lang)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          <X className="w-5 h-5 text-text-secondary" aria-hidden />
        </button>
      </div>
      <div className="space-y-3 p-5">
        <label className="block space-y-1">
          <span className="type-caption text-text-secondary">{t('libMoveFileLabel', lang)}</span>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            data-testid="library-move-course"
            className={fieldClass}
          >
            <option value="">{t('libMoveUnassigned', lang)}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="type-caption text-text-secondary">{t('libMoveFolderLabel', lang)}</span>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            data-testid="library-move-folder"
            className={fieldClass}
          >
            <option value="">{t('libMoveUnfiled', lang)}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </label>
        <p className="type-caption text-text-muted">{t('libMoveFileHint', lang)}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle p-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>{t('cancel', lang)}</Button>
        <Button variant="primary" onClick={handleSave} data-testid="library-move-save">
          {t('save', lang)}
        </Button>
      </div>
    </FocusTrapDialog>
  );
}
