import { FlaskConical, Upload, X, LogIn } from '@/lib/lucide-shim';
import { googleAuthStartUrl } from '../lib/googleClient';
import { useI18n } from '../lib/i18n';
import { shouldShowDemo } from '../lib/demoMode';
import { useAppStore } from '../store/useStore';
import { cn } from '../utils/cn';

/**
 * Compact status strip while demo sandbox content is active (B1 demo isolation).
 * Keeps exit / upload / sign-in reachable without a full-width marketing banner.
 */
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
      title={t('demoSandboxBannerHint')}
      className={cn(
        'sticky top-14 z-[19] border-b border-border-subtle/80',
        'bg-surface-secondary/70 backdrop-blur-sm px-3 py-1 sm:px-5',
      )}
    >
      <div className="flex items-center justify-between gap-3 w-full min-h-7">
        <div className="flex items-center gap-1.5 min-w-0">
          <FlaskConical className="w-3.5 h-3.5 text-text-tertiary shrink-0" aria-hidden />
          <p className="text-[11px] font-medium text-text-secondary truncate">
            {t('demoSandboxBannerTitle')}
          </p>
          <span className="hidden md:inline text-[11px] text-text-tertiary truncate">
            — {t('demoSandboxBannerHint')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <LogIn className="w-3 h-3" aria-hidden />
              <span className="hidden sm:inline">{t('demoSandboxGoogleSignIn')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            data-testid="demo-sandbox-upload"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Upload className="w-3 h-3" aria-hidden />
            <span className="hidden sm:inline">{t('demoSandboxUpload')}</span>
          </button>
          <button
            type="button"
            onClick={() => exitDemoSandbox()}
            data-testid="demo-sandbox-exit"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-3 h-3" aria-hidden />
            <span className="hidden sm:inline">{t('demoSandboxExit')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
