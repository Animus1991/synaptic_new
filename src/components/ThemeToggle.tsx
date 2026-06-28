import { Moon, Sun } from '@/lib/lucide-shim';
import { useEffect, useState } from 'react';
import { applyTheme, loadThemePreference, resolveTheme } from '../lib/theme';
import type { UserSettings } from '../types';

interface Props {
  preference?: UserSettings['theme'];
  onChange?: (theme: UserSettings['theme']) => void;
  className?: string;
}

export function ThemeToggle({ preference, onChange, className }: Props) {
  const [resolved, setResolved] = useState<'dark' | 'light' | 'spectrum'>(() =>
    resolveTheme(preference ?? loadThemePreference()),
  );

  useEffect(() => {
    if (preference) setResolved(resolveTheme(preference));
  }, [preference]);

  const toggle = () => {
    const next: UserSettings['theme'] = resolved === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setResolved(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? 'p-2 rounded-lg hover:bg-surface-hover transition-colors'}
      title={resolved === 'light' ? 'Switch to dark mode' : resolved === 'spectrum' ? 'Switch to light mode' : 'Switch to light mode'}
    >
      {resolved === 'light' ? (
        <Moon className="w-5 h-5 text-text-secondary" />
      ) : (
        <Sun className="w-5 h-5 text-text-secondary" />
      )}
    </button>
  );
}
