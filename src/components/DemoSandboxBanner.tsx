import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Upload, X, LogIn } from '@/lib/lucide-shim';
import { DotsThree } from '@phosphor-icons/react';
import { googleAuthStartUrl } from '../lib/googleClient';
import { useI18n } from '../lib/i18n';
import { shouldShowDemo } from '../lib/demoMode';
import { useAppStore } from '../store/useStore';
import { cn } from '../utils/cn';
import { useMinimalTheme } from '../lib/useMinimalTheme';

/**
 * Compact status strip while demo sandbox content is active (B1 demo isolation).
 * OPT-K10 — under Minimal: quieter strip; secondary actions in overflow; Exit stays one-click.
 */
export function DemoSandboxBanner() {
  const { t } = useI18n();
  const quiet = useMinimalTheme();
  const { user, exitDemoSandbox, setShowUploadModal } = useAppStore();
  const active = shouldShowDemo(user.settings);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  if (!active) return null;

  const googleSignIn = () => {
    window.location.href = googleAuthStartUrl(
      user.settings,
      'signin',
      `${window.location.origin}/?view=settings`,
    );
  };

  return (
    <div
      data-testid="demo-sandbox-banner"
      data-quiet-demo={quiet ? 'true' : undefined}
      role="status"
      aria-live="polite"
      title={t('demoSandboxBannerHint')}
      className={cn(
        'sticky top-14 z-[19] border-b border-border-subtle/80',
        quiet
          ? 'bg-surface-primary px-3 py-0.5 sm:px-5'
          : 'bg-surface-secondary/70 backdrop-blur-sm px-3 py-1 sm:px-5',
      )}
    >
      <div className="flex items-center justify-between gap-3 w-full min-h-7">
        <div className="flex items-center gap-1.5 min-w-0">
          <FlaskConical className="w-3.5 h-3.5 text-text-tertiary shrink-0" aria-hidden />
          <p className="text-[11px] font-medium text-text-secondary truncate">
            {t('demoSandboxBannerTitle')}
          </p>
          {!quiet && (
            <span className="hidden md:inline text-[11px] text-text-tertiary truncate">
              — {t('demoSandboxBannerHint')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {quiet ? (
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                data-testid="demo-sandbox-more"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label={t('demoSandboxMoreActions')}
                onClick={() => setMoreOpen((v) => !v)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <DotsThree className="w-3.5 h-3.5" weight="bold" aria-hidden />
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  data-testid="demo-sandbox-overflow"
                  className="ux-elev-popover absolute right-0 top-full z-50 mt-1 min-w-[11.5rem] overflow-hidden rounded-lg border border-border-subtle bg-surface-card py-1 shadow-lg"
                >
                  {!user.settings.authToken && (
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="demo-sandbox-google-sign-in"
                      onClick={() => {
                        setMoreOpen(false);
                        googleSignIn();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-text-primary hover:bg-surface-hover"
                    >
                      <LogIn className="w-3.5 h-3.5 text-text-tertiary" aria-hidden />
                      {t('demoSandboxGoogleSignIn')}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="demo-sandbox-upload"
                    onClick={() => {
                      setMoreOpen(false);
                      setShowUploadModal(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-text-primary hover:bg-surface-hover"
                  >
                    <Upload className="w-3.5 h-3.5 text-text-tertiary" aria-hidden />
                    {t('demoSandboxUpload')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {!user.settings.authToken && (
                <button
                  type="button"
                  data-testid="demo-sandbox-google-sign-in"
                  onClick={googleSignIn}
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
            </>
          )}
          <button
            type="button"
            onClick={() => exitDemoSandbox()}
            data-testid="demo-sandbox-exit"
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors',
              quiet
                ? 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
            )}
          >
            <X className="w-3 h-3" aria-hidden />
            <span className="hidden sm:inline">{t('demoSandboxExit')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
