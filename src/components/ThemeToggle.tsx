import { Moon, Sun, Sparkles, Layers } from '@/lib/lucide-shim';
import { useEffect, useState } from 'react';
import {
  applyTheme,
  cycleTheme,
  loadThemePreference,
  resolveTheme,
  themeToggleTarget,
  type ResolvedTheme,
} from '../lib/theme';
import type { UserSettings } from '../types';
import type { I18nKey } from '../lib/i18n';

interface Props {
  preference?: UserSettings['theme'];
  onChange?: (theme: UserSettings['theme']) => void;
  /** When set, delegates cycling to the store (e.g. Shell / workspace header). */
  onToggle?: () => void;
  className?: string;
  /** Optional i18n lookup for aria/title labels */
  t?: (key: I18nKey) => string;
  'data-testid'?: string;
}

const TARGET_LABEL: Record<ResolvedTheme, I18nKey> = {
  dark: 'switchDark',
  light: 'switchLight',
  spectrum: 'switchSpectrum',
  blueprint: 'switchBlueprint',
};

function ThemeIcon({ target }: { target: ResolvedTheme }) {
  if (target === 'light') return <Sun className="w-5 h-5 text-text-secondary" />;
  if (target === 'spectrum') return <Sparkles className="w-5 h-5 text-text-secondary" />;
  if (target === 'blueprint') return <Layers className="w-5 h-5 text-text-secondary" />;
  return <Moon className="w-5 h-5 text-text-secondary" />;
}

export function ThemeToggle({ preference, onChange, onToggle, className, t, 'data-testid': testId }: Props) {
  const pref = preference ?? loadThemePreference();
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(pref));

  useEffect(() => {
    setResolved(resolveTheme(preference ?? loadThemePreference()));
  }, [preference]);

  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    const next = cycleTheme(pref);
    applyTheme(next);
    setResolved(resolveTheme(next));
    onChange?.(next);
  };

  const target = themeToggleTarget(resolved);
  const title = t?.(TARGET_LABEL[target]) ?? `Switch to ${target} mode`;

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? 'p-2 rounded-lg hover:bg-surface-hover transition-colors'}
      title={title}
      aria-label={title}
      data-testid={testId}
    >
      <ThemeIcon target={target} />
    </button>
  );
}
