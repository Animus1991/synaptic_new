import { X, Zap } from 'lucide-react';
import type { ActivityItem } from '../types';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  activities: ActivityItem[];
}

export function NotificationsPanel({ open, onClose, activities }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  const recent = activities.slice(0, 8);

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute right-4 top-16 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border-subtle bg-surface-secondary shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-sm font-semibold">{t('notifications')}</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">{t('noActivity')}</p>
          ) : recent.map((a) => (
            <div key={a.id} className="px-4 py-3 border-b border-border-subtle/50 hover:bg-surface-hover/50">
              <div className="flex items-start gap-2">
                <Zap className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', a.xp ? 'text-accent-amber' : 'text-brand-400')} />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-relaxed">{a.description}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {new Date(a.timestamp).toLocaleString()}
                    {a.xp ? ` · +${a.xp} XP` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
