import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ArrowDownUp, Download, Sparkles, List, Calculator, Scale, Flag, TrendingUp } from '@/lib/lucide-shim';
import { termMatchesFocus } from '../../lib/workspaceFocus';
import { cn } from '../../utils/cn';
import { downloadCompareCsv } from '../../lib/compareExport';
import { nextSortDirection, sortCompareRows, type CompareSortDir } from '../../lib/compareSort';
import {
  annotateDiffCells,
  findFocusBaselineRow,
  isDiffHighlight,
  rowDiffScores,
} from '../../lib/compareDiff';
import { t as translate, useI18n, type Lang } from '../../lib/i18n';

/* --- Flowchart Diagram --- */
interface FlowNode { id: string; label: string; type: 'start' | 'step' | 'decision' | 'end' }
interface FlowEdge { from: string; to: string; label?: string }

export function FlowchartDiagram({ nodes, edges, title }: { nodes: FlowNode[]; edges: FlowEdge[]; title?: string }) {
  const nodeW = 140, nodeH = 44, gapY = 70;
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => { positions[n.id] = { x: 160, y: 40 + i * gapY }; });
  const svgH = nodes.length * gapY + 40;

  const getShape = (node: FlowNode, x: number, y: number) => {
    const nw = nodeW, nh = nodeH;
    switch (node.type) {
      case 'start': case 'end':
        return <rect x={x - nw / 2} y={y - nh / 2} width={nw} height={nh} rx={nh / 2} fill="#1e1740" stroke={node.type === 'start' ? '#34d399' : '#fb7185'} strokeWidth={2} />;
      case 'decision':
        return <polygon points={`${x},${y - nh / 2} ${x + nw / 2},${y} ${x},${y + nh / 2} ${x - nw / 2},${y}`} fill="#1e1740" stroke="#fbbf24" strokeWidth={2} />;
      default:
        return <rect x={x - nw / 2} y={y - nh / 2} width={nw} height={nh} rx={8} fill="#1e1740" stroke="#818cf8" strokeWidth={2} />;
    }
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4">
      {title && <p className="text-xs font-semibold mb-2 text-text-secondary inline-flex items-center gap-1.5"><List className="w-3.5 h-3.5" /> {title}</p>}
      <svg width={320} height={svgH} className="block mx-auto">
        {/* Edges */}
        {edges.map((e, i) => {
          const from = positions[e.from], to = positions[e.to];
          if (!from || !to) return null;
          return (
            <g key={i}>
              <motion.line
                x1={from.x} y1={from.y + nodeH / 2} x2={to.x} y2={to.y - nodeH / 2}
                stroke="#4d4870" strokeWidth={1.5} markerEnd="url(#arrow)"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.15 }}
              />
              {e.label && (
                <text x={(from.x + to.x) / 2 + 8} y={(from.y + to.y) / 2 + 4} fill="#706b8f" fontSize={8}>{e.label}</text>
              )}
            </g>
          );
        })}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#4d4870" />
          </marker>
        </defs>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = positions[node.id];
          return (
            <motion.g key={node.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.12 }}>
              {getShape(node, pos.x, pos.y)}
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#f1f0f7" fontSize={10} fontWeight="500">
                {node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* --- Formula Explorer --- */
interface FormulaSymbol { symbol: string; meaning: string; unit?: string }

export function FormulaExplorer({ formula, name, symbols }: { formula: string; name: string; symbols: FormulaSymbol[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4">
      <p className="text-xs font-semibold mb-3 text-text-secondary inline-flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Formula Explorer</p>
      <div className="text-center mb-4">
        <p className="text-xs text-text-muted mb-1">{name}</p>
        <div className="text-2xl font-mono font-bold text-brand-300 py-3 px-4 rounded-lg bg-surface-primary/60 inline-block">
          {formula}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {symbols.map(s => (
          <div key={s.symbol} className="flex items-start gap-2 p-2 rounded-lg bg-surface-hover/50">
            <span className="font-mono font-bold text-brand-400 text-sm w-8 shrink-0">{s.symbol}</span>
            <div>
              <p className="text-xs text-text-secondary">{s.meaning}</p>
              {s.unit && <p className="text-[10px] text-text-muted">Unit: {s.unit}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Comparison Table --- */
export function ComparisonTable({
  title,
  items,
  headers,
  focusTerm,
  onRowFocus,
  onRowSelect,
  selectedTerm,
  concept,
  lang = 'en',
  onAskAgent,
}: {
  title: string;
  items: string[][];
  headers: string[];
  focusTerm?: string;
  onRowFocus?: (term: string) => void;
  onRowSelect?: (term: string, rowText: string) => void;
  selectedTerm?: string;
  concept?: string;
  lang?: 'en' | 'el';
  onAskAgent?: () => void;
}) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<CompareSortDir>('asc');
  const [diffMode, setDiffMode] = useState(true);

  const baselineIndex = useMemo(
    () => findFocusBaselineRow(items, focusTerm),
    [items, focusTerm],
  );

  const sortedItems = useMemo(() => {
    if (sortCol === null) return items;
    return sortCompareRows(items, sortCol, sortDir, focusTerm);
  }, [items, sortCol, sortDir, focusTerm]);

  const diffScores = useMemo(() => {
    const baseline = sortedItems[baselineIndex] ?? sortedItems[0] ?? [];
    return sortedItems.map((row) => rowDiffScores(row, baseline));
  }, [sortedItems, baselineIndex]);

  const toggleSort = (col: number) => {
    if (sortCol === col) {
      setSortDir(nextSortDirection(sortDir));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4 overflow-x-auto" data-testid="comparison-table">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-text-secondary inline-flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> {title}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="compare-diff-toggle"
            onClick={() => setDiffMode((v) => !v)}
            className={cn(
              'rounded-lg border px-2 py-1 text-[10px] font-medium',
              diffMode ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-border-subtle text-text-muted',
            )}
          >
            {translate('compareDiff', lang as Lang)}
          </button>
          <button
            type="button"
            data-testid="compare-export-csv"
            onClick={() => {
              const rows = diffMode ? annotateDiffCells(sortedItems, baselineIndex) : sortedItems;
              downloadCompareCsv(`comparison-${lang}`, title, headers, rows, concept);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-1 text-[10px] font-medium text-brand-300 hover:bg-brand-600/20"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          {onAskAgent && (
            <button
              type="button"
              data-testid="compare-ask-agent"
              onClick={onAskAgent}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-1 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/15"
            >
              <Sparkles className="w-3 h-3" />
              Agent
            </button>
          )}
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-text-tertiary font-medium">
                <button
                  type="button"
                  data-testid={`compare-sort-col-${i}`}
                  onClick={() => toggleSort(i)}
                  className={cn(
                    'inline-flex items-center gap-1 hover:text-brand-300 transition-colors',
                    sortCol === i && 'text-brand-300',
                  )}
                >
                  {h}
                  <ArrowDownUp className="w-3 h-3 opacity-60" />
                  {sortCol === i && (
                    <span className="text-[10px] font-mono">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((row, i) => {
            const dim = row[0] ?? '';
            const focused = termMatchesFocus(dim, focusTerm);
            const selected = selectedTerm != null && termMatchesFocus(dim, selectedTerm);
            const isBaseline = i === baselineIndex;
            return (
              <motion.tr
                key={`${dim}-${i}`}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={diffMode && !isBaseline ? 'compare-diff-row' : undefined}
                className={cn(
                  'border-b border-border-subtle/50 last:border-0',
                  focused && 'bg-brand-500/10',
                  selected && 'ring-1 ring-accent-cyan/40 bg-accent-cyan/5',
                  isBaseline && diffMode && 'ring-1 ring-accent-amber/30',
                  (onRowFocus || onRowSelect) && 'cursor-pointer hover:bg-surface-hover',
                )}
                onClick={() => {
                  const rowText = row.filter(Boolean).join(' · ');
                  if (onRowSelect) onRowSelect(dim, rowText);
                  else onRowFocus?.(dim);
                }}
              >
                {row.map((cell, j) => {
                  const sim = diffScores[i]?.[j] ?? 1;
                  const highlight = diffMode && !isBaseline && j > 0 && isDiffHighlight(sim);
                  return (
                    <td
                      key={j}
                      className={cn(
                        'py-2 px-3 text-text-secondary',
                        j === 0 && focused && 'font-semibold text-brand-200',
                        highlight && 'bg-accent-amber/15 text-accent-amber font-medium',
                      )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* --- Timeline / Progress Milestones --- */
interface Milestone { label: string; completed: boolean; date?: string; xp?: number }

export function ProgressTimeline({ milestones, title }: { milestones: Milestone[]; title?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4">
      {title && <p className="text-xs font-semibold mb-3 text-text-secondary inline-flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> {title}</p>}
      <div className="space-y-0">
        {milestones.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3"
          >
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${m.completed ? 'border-accent-emerald bg-accent-emerald/20' : 'border-text-muted bg-surface-hover'}`}>
                {m.completed && <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />}
              </div>
              {i < milestones.length - 1 && (
                <div className={`w-0.5 h-8 ${m.completed ? 'bg-accent-emerald/30' : 'bg-border-subtle'}`} />
              )}
            </div>
            <div className="pb-6">
              <p className={`text-xs font-medium ${m.completed ? 'text-text-primary' : 'text-text-tertiary'}`}>{m.label}</p>
              {m.date && <p className="text-[10px] text-text-muted mt-0.5">{m.date}</p>}
              {m.xp && m.completed && <p className="text-[10px] text-accent-amber mt-0.5">+{m.xp} XP</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* --- Retention Curve (J-A02: theme-aware stroke + day markers) --- */
export function RetentionCurve({ dataPoints }: { dataPoints: { day: number; retention: number }[] }) {
  const { t } = useI18n();
  const w = 300, h = 168, pad = 28;
  const gw = w - 2 * pad, gh = h - 2 * pad - 14;
  const maxDay = Math.max(...dataPoints.map(d => d.day), 14);

  const points = dataPoints.map(d => ({
    day: d.day,
    x: pad + (d.day / maxDay) * gw,
    y: pad + gh - (d.retention / 100) * gh,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const markerDays = new Set([0, 14]);
  const markers = points.filter((p) => markerDays.has(p.day) || p.day === maxDay);
  const stroke = 'var(--color-brand-600)';
  const grid = 'var(--color-border-subtle)';
  const axis = 'var(--color-text-muted)';

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-3" data-testid="retention-curve">
      <p className="text-[11px] font-semibold mb-0.5 text-text-secondary inline-flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 rotate-180" /> {t('analyticsRetentionCurveTitle')}
      </p>
      <p className="text-[10px] text-text-muted mb-2">{t('analyticsRetentionCurveSubtitle')}</p>
      <svg width={w} height={h} className="block mx-auto max-w-full" viewBox={`0 0 ${w} ${h}`}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={pad} y1={pad + gh - (v / 100) * gh} x2={w - pad} y2={pad + gh - (v / 100) * gh} stroke={grid} strokeWidth={1} />
            <text x={pad - 5} y={pad + gh - (v / 100) * gh + 3} textAnchor="end" fill={axis} fontSize={8}>{v}%</text>
          </g>
        ))}
        <line x1={pad} y1={pad + gh} x2={w - pad} y2={pad + gh} stroke={axis} strokeWidth={1} />

        <motion.path
          d={pathD}
          fill="none" stroke={stroke} strokeWidth={2.25} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }}
        />

        <path d={`${pathD} L${points[points.length - 1]?.x || pad},${pad + gh} L${pad},${pad + gh} Z`} fill="url(#retention-grad)" opacity={0.18} />
        <defs>
          <linearGradient id="retention-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" /><stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {points.map((p, i) => (
          <motion.circle
            key={i} cx={p.x} cy={p.y} r={2.5} fill={stroke}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08 }}
          />
        ))}

        {/* Mockup day markers: Σήμερα … +14ημ. */}
        {markers.map((p) => {
          const label = p.day === 0
            ? t('analyticsTimelineDayToday')
            : t('analyticsRetentionDayPlus').replace('{n}', String(p.day));
          return (
            <g key={`marker-${p.day}`}>
              <rect
                x={p.x - 18}
                y={pad + gh + 2}
                width={36}
                height={12}
                rx={6}
                fill="var(--color-brand-700)"
                opacity={0.9}
              />
              <text x={p.x} y={pad + gh + 10.5} textAnchor="middle" fill="#fff" fontSize={7} fontWeight={600}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] text-text-muted text-center mt-1">{t('analyticsRetentionCurveHint')}</p>
    </div>
  );
}
