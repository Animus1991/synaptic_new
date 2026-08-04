/**
 * Honest status for propose / co-reading until multi-device sync exists (P1).
 */
import { AlertTriangle } from '@/lib/lucide-shim';
import { t, type Lang } from '../../lib/i18n';
import { isCollabReviewMultiDeviceSyncEnabled } from '../../lib/collabReviewSync';

type Props = {
  lang: Lang;
  /** Distinguish surfaces in tests / a11y. */
  surface: 'proposals' | 'coreading';
};

export function CollabDeviceLocalBanner({ lang, surface }: Props) {
  if (isCollabReviewMultiDeviceSyncEnabled()) return null;

  return (
    <div
      className="flex items-start gap-1.5 rounded-lg border border-accent-amber/35 bg-accent-amber/10 px-2 py-1.5"
      data-testid={`collab-device-local-banner-${surface}`}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="type-caption font-semibold text-text-primary">
          {t('collabDeviceLocalBadge', lang)}
        </p>
        <p className="type-caption text-text-secondary leading-snug">
          {t('collabDeviceLocalBanner', lang)}
        </p>
      </div>
    </div>
  );
}
