import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { AllCapsLabel } from './ui/AllCapsLabel';

/** “What the system watches” footer — shared by live + pipeline previews (Wave E13). */
export function DashboardLivePreviewWatches({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={cn('dashboard-live-preview-watches', className)} data-testid="dashboard-live-preview-watches">
      <p className="dashboard-live-preview-eyebrow"><AllCapsLabel>{t('dashboardPreviewWatchesEyebrow')}</AllCapsLabel></p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">{t('dashboardPreviewWatchesNotesTitle')}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{t('dashboardPreviewWatchesNotesBody')}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{t('dashboardPreviewWatchesBehaviorTitle')}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{t('dashboardPreviewWatchesBehaviorBody')}</p>
        </div>
      </div>
    </div>
  );
}
