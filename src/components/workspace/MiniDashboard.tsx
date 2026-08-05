import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition } from '../../lib/motion';
import { ChevronUp, ChevronDown, Brain, AlertTriangle, Target, Zap, RotateCcw, BookOpen, Clock, BarChart3, Play } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n, type I18nKey } from '../../lib/i18n';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import type { ToolActivityCount } from '../../lib/conceptBusPanelModel';
import { formatToolTimeMinutes } from '../../lib/toolTimeTracker';
import type { ConceptRemediationId } from '../../lib/conceptBusRemediation';
import type { DashboardWeakSpot } from '../../lib/dashboardWeakSpotsModel';
import { OverflowChipRow } from '../ui/OverflowChipRow';

interface WeakSpot { concept: string; mastery: number; course: string }
interface NextAction { label: string; type: string; minutes: number; xp?: number; taskId?: string }

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

import { bandColorVar } from '../../lib/masteryPalette';
import { masteryBand } from '../../lib/pedagogy';

const BAND = (v: number, t: (k: I18nKey) => string) => {
  const band = masteryBand(v);
  const keys = { strong: 'strong', proficient: 'proficient', developing: 'developing', weak: 'weakLabel' } as const satisfies Record<typeof band, I18nKey>;
  return { label: t(keys[band]), color: bandColorVar(band) };
};

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
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
  const toolChipItems = useMemo(
    () =>
      toolActivity.slice(0, 12).map(({ tool, count, ms }) => {
        const label = `${workspaceToolLabel(tool as WorkspaceToolId, lang)} ×${count}${
          ms != null && ms > 0 ? ` · ${formatToolTimeMinutes(ms)}` : ''
        }`;
        return {
          key: tool,
          label,
          title: label,
          testId: `progress-tool-${tool}`,
          onClick: onOpenToolActivity ? () => onOpenToolActivity(tool as WorkspaceToolId) : undefined,
        };
      }),
    [toolActivity, lang, onOpenToolActivity],
  );

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
        {!collapsed && (
          <span className="type-caption font-semibold text-text-secondary flex-1 inline-flex items-center gap-1">
            <BarChart3 className="w-3 h-3 shrink-0" />
            {t('quickView')}
          </span>
        )}
        {collapsed
          ? <ChevronUp className="w-3.5 h-3.5 text-text-muted rotate-90" />
          : <ChevronDown className="w-3.5 h-3.5 text-text-muted rotate-90" />
        }
      </div>
      )}

      <AnimatePresence>
        {(!collapsed || embedded) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={emphasizedTransition}>
            {/* Tabs */}
            <div className="flex border-b border-border-subtle">
              {(['overview', 'weak', 'next'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={cn('flex-1 py-1.5 type-caption font-medium capitalize transition-all inline-flex items-center justify-center gap-0.5',
                    activeTab === tab ? 'text-text-secondary border-b border-brand-500' : 'text-text-muted hover:text-text-secondary')}>
                  {tab === 'overview' ? (
                    <><Target className="w-3 h-3" /> {t('status')}</>
                  ) : tab === 'weak' ? (
                    <><AlertTriangle className="w-3 h-3" /> {t('weak')}</>
                  ) : (
                    <><Play className="w-3 h-3" /> {t('nextActions')}</>
                  )}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="p-3 space-y-3">
                {/* Mini readiness ring */}
                <div className="flex items-center gap-3">
                  <svg width={size} height={size} className="-rotate-90 shrink-0">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={sw} />
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                      stroke={band.color} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={offset}
                      strokeLinecap="round" className="transition-all duration-700" />
                    <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                      className="rotate-90 origin-center" fill={band.color} fontSize={16} fontWeight="800">{readiness}%</text>
                  </svg>
                  <div>
                    <p className="text-xs font-semibold">{band.label}</p>
                    <p className="type-caption text-text-muted">{t('examReadiness')}</p>
                    <p className="type-caption text-text-muted mt-1">{conceptsMastered}/{totalConcepts} {t('concepts')}</p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-1.5">
                  <StatPill icon={<Zap className="w-3 h-3 text-accent-amber" />} label={t('streak')} value={`${streak}d`} />
                  <StatPill icon={<RotateCcw className="w-3 h-3 text-accent-teal" />} label={t('due')} value={`${reviewsDue}`} />
                  <StatPill icon={<Brain className="w-3 h-3 text-text-primary" />} label={t('weak')} value={`${weakSpots.length}`} />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <StatPill icon={<Clock className="w-3 h-3 text-accent-emerald" />} label={t('studyToday')} value={`${studyTimeToday}m`} />
                  <StatPill icon={<Clock className="w-3 h-3 text-text-primary" />} label={t('studyThisWeek')} value={`${studyTimeWeek}m`} />
                </div>

                {/* Always show — empty well was screenshot P0 when week>0 but daily series missing */}
                <div
                  className="rounded-lg border border-border-subtle bg-surface-primary/40 p-2"
                  data-testid="progress-study-week-chart"
                >
                  <p className="type-caption text-text-secondary mb-1.5">{t('studyThisWeek')}</p>
                  {recentStudyDays.length > 0 && recentStudyDays.some((m) => m > 0) ? (
                    <div className="flex h-10 items-end gap-1">
                      {(() => {
                        const maxMins = Math.max(...recentStudyDays, 1);
                        return recentStudyDays.map((mins, i) => (
                          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                            <div
                              className="w-full rounded-t bg-[var(--color-text-secondary)]"
                              style={{
                                height: mins <= 0
                                  ? '2px'
                                  : `${Math.max(18, Math.round((mins / maxMins) * 100))}%`,
                                opacity: mins <= 0 ? 0.35 : 1,
                              }}
                              title={`${mins}m`}
                            />
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="type-caption text-text-secondary" data-testid="progress-study-week-empty">
                      {/* UIUX-AUDIT-2026-08 F3 — this branch fires whenever the daily
                          bar-chart array (recentStudyDays) is empty/all-zero, which can
                          happen even when studyTimeWeek > 0 (e.g. demo/offline data).
                          The old copy concatenated the total with t('noActivity'),
                          producing a self-contradictory "210m · No recent activity"
                          message, confirmed from a live screenshot. Now: show the total
                          with "this week" when it's > 0, and only claim no activity when
                          it's genuinely 0. Rollback: restore the noActivity concatenation. */}
                      {studyTimeWeek > 0
                        ? `${studyTimeWeek}m ${t('dashThisWeek')}`
                        : t('noActivity')}
                    </p>
                  )}
                </div>

                {toolChipItems.length > 0 && (
                  <div
                    className="rounded-lg border border-border-subtle bg-surface-primary/40 p-2"
                    data-testid="progress-tool-activity"
                  >
                    <p className="type-caption text-text-secondary mb-1.5">
                      {t('exportSessionTools')}
                    </p>
                    <OverflowChipRow
                      items={toolChipItems}
                      maxVisible={3}
                      testId="progress-tool-chips"
                      chipClassName="type-caption max-w-[9rem] text-text-secondary"
                      moreAriaLabel={(n) => `+${n} ${t('exportSessionTools')}`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Weak spots tab */}
            {activeTab === 'weak' && (
              <div className="p-3 space-y-2 max-h-56 overflow-y-auto" data-testid="mini-dashboard-weak-tab">
                {weakList.length === 0 ? (
                  <p className="type-caption text-text-muted text-center py-4">{t('noWeakSpots')}</p>
                ) : weakList.map((w) => {
                  const detail = 'reasons' in w ? w as DashboardWeakSpot : undefined;
                  const concept = w.concept;
                  return (
                    <div
                      key={concept}
                      className="rounded-lg border border-border-subtle bg-surface-primary/40 p-2"
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
                          <p className="type-caption font-medium truncate">{concept}</p>
                          <p className="type-caption text-text-muted">{w.course}</p>
                        </div>
                        <p className="type-caption text-text-muted shrink-0">{w.mastery}%</p>
                      </button>
                      {detail && detail.reasons.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {detail.reasons.map((reason) => (
                            <span
                              key={reason.id}
                              className={cn(
                                'rounded-full border px-1.5 py-0.5 type-caption',
                                reason.severity === 'high'
                                  ? 'border-accent-rose/35 bg-accent-rose/12 text-accent-rose'
                                  : reason.severity === 'medium'
                                    ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
                                    : 'border-border-subtle text-text-muted',
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
                              className="rounded-full border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 type-caption font-medium text-text-primary hover:bg-brand-500/20"
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
                        : <BookOpen className="w-3 h-3 text-text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="type-caption font-medium truncate">{a.label}</p>
                      <p className="type-caption text-text-muted">{a.minutes}m • +{a.xp} XP</p>
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
      <span className="type-caption font-bold mt-0.5">{value}</span>
      <span className="type-micro text-text-muted">{label}</span>
    </div>
  );
}
