import { useEffect, useState } from 'react';
import { X } from '@/lib/lucide-shim';

import { cn } from '../utils/cn';
import {
  dismissNotification,
  subscribeNotifications,
  type AppNotification,
} from '../lib/notificationBus';

const LEVEL_STYLES: Record<AppNotification['level'], string> = {
  info: 'border-brand-500/30 bg-surface-secondary/95',
  success: 'border-accent-emerald/35 bg-surface-secondary/95',
  warning: 'border-accent-amber/35 bg-surface-secondary/95',
  error: 'border-red-500/40 bg-surface-secondary/95',
};

/** Ephemeral toast stack — L12 notification bus (aria-live for a11y). */
export function NotificationToastStack() {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => subscribeNotifications(setItems), []);

  const polite = items.filter((n) => !n.assertive).map((n) => n.title).join('. ');
  const assertive = items.filter((n) => n.assertive).map((n) => n.title).join('. ');

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="notification-aria-polite">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="notification-aria-assertive">
        {assertive}
      </div>
      <div
        className="fixed bottom-20 lg:bottom-6 right-4 z-[190] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
        data-testid="notification-toast-stack"
      >
        {items.map((n) => (
          <div
            key={n.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-xl border backdrop-blur px-3 py-2.5 shadow-lg',
              LEVEL_STYLES[n.level],
            )}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                {n.body && <p className="text-xs text-text-secondary mt-0.5">{n.body}</p>}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissNotification(n.id)}
                className="p-0.5 rounded hover:bg-surface-hover shrink-0"
              >
                <X className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
