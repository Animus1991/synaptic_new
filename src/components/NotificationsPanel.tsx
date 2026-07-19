import { useEffect, useRef } from 'react';
import { X, Zap, ArrowRight, AlertTriangle } from '@/lib/lucide-shim';
import type { ActivityItem, AppView } from '../types';
import type { ProactiveAgentAlert } from '../lib/proactiveAgentAlerts';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { formatDateTime } from '../lib/localeFormat';
import { activityDeepLink, isActivityUnread } from '../lib/notificationState';

interface Props {
  open: boolean;
  onClose: () => void;
  activities: ActivityItem[];
  lastSeenAt?: string;
  onMarkAllRead: () => void;
  onNavigate: (view: AppView) => void;
  onOpenTasks?: (filter?: 'review' | 'exam') => void;
  /** OPT-M17 — live app toast surfaced in inbox */
  appToastMessage?: string | null;
  onDismissAppToast?: () => void;
  /** OPT-M17 — proactive study alerts (same actions as Dashboard strip) */
  proactiveAlerts?: ProactiveAgentAlert[];
  onRunProactiveAlert?: (alert: ProactiveAgentAlert) => void;
}

export function NotificationsPanel({
  open,
  onClose,
  activities,
  lastSeenAt,
  onMarkAllRead,
  onNavigate,
  onOpenTasks,
  appToastMessage = null,
  onDismissAppToast,
  proactiveAlerts = [],
  onRunProactiveAlert,
}: Props) {
  const { t, lang } = useI18n();
  const unreadBaseline = useRef<string | undefined>(lastSeenAt);

  useEffect(() => {
    if (!open) return;
    unreadBaseline.current = lastSeenAt;
    onMarkAllRead();
  }, [open, onMarkAllRead, lastSeenAt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const recent = activities.slice(0, 8);
  const hasStatus = Boolean(appToastMessage) || proactiveAlerts.length > 0;

  const handleDeepLink = (type: ActivityItem['type']) => {
    const link = activityDeepLink(type);
    if (!link) return;
    if (link.view === 'tasks') {
      onOpenTasks?.(type === 'review_done' ? 'review' : undefined);
    }
    onNavigate(link.view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose} data-testid="notifications-panel">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('notifications')}
        className="ux-elev-popover absolute right-4 top-16 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border-subtle bg-surface-secondary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-sm font-semibold">{t('notifications')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1 rounded-lg hover:bg-surface-hover"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {hasStatus && (
            <div
              className="border-b border-border-subtle bg-surface-card/40"
              data-testid="app-inbox-status"
            >
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {t('appInboxStatus')}
              </p>

              {appToastMessage && (
                <div
                  className="px-4 py-2.5 border-b border-border-subtle/50"
                  data-testid="app-inbox-toast"
                >
                  <div className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary leading-relaxed">
                        {appToastMessage}
                      </p>
                      {onDismissAppToast && (
                        <button
                          type="button"
                          data-testid="app-inbox-toast-dismiss"
                          onClick={onDismissAppToast}
                          className="mt-1.5 text-[10px] font-medium text-text-muted hover:text-text-secondary"
                        >
                          {t('dismiss')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {proactiveAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  data-testid={`app-inbox-alert-${alert.id}`}
                  onClick={() => {
                    onRunProactiveAlert?.(alert);
                    onClose();
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 border-b border-border-subtle/50 text-left hover:bg-surface-hover/50',
                    alert.severity === 'urgent' && 'bg-accent-rose/5',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        'w-3.5 h-3.5 shrink-0 mt-0.5',
                        alert.severity === 'urgent' ? 'text-accent-rose' : 'text-accent-amber',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary leading-relaxed">
                        {alert.title}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">
                        {alert.message}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-brand-400">
                        {t('appInboxAct')}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div data-testid="app-inbox-activity">
            {hasStatus && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {t('appInboxActivity')}
              </p>
            )}
            {recent.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">{t('noActivity')}</p>
            ) : (
              recent.map((a) => {
                const unread = isActivityUnread(a, unreadBaseline.current);
                const deepLink = activityDeepLink(a.type);
                return (
                  <div
                    key={a.id}
                    data-testid={`notification-item-${a.id}`}
                    className={cn(
                      'px-4 py-3 border-b border-border-subtle/50 hover:bg-surface-hover/50',
                      unread && 'bg-brand-500/5',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Zap className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', a.xp ? 'text-accent-amber' : 'text-brand-400')} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs font-medium leading-relaxed', unread && 'text-text-primary')}>
                          {a.description}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {formatDateTime(a.timestamp, lang)}
                          {a.xp ? ` · +${a.xp} XP` : ''}
                        </p>
                        {deepLink && (
                          <button
                            type="button"
                            data-testid={`notification-deep-link-${a.id}`}
                            onClick={() => handleDeepLink(a.type)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-brand-400 hover:text-brand-300"
                          >
                            {t('notificationViewTarget')}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
