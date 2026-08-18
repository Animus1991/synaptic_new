import { useEffect, useState } from 'react';
import { X } from '@/lib/lucide-shim';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { Button } from './ui/Button';
import { FocusTrapDialog } from './ui/FocusTrapDialog';
import { ModalHeaderStack } from './ui/ModalHeaderStack';

const fieldClass =
  'w-full min-h-9 rounded-lg border-0 bg-surface-secondary/55 px-3 py-2 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35';

type Props = {
  open: boolean;
  lang: Lang;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => boolean | void;
  testId?: string;
};

export function LibraryNameDialog({
  open,
  lang,
  title,
  initialValue,
  onClose,
  onSave,
  testId = 'library-rename-dialog',
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    setError(null);
  }, [open, initialValue]);

  const handleSave = () => {
    if (!value.trim()) {
      setError(t('libRenameRequired', lang));
      return;
    }
    const ok = onSave(value);
    if (ok !== false) onClose();
  };

  return (
    <FocusTrapDialog
      open={open}
      onClose={onClose}
      title={title}
      hideHeader
      size="sm"
      zIndex={160}
      align="bottom-mobile"
      data-testid={testId}
      bodyClassName="p-0"
    >
      <div className="relative flex items-start justify-between gap-3 p-5 border-b border-border-subtle">
        <ModalHeaderStack
          eyebrow={t('libRenameEyebrow', lang)}
          title={title}
          titleId="library-rename-title"
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
          <span className="type-caption text-text-secondary">{t('libRenameLabel', lang)}</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="library-rename-input"
            className={fieldClass}
          />
        </label>
        {error && (
          <p className="type-micro text-accent-rose" role="alert">{error}</p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle p-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>{t('cancel', lang)}</Button>
        <Button variant="primary" onClick={handleSave} data-testid="library-rename-save">
          {t('save', lang)}
        </Button>
      </div>
    </FocusTrapDialog>
  );
}
