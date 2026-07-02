import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from '@/lib/lucide-shim';
import { workspaceShortcutGroups, displayShortcutKeys } from '../../lib/workspaceKeyboardShortcuts';
import { t } from '../../lib/i18n';

type Props = {
  open: boolean;
  onClose: () => void;
  lang: 'en' | 'el';
};

/** Keyboard shortcut help overlay — `?` in Study Workspace (SW-P3-08). */
export function WorkspaceKeyboardHelp({ open, onClose, lang }: Props) {
  const groups = workspaceShortcutGroups(lang);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t('keyboardShortcuts', lang)}
          data-testid="workspace-keyboard-help"
        >
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-subtle bg-surface-secondary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-brand-800" />
                <h2 className="text-sm font-semibold text-text-primary">
                  {t('keyboardShortcuts', lang)}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                aria-label={t('close', lang)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {groups.map(({ group, items }) => (
                <div key={group}>
                  <p className="mb-1.5 text-[10px] font-semibold text-text-muted">
                    {group}
                  </p>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li
                        key={item.id + item.keys}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <span className="text-text-secondary">
                          {lang === 'el' ? item.labelEl : item.labelEn}
                        </span>
                        <kbd className="shrink-0 rounded border border-border-subtle bg-surface-input px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                          {displayShortcutKeys(item.keys)}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle px-4 py-2 text-[10px] text-text-muted">
              {t('keyboardHelpFooter', lang)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
