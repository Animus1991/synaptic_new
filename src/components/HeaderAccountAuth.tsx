import { SignIn, SignOut } from '@phosphor-icons/react';
import type { UserSettings } from '../types';
import { googleAuthStartUrl } from '../lib/googleClient';
import { useI18n } from '../lib/i18n';
import { getSettingsContent } from '../lib/settingsContent';

type Props = {
  settings: UserSettings;
  onPatchSettings: (partial: Partial<UserSettings>) => void;
};

export function HeaderAccountAuth({ settings, onPatchSettings }: Props) {
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
        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
        title={c.signOut}
      >
        <SignOut className="w-3.5 h-3.5" aria-hidden />
        {c.signOut}
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
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 transition-colors"
      title={c.google}
    >
      <SignIn className="w-3.5 h-3.5" aria-hidden />
      <span className="hidden sm:inline">{c.google}</span>
    </button>
  );
}
