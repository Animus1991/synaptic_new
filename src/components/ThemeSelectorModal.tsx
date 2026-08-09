import { useEffect, useRef, useState } from 'react';
import {
  Moon, Sun, Sparkles, Layers, Minus, Square, Monitor, X, Eye,
} from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import {
  applyTheme,
  previewTheme,
  restoreThemePreference,
  resolveTheme,
  type ResolvedTheme,
} from '../lib/theme';
import { useI18n, type I18nKey } from '../lib/i18n';
import { PrimaryCTA, SecondaryCTA } from './ui/primitives';
import { ModalHeaderStack } from './ui/ModalHeaderStack';
import { FocusTrapDialog } from './ui/FocusTrapDialog';
import { cn } from '../utils/cn';

type ThemeValue = UserSettings['theme'];

const THEME_OPTIONS: { value: ThemeValue; icon: typeof Moon; labelKey: I18nKey }[] = [
  { value: 'minimal', icon: Minus, labelKey: 'themeOptionMinimal' },
  { value: 'minimal-dark', icon: Square, labelKey: 'themeOptionMinimalDark' },
  { value: 'light', icon: Sun, labelKey: 'themeOptionLight' },
  { value: 'dark', icon: Moon, labelKey: 'themeOptionDark' },
  { value: 'spectrum', icon: Sparkles, labelKey: 'themeOptionSpectrum' },
  { value: 'blueprint', icon: Layers, labelKey: 'themeOptionBlueprint' },
  { value: 'system', icon: Monitor, labelKey: 'themeOptionSystem' },
];

interface ThemeSelectorModalProps {
  open: boolean;
  onClose: () => void;
  /** Persisted preference (settings / store). */
  preference: ThemeValue;
  /** Persist + notify parent (Settings / store). */
  onCommit: (theme: ThemeValue) => void;
}

/**
 * Theme picker with optional Preview Mode — applies DOM theme without persisting
 * until the user commits. Closing while previewing restores the saved preference.
 */
export function ThemeSelectorModal({
  open,
  onClose,
  preference,
  onCommit,
}: ThemeSelectorModalProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ThemeValue>(preference);
  const [previewMode, setPreviewMode] = useState(false);
  const previewingRef = useRef(false);
  const savedRef = useRef(preference);

  useEffect(() => {
    if (!open) return;
    setSelected(preference);
    setPreviewMode(false);
    previewingRef.current = false;
    savedRef.current = preference;
  }, [open, preference]);

  const applyPreview = (next: ThemeValue) => {
    previewTheme(next);
    previewingRef.current = true;
  };

  const handleSelect = (next: ThemeValue) => {
    setSelected(next);
    if (previewMode) applyPreview(next);
  };

  const togglePreviewMode = () => {
    const next = !previewMode;
    setPreviewMode(next);
    if (next) {
      applyPreview(selected);
    } else if (previewingRef.current) {
      restoreThemePreference(savedRef.current);
      previewingRef.current = false;
    }
  };

  const handleClose = () => {
    if (previewingRef.current) {
      restoreThemePreference(savedRef.current);
      previewingRef.current = false;
    }
    setPreviewMode(false);
    onClose();
  };

  const handleCommit = () => {
    applyTheme(selected);
    previewingRef.current = false;
    setPreviewMode(false);
    onCommit(selected);
    onClose();
  };

  const resolvedPreview: ResolvedTheme = resolveTheme(selected);

  return (
    <FocusTrapDialog
      open={open}
      onClose={handleClose}
      title={t('themeSelectorTitle')}
      hideHeader
      size="md"
      zIndex={200}
      align="bottom-mobile"
      data-testid="theme-selector-modal"
      bodyClassName="p-4"
      panelClassName="max-w-md rounded-[var(--radius-panel)]"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <ModalHeaderStack
          eyebrow={t('themeSelectorEyebrow')}
          title={t('themeSelectorTitle')}
          titleId="theme-selector-title"
        />
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 p-1.5 rounded-lg text-text-tertiary hover:bg-surface-hover hover:text-text-primary min-h-11 min-w-11 inline-flex items-center justify-center"
          aria-label={t('close')}
          data-testid="theme-selector-close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="type-caption text-text-secondary mb-3">
        {previewMode ? t('themePreviewActiveHint') : t('themeSelectorHint')}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4" data-testid="theme-selector-options">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              aria-pressed={active}
              data-testid={`theme-selector-option-${opt.value}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 type-caption font-medium transition-colors',
                active
                  ? 'ux-theme-chip-active'
                  : 'border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-brand-500/25',
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      <p className="type-micro text-text-muted mb-3" data-testid="theme-selector-resolved">
        {t('themePreviewResolved').replace('{theme}', resolvedPreview)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <SecondaryCTA
          type="button"
          onClick={togglePreviewMode}
          data-testid="theme-selector-preview"
          aria-pressed={previewMode}
          className={cn(previewMode && 'border-brand-500/40 text-text-primary')}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden />
          {previewMode ? t('themePreviewModeOn') : t('themePreviewMode')}
        </SecondaryCTA>
        <PrimaryCTA
          type="button"
          onClick={handleCommit}
          data-testid="theme-selector-apply"
          className="ml-auto"
        >
          {t('themePreviewApply')}
        </PrimaryCTA>
      </div>
    </FocusTrapDialog>
  );
}
