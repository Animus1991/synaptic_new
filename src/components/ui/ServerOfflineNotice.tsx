import { useEffect, useState } from 'react';
import type { UserSettings } from '../../types';
import { useI18n } from '../../lib/i18n';
import { checkStudyRoomApi } from '../../lib/studyRoomClient';

type Props = {
  /** Used by the /health probe to resolve the proxy origin. */
  settings?: UserSettings;
  /**
   * When false, the caller already knows the server is unreachable and the
   * notice renders unconditionally (e.g. Study Room's own health check).
   */
  probe?: boolean;
  className?: string;
};

/**
 * Phase-0 unified "server offline" notice. Every surface that silently
 * degrades without the Synapse server (auth, sync, cross-device rooms)
 * shows the same explanation plus the setup command in dev builds.
 */
export function ServerOfflineNotice({ settings, probe = true, className = '' }: Props) {
  const { t } = useI18n();
  const [offline, setOffline] = useState(!probe);

  useEffect(() => {
    if (!probe) return;
    let cancelled = false;
    void checkStudyRoomApi(settings).then((status) => {
      if (!cancelled) setOffline(!status.ok);
    });
    return () => {
      cancelled = true;
    };
  }, [probe, settings]);

  if (!offline) return null;

  return (
    <div
      className={`rounded-lg border-0 bg-accent-amber/10 px-3 py-2.5 ${className}`}
      role="status"
      data-testid="server-offline-notice"
    >
      <p className="type-caption font-semibold text-text-secondary">{t('serverOfflineTitle')}</p>
      <p className="mt-1 type-caption leading-relaxed text-text-muted">
        {import.meta.env.DEV ? t('serverOfflineBody') : t('serverOfflineBodyProd')}
      </p>
      {import.meta.env.DEV && (
        <code className="mt-1.5 inline-block rounded-md bg-surface-secondary/70 px-2 py-1 type-caption text-text-secondary">
          npm run dev:full
        </code>
      )}
    </div>
  );
}
