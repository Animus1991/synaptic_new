import { FlaskConical, Upload, X, LogIn } from '@/lib/lucide-shim';
import { googleAuthStartUrl } from '../lib/googleClient';
import { useI18n } from '../lib/i18n';
import { shouldShowDemo } from '../lib/demoMode';
import { useAppStore } from '../store/useStore';
import { cn } from '../utils/cn';

/** Sticky banner while demo sandbox content is active (B1 demo isolation). */
export function DemoSandboxBanner() {
  const { t } = useI18n();
  const { user, exitDemoSandbox, setShowUploadModal } = useAppStore();
  const active = shouldShowDemo(user.settings);

  if (!active) return null;

  return (
    <div
      data-testid="demo-sandbox-banner"
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-14 z-[19] border-b border-brand-500/35',
        'bg-brand-100/90 dark:bg-brand-950/40 backdrop-blur px-4 py-2.5 sm:px-6',
      )}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full max-w-none">
        <div className="flex items-start gap-2.5 min-w-0">
          <FlaskConical className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{t('demoSandboxBannerTitle')}</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('demoSandboxBannerHint')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!user.settings.authToken && (
            <button
              type="button"
              data-testid="demo-sandbox-google-sign-in"
              onClick={() => {
                window.location.href = googleAuthStartUrl(
                  user.settings,
                  'signin',
                  `${window.location.origin}/?view=settings`,
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-700 text-white hover:bg-brand-600 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden />
              {t('demoSandboxGoogleSignIn')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            data-testid="demo-sandbox-upload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle bg-surface-primary/80 hover:border-brand-500/40 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden />
            {t('demoSandboxUpload')}
          </button>
          <button
            type="button"
            onClick={() => exitDemoSandbox()}
            data-testid="demo-sandbox-exit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-700 text-white hover:bg-brand-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            {t('demoSandboxExit')}
          </button>
        </div>
      </div>
    </div>
  );
}
