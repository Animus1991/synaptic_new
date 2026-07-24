import { useI18n } from '../lib/i18n';

type Props = {
  onGoDashboard: () => void;
  onOpenSettings: () => void;
};

export function NavAccessDenied({ onGoDashboard, onOpenSettings }: Props) {
  const { t } = useI18n();
  return (
    <div
      className="max-w-lg mx-auto mt-16 p-6 rounded-2xl border border-border-subtle bg-surface-secondary/60 text-center space-y-4"
      data-testid="nav-access-denied"
    >
      <h2 className="text-lg font-medium text-text-primary">{t('navAccessDeniedTitle')}</h2>
      <p className="text-sm text-text-secondary">{t('navAccessDeniedBody')}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" onClick={onGoDashboard} className="px-4 py-2 ws-fab rounded-xl text-sm font-medium">
          {t('dashboard')}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-border-subtle hover:bg-surface-hover"
        >
          {t('settings')}
        </button>
      </div>
    </div>
  );
}
