import { Keyboard, X, Target } from '@/lib/lucide-shim';
import {
  workspaceShortcutGroups,
  shellShortcutGroups,
  displayShortcutKeys,
} from '../../lib/workspaceKeyboardShortcuts';
import { t } from '../../lib/i18n';
import { FocusTrapDialog } from '../ui/FocusTrapDialog';
import { useFocusStudy } from '../../lib/focusStudy';
import { cn } from '../../utils/cn';

type Props = {
  open: boolean;
  onClose: () => void;
  lang: 'en' | 'el';
  /** OPT-M16 — shell help lists app shortcuts only; workspace lists full tool map. */
  variant?: 'workspace' | 'shell';
};

/** Keyboard shortcut help overlay — `?` in Study Workspace (SW-P3-08) or app shell. */
/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function WorkspaceKeyboardHelp({ open, onClose, lang, variant = 'workspace' }: Props) {
  const groups = variant === 'shell' ? shellShortcutGroups(lang) : workspaceShortcutGroups(lang);
  const { focusStudy, toggleFocusStudy } = useFocusStudy();

  return (
    <FocusTrapDialog
      open={open}
      onClose={onClose}
      title={t('keyboardShortcuts', lang)}
      size="md"
      zIndex={70}
      data-testid="workspace-keyboard-help"
      hideHeader
      bodyClassName="p-0"
      panelClassName="overflow-hidden rounded-2xl bg-surface-secondary max-w-lg"
    >
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-text-secondary" />
          <h2 className="type-meta font-semibold text-text-primary">
            {t('keyboardShortcuts', lang)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary min-h-11 min-w-11 inline-flex items-center justify-center"
          aria-label={t('close', lang)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* OPT-K105 — shell help control strip (Canon Shortcuts modal pattern). */}
      {variant === 'shell' && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-3"
          data-testid="shell-keyboard-help-controls"
        >
          <button
            type="button"
            onClick={toggleFocusStudy}
            aria-pressed={focusStudy}
            data-testid="shell-keyboard-help-focus-toggle"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 type-caption font-medium transition-colors',
              focusStudy
                ? 'border-text-primary bg-text-primary text-surface-primary'
                : 'border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            {t('wsFocusStudyHelpToggle', lang)}
            <kbd className="rounded border border-current/20 px-1 py-0.5 font-mono type-micro opacity-80">
              Alt+F
            </kbd>
          </button>
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1.5 type-caption font-semibold text-text-muted">
              {group}
            </p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item.id + item.keys}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 type-meta"
                >
                  <span className="text-text-secondary">
                    {lang === 'el' ? item.labelEl : item.labelEn}
                  </span>
                  <kbd className="shrink-0 rounded border border-border-subtle bg-surface-input px-1.5 py-0.5 font-mono type-caption text-text-muted">
                    {displayShortcutKeys(item.keys)}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border-subtle px-4 py-2 type-caption text-text-muted">
        {t('keyboardHelpFooter', lang)}
      </div>
    </FocusTrapDialog>
  );
}
