import { SignIn, SignOut } from '@phosphor-icons/react';
import type { UserSettings } from '../types';
import { googleAuthStartUrl } from '../lib/googleClient';
import { useI18n } from '../lib/i18n';
import { getSettingsContent } from '../lib/settingsContent';
import { cn } from '../utils/cn';

type Props = {
  settings: UserSettings;
  onPatchSettings: (partial: Partial<UserSettings>) => void;
  /** OPT-K10 — under Minimal, never compete with Start session as a second solid CTA. */
  quiet?: boolean;
};

export function HeaderAccountAuth({ settings, onPatchSettings, quiet = false }: Props) {
  const { lang } = useI18n();
  const c = getSettingsContent(lang);

  if (settings.authToken) {
    return (
      <button
        type="button"
        data-testid="header-sign-out"
        onClick={() =>
          onPatchSettings({
            authToken: undefined,
            authEmail: undefined,
            authPlan: undefined,
          })
        }
        className="hidden sm:inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-medium leading-none border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
        title={c.signOut}
      >
        <SignOut className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {quiet ? null : c.signOut}
        {quiet ? <span className="sr-only">{c.signOut}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="header-google-sign-in"
      onClick={() => {
        window.location.href = googleAuthStartUrl(
          settings,
          'signin',
          `${window.location.origin}/?view=settings`,
        );
      }}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold leading-none whitespace-nowrap transition-colors',
        quiet
          ? 'border border-border-subtle bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          : 'bg-brand-600 text-white hover:bg-brand-500',
      )}
      title={c.google}
    >
      <SignIn className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className={cn(quiet ? 'hidden xl:inline' : 'hidden sm:inline')}>{c.google}</span>
    </button>
  );
}
