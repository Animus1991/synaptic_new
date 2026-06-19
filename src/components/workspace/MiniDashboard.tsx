import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Brain, AlertTriangle, Target, Zap, RotateCcw, BookOpen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n, type I18nKey } from '../../lib/i18n';

interface WeakSpot { concept: string; mastery: number; course: string }
interface NextAction { label: string; type: string; minutes: number; xp: number; taskId?: string }

interface Props {
  readiness: number;
  streak: number;
  reviewsDue: number;
  weakSpots: WeakSpot[];
  nextActions: NextAction[];
  conceptsMastered: number;
  totalConcepts: number;
  onStartTask?: (taskId: string) => void;
}

const BAND = (v: number, t: (k: I18nKey) => string) =>
  v >= 80 ? { label: t('strong'), color: '#34d399' }
  : v >= 60 ? { label: t('proficient'), color: '#fbbf24' }
  : v >= 40 ? { label: t('developing'), color: '#38bdf8' }
  : { label: t('weakLabel'), color: '#fb7185' };

export function MiniDashboard({ readiness, streak, reviewsDue, weakSpots, nextActions, conceptsMastered, totalConcepts, onStartTask }: Props) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'weak' | 'next'>('overview');
  const band = BAND(readiness, t);

  // Readiness ring mini
  const size = 68, sw = 6, r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (readiness / 100) * c;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-border-subtle bg-surface-card shadow-xl overflow-hidden"
      style={{ width: collapsed ? 56 : 280 }}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-surface-secondary/40 cursor-pointer', collapsed && 'justify-center')}
        onClick={() => setCollapsed(!collapsed)}>
        {!collapsed && <span className="text-[10px] font-semibold text-text-secondary flex-1">📊 {t('quickView')}</span>}
        {collapsed
          ? <ChevronUp className="w-3.5 h-3.5 text-text-muted rotate-90" />
          : <ChevronDown className="w-3.5 h-3.5 text-text-muted rotate-90" />
        }
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Tabs */}
            <div className="flex border-b border-border-subtle">
              {(['overview', 'weak', 'next'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={cn('flex-1 py-1.5 text-[9px] font-medium capitalize transition-all',
                    activeTab === tab ? 'text-brand-300 border-b border-brand-400' : 'text-text-muted hover:text-text-secondary')}>
                  {tab === 'overview' ? `🎯 ${t('status')}` : tab === 'weak' ? `⚠ ${t('weak')}` : `▶ ${t('nextActions')}`}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="p-3 space-y-3">
                {/* Mini readiness ring */}
                <div className="flex items-center gap-3">
                  <svg width={size} height={size} className="-rotate-90 shrink-0">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1740" strokeWidth={sw} />
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                      stroke={band.color} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={offset}
                      strokeLinecap="round" className="transition-all duration-700" />
                    <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                      className="rotate-90 origin-center" fill={band.color} fontSize={16} fontWeight="800">{readiness}%</text>
                  </svg>
                  <div>
                    <p className="text-xs font-semibold">{band.label}</p>
                    <p className="text-[9px] text-text-muted">{t('examReadiness')}</p>
                    <p className="text-[9px] text-text-muted mt-1">{conceptsMastered}/{totalConcepts} {t('concepts')}</p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-1.5">
                  <StatPill icon={<Zap className="w-3 h-3 text-accent-amber" />} label={t('streak')} value={`${streak}d`} />
                  <StatPill icon={<RotateCcw className="w-3 h-3 text-accent-teal" />} label={t('due')} value={`${reviewsDue}`} />
                  <StatPill icon={<Brain className="w-3 h-3 text-brand-400" />} label={t('weak')} value={`${weakSpots.length}`} />
                </div>
              </div>
            )}

            {/* Weak spots tab */}
            {activeTab === 'weak' && (
              <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {weakSpots.length === 0 ? (
                  <p className="text-[10px] text-text-muted text-center py-4">{t('noWeakSpots')}</p>
                ) : weakSpots.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-accent-rose shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{w.concept}</p>
                      <p className="text-[8px] text-text-muted">{w.course}</p>
                    </div>
                    <div className="w-12">
                      <div className="w-full bg-surface-hover rounded-full h-1">
                        <div className="h-1 rounded-full bg-accent-rose" style={{ width: `${Math.max(w.mastery, 4)}%` }} />
                      </div>
                      <p className="text-[8px] text-text-muted text-right mt-0.5">{w.mastery}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Next actions tab */}
            {activeTab === 'next' && (
              <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {nextActions.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!a.taskId || !onStartTask}
                    onClick={() => a.taskId && onStartTask?.(a.taskId)}
                    className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-hover/50 cursor-pointer transition-colors text-left disabled:cursor-default disabled:opacity-80"
                  >
                    <div className="w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center shrink-0">
                      {a.type === 'review' ? <RotateCcw className="w-3 h-3 text-accent-amber" />
                        : a.type === 'practice' ? <Target className="w-3 h-3 text-accent-teal" />
                        : <BookOpen className="w-3 h-3 text-brand-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{a.label}</p>
                      <p className="text-[8px] text-text-muted">{a.minutes}m • +{a.xp} XP</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center py-1.5 rounded-lg bg-surface-primary/50">
      {icon}
      <span className="text-[10px] font-bold mt-0.5">{value}</span>
      <span className="text-[7px] text-text-muted">{label}</span>
    </div>
  );
}
