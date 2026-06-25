import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Brain, AlertTriangle, Target, Zap, RotateCcw, BookOpen, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n, type I18nKey } from '../../lib/i18n';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import type { ToolActivityCount } from '../../lib/conceptBusPanelModel';
import type { ConceptRemediationId } from '../../lib/conceptBusRemediation';
import type { DashboardWeakSpot } from '../../lib/dashboardWeakSpotsModel';

interface WeakSpot { concept: string; mastery: number; course: string }
interface NextAction { label: string; type: string; minutes: number; xp: number; taskId?: string }

interface Props {
  readiness: number;
  streak: number;
  reviewsDue: number;
  studyTimeToday?: number;
  studyTimeWeek?: number;
  recentStudyDays?: number[];
  weakSpots: WeakSpot[];
  /** Enriched weak spots with reasons + remediation — preferred when present. */
  weakSpotsDetail?: DashboardWeakSpot[];
  nextActions: NextAction[];
  conceptsMastered: number;
  totalConcepts: number;
  onStartTask?: (taskId: string) => void;
  onFocusWeakSpot?: (concept: string) => void;
  onRemediateWeakSpot?: (concept: string, action: ConceptRemediationId) => void;
  toolActivity?: ToolActivityCount[];
  onOpenToolActivity?: (tool: WorkspaceToolId) => void;
  embedded?: boolean;
}

const BAND = (v: number, t: (k: I18nKey) => string) =>
  v >= 80 ? { label: t('strong'), color: '#34d399' }
  : v >= 60 ? { label: t('proficient'), color: '#fbbf24' }
  : v >= 40 ? { label: t('developing'), color: '#38bdf8' }
  : { label: t('weakLabel'), color: '#fb7185' };

export function MiniDashboard({
  readiness,
  streak,
  reviewsDue,
  studyTimeToday = 0,
  studyTimeWeek = 0,
  recentStudyDays = [],
  weakSpots,
  weakSpotsDetail,
  nextActions,
  conceptsMastered,
  totalConcepts,
  onStartTask,
  onFocusWeakSpot,
  onRemediateWeakSpot,
  toolActivity = [],
  onOpenToolActivity,
  embedded = false,
}: Props) {
  const { t, lang } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'weak' | 'next'>('overview');
  const band = BAND(readiness, t);
  const weakList = weakSpotsDetail ?? weakSpots;

  // Readiness ring mini
  const size = 68, sw = 6, r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (readiness / 100) * c;

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-card shadow-xl overflow-hidden',
        embedded ? 'w-full max-w-lg' : undefined,
      )}
      style={embedded ? undefined : { width: collapsed ? 56 : 280 }}
      data-testid={embedded ? 'mini-dashboard-embedded' : 'mini-dashboard'}
    >
      {/* Header */}
      {!embedded && (
      <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-surface-secondary/40 cursor-pointer', collapsed && 'justify-center')}
        onClick={() => setCollapsed(!collapsed)}>
        {!collapsed && <span className="text-[10px] font-semibold text-text-secondary flex-1">📊 {t('quickView')}</span>}
        {collapsed
          ? <ChevronUp className="w-3.5 h-3.5 text-text-muted rotate-90" />
          : <ChevronDown className="w-3.5 h-3.5 text-text-muted rotate-90" />
        }
      </div>
      )}

      <AnimatePresence>
        {(!collapsed || embedded) && (
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

                <div className="grid grid-cols-2 gap-1.5">
                  <StatPill icon={<Clock className="w-3 h-3 text-accent-emerald" />} label={t('studyToday')} value={`${studyTimeToday}m`} />
                  <StatPill icon={<Clock className="w-3 h-3 text-accent-cyan" />} label={t('studyThisWeek')} value={`${studyTimeWeek}m`} />
                </div>

                {recentStudyDays.length > 0 && (
                  <div className="rounded-lg border border-border-subtle bg-surface-primary/40 p-2">
                    <p className="text-[8px] text-text-muted mb-1.5">{t('studyThisWeek')}</p>
                    <div className="flex items-end gap-1 h-8">
                      {recentStudyDays.map((mins, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div
                            className="w-full rounded-t bg-brand-500/70"
                            style={{ height: `${Math.max(8, Math.min(100, mins * 2))}%` }}
                            title={`${mins}m`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {toolActivity.length > 0 && (
                  <div
                    className="rounded-lg border border-border-subtle bg-surface-primary/40 p-2"
                    data-testid="progress-tool-activity"
                  >
                    <p className="text-[8px] text-text-muted mb-1.5">
                      {lang === 'el' ? 'Εργαλεία συνεδρίας' : 'Session tools'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {toolActivity.slice(0, 8).map(({ tool, count }) => {
                        const chip = (
                          <>
                            {workspaceToolLabel(tool as WorkspaceToolId, lang)}
                            <span className="text-text-muted">×{count}</span>
                          </>
                        );
                        if (onOpenToolActivity) {
                          return (
                            <button
                              key={tool}
                              type="button"
                              onClick={() => onOpenToolActivity(tool as WorkspaceToolId)}
                              className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-surface-card/60 px-1.5 py-0.5 text-[8px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
                              data-testid={`progress-tool-${tool}`}
                            >
                              {chip}
                            </button>
                          );
                        }
                        return (
                          <span
                            key={tool}
                            className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-surface-card/60 px-1.5 py-0.5 text-[8px] text-text-secondary"
                            data-testid={`progress-tool-${tool}`}
                          >
                            {chip}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Weak spots tab */}
            {activeTab === 'weak' && (
              <div className="p-3 space-y-2 max-h-56 overflow-y-auto" data-testid="mini-dashboard-weak-tab">
                {weakList.length === 0 ? (
                  <p className="text-[10px] text-text-muted text-center py-4">{t('noWeakSpots')}</p>
                ) : weakList.map((w) => {
                  const detail = 'reasons' in w ? w as DashboardWeakSpot : undefined;
                  const concept = w.concept;
                  return (
                    <div
                      key={concept}
                      className="rounded-lg border border-white/8 bg-surface-primary/40 p-2"
                      data-testid={`mini-weak-spot-${concept.slice(0, 12).replace(/\s+/g, '-')}`}
                    >
                      <button
                        type="button"
                        disabled={!onFocusWeakSpot}
                        onClick={() => onFocusWeakSpot?.(concept)}
                        className="flex w-full items-center gap-2 text-left hover:opacity-90 transition-opacity disabled:cursor-default"
                      >
                        <AlertTriangle className="w-3 h-3 text-accent-rose shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{concept}</p>
                          <p className="text-[8px] text-text-muted">{w.course}</p>
                        </div>
                        <p className="text-[9px] text-text-muted shrink-0">{w.mastery}%</p>
                      </button>
                      {detail && detail.reasons.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {detail.reasons.map((reason) => (
                            <span
                              key={reason.id}
                              className={cn(
                                'rounded-full border px-1.5 py-0.5 text-[8px]',
                                reason.severity === 'high'
                                  ? 'border-accent-rose/35 bg-accent-rose/12 text-accent-rose'
                                  : reason.severity === 'medium'
                                    ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
                                    : 'border-white/10 text-text-muted',
                              )}
                            >
                              {reason.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {detail && detail.remediation.length > 0 && onRemediateWeakSpot && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {detail.remediation.slice(0, 3).map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              title={action.hint}
                              onClick={() => onRemediateWeakSpot(concept, action.id)}
                              className="rounded-full border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 text-[8px] font-medium text-brand-300 hover:bg-brand-500/20"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center py-1.5 rounded-lg bg-surface-primary/50">
      {icon}
      <span className="text-[10px] font-bold mt-0.5">{value}</span>
      <span className="text-[7px] text-text-muted">{label}</span>
    </div>
  );
}
