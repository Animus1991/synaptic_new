import { useRef } from 'react';
import { AlertTriangle, X } from '@/lib/lucide-shim';
import { useI18n } from '../../lib/i18n';
import { PrimaryCTA, SecondaryCTA } from './primitives';
import { ModalHeaderStack } from './ModalHeaderStack';
import { FocusTrapDialog } from './FocusTrapDialog';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When true, confirm button shows a loading/disabled state. */
  confirming?: boolean;
  'data-testid'?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirming = false,
  'data-testid': testId = 'confirm-dialog',
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <FocusTrapDialog
      open={open}
      onClose={onClose}
      title={title}
      hideHeader
      size="md"
      zIndex={200}
      align="bottom-mobile"
      data-testid={testId}
      aria-describedby={description ? `${testId}-desc` : undefined}
      bodyClassName="p-0"
      panelClassName="max-w-md"
    >
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3 relative">
        {destructive && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-rose/25 bg-accent-rose/10">
            <AlertTriangle className="h-4 w-4 text-accent-rose" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 pr-6">
          <ModalHeaderStack
            eyebrow={t('confirmDialogEyebrow')}
            title={title}
            subtitle={description}
            titleClassName="text-base font-semibold"
            titleId={`${testId}-title`}
            subtitleId={description ? `${testId}-desc` : undefined}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-2.5 text-text-muted hover:bg-surface-hover hover:text-text-secondary min-w-11 min-h-11 inline-flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle p-5 sm:p-6 sm:flex-row sm:justify-end">
        <SecondaryCTA
          ref={cancelRef}
          onClick={onClose}
          disabled={confirming}
          data-testid={`${testId}-cancel`}
        >
          {cancelLabel}
        </SecondaryCTA>
        <PrimaryCTA
          onClick={onConfirm}
          disabled={confirming}
          data-testid={`${testId}-confirm`}
          className={destructive ? 'bg-accent-rose hover:bg-accent-rose/90' : undefined}
        >
          {confirmLabel}
        </PrimaryCTA>
      </div>
    </FocusTrapDialog>
  );
}
