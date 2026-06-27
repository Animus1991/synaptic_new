import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, SlidersHorizontal, Target, Zap } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import type { NumericCue } from '../../lib/numericCues';
import { sandboxDeltaInsight } from '../../lib/numericCues';
import {
  buildEconomicsSensitivity,
  buildParameterSensitivity,
  topSensitivityCue,
} from '../../lib/sandboxSensitivity';
import {
  SIMULATOR_SCENARIO_PRESETS,
  type SimulatorScenarioId,
} from '../../lib/examPracticePresets';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

const CHALLENGE_TARGET_P = 55;
const CHALLENGE_TOLERANCE = 3;

interface Props {
  insight?: string;
  economicsMode?: boolean;
  numericCues?: NumericCue[];
  concept?: string;
  emptyMessage?: string;
  hasSource?: boolean;
  onUpload?: () => void;
  lang?: 'en' | 'el';
  onSensitivityCue?: (cueId: string) => void;
  onEngage?: () => void;
  onScenarioSelect?: (scenarioId: SimulatorScenarioId) => void;
  initialScenarioId?: SimulatorScenarioId | null;
}

export function InteractiveSimulator({
  insight,
  economicsMode = false,
  numericCues = [],
  concept = '',
  emptyMessage,
  hasSource = false,
  onUpload,
  lang: langProp,
  onSensitivityCue,
  onEngage,
  onScenarioSelect,
  initialScenarioId,
}: Props) {
  const { t, lang: i18nLang } = useI18n();
  const lang = langProp ?? i18nLang;
  const initialScenario = initialScenarioId
    ? SIMULATOR_SCENARIO_PRESETS.find((p) => p.id === initialScenarioId)
    : null;
  const [demandShift, setDemandShift] = useState(initialScenario?.demand ?? 0);
  const [supplyShift, setSupplyShift] = useState(initialScenario?.supply ?? 0);
  const [cueValues, setCueValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(numericCues.map((c) => [c.id, c.baseline])),
  );

  useEffect(() => {
    setCueValues(Object.fromEntries(numericCues.map((c) => [c.id, c.baseline])));
  }, [numericCues]);

  const genericInsight = useMemo(
    () => sandboxDeltaInsight(numericCues, cueValues, concept, lang),
    [numericCues, cueValues, concept, lang],
  );

  const sensitivityCells = useMemo(() => {
    if (numericCues.length === 0) return [];
    return buildParameterSensitivity(numericCues, cueValues, (trial) => {
      let sum = 0;
      for (const c of numericCues) {
        const v = trial[c.id] ?? c.baseline;
        sum += (v - c.baseline) / Math.max(c.baseline, 1e-6);
      }
      return sum;
    });
  }, [numericCues, cueValues]);

  useEffect(() => {
    const top = topSensitivityCue(sensitivityCells);
    if (top) onSensitivityCue?.(top);
  }, [sensitivityCells, onSensitivityCue]);

  const econSensitivity = useMemo(
    () => buildEconomicsSensitivity(demandShift, supplyShift),
    [demandShift, supplyShift],
  );

  useEffect(() => {
    if (economicsMode) {
      const top = topSensitivityCue(econSensitivity);
      if (top) onSensitivityCue?.(top);
    }
  }, [economicsMode, econSensitivity, onSensitivityCue]);

  const w = 360;
  const h = 280;
  const pad = 40;
  const gw = w - 2 * pad;
  const gh = h - 2 * pad;

  const eqP = (100 + demandShift - supplyShift) / 2;
  const eqQ = eqP + supplyShift;
  const challengeMet = Math.abs(eqP - CHALLENGE_TARGET_P) <= CHALLENGE_TOLERANCE;

  const scaleX = gw / 140;
  const scaleY = gh / 140;
  const toX = (q: number) => pad + q * scaleX;
  const toY = (p: number) => h - pad - p * scaleY;

  const dQ0 = 100 + demandShift;
  const dP0 = 100 + demandShift;
  const sP_Q0 = -supplyShift;
  const sP1 = Math.max(0, sP_Q0);
  const sQ1 = sP1 + supplyShift;
  const sP2 = 140;
  const sQ2 = sP2 + supplyShift;

  const presetButtons = useMemo(() => SIMULATOR_SCENARIO_PRESETS, []);

  const applyScenario = (scenarioId: SimulatorScenarioId) => {
    const preset = SIMULATOR_SCENARIO_PRESETS.find((p) => p.id === scenarioId);
    if (!preset) return;
    setDemandShift(preset.demand);
    setSupplyShift(preset.supply);
    onEngage?.();
    onScenarioSelect?.(scenarioId);
  };

  if (!economicsMode) {
    if (numericCues.length > 0) {
      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-2.5 shrink-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="w-4 h-4 text-brand-400" />
              {t('parametricSandbox')}
            </span>
            <span className="rounded border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-300">
              {lang === 'el' ? 'Από σημειώσεις' : 'From notes'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs text-text-tertiary">
              {lang === 'el'
                ? 'Ρύθμισε τιμές που εμφανίζονται στο υλικό σου και παρατήρησε τη μεταβολή.'
                : 'Adjust values found in your material and observe the relative change.'}
            </p>
            {numericCues.map((cue) => (
              <div key={cue.id} className="rounded-xl border border-border-subtle bg-surface-card p-4">
                <div className="mb-2 flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-300">{cue.label}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{cue.context}</p>
                  </div>
                  <span className="font-mono text-sm text-text-secondary shrink-0">
                    {(cueValues[cue.id] ?? cue.baseline).toFixed(cue.unit === '%' ? 0 : 1)}
                    {cue.unit === '%' ? '%' : cue.unit ? ` ${cue.unit}` : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={cue.min}
                  max={cue.max}
                  step={cue.unit === '%' ? 1 : (cue.max - cue.min) / 40}
                  value={cueValues[cue.id] ?? cue.baseline}
                  onChange={(e) => {
                    setCueValues((v) => ({ ...v, [cue.id]: Number(e.target.value) }));
                    onEngage?.();
                  }}
                  className="w-full"
                  style={{ accentColor: '#818cf8' }}
                />
                <div className="flex justify-between text-[9px] text-text-muted mt-1">
                  <span>{cue.min}</span>
                  <span>{lang === 'el' ? 'βάση' : 'baseline'}: {cue.baseline}</span>
                  <span>{cue.max}</span>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-3 text-sm text-brand-200">
              <Zap className="w-4 h-4 inline mr-1.5 mb-0.5" />
              {genericInsight || insight}
            </div>
            {sensitivityCells.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-surface-card p-3" data-testid="sandbox-sensitivity-heatmap">
                <p className="mb-2 text-[10px] font-semibold text-text-muted">
                  {lang === 'el' ? 'Ευαισθησία παραμέτρων' : 'Parameter sensitivity'}
                </p>
                <div className="space-y-2">
                  {sensitivityCells.map((cell) => (
                    <div key={cell.cueId} className="flex items-center gap-2">
                      <span className="w-24 truncate text-[10px] text-text-secondary">{cell.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface-primary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-cyan/80"
                          style={{ width: `${Math.round(cell.intensity * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-text-muted w-8 text-right">
                        {(cell.intensity * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-2.5 shrink-0">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="w-4 h-4 text-brand-400" />
            {t('parametricSandbox')}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <WorkspaceEmptyState
        tool="simulator"
            message={emptyMessage ?? (insight || t('sandboxInsight'))}
            hasSource={hasSource}
            onUpload={onUpload}
          />
          {insight && (
            <div className="mt-4 w-full max-w-2xl rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-4 text-left text-xs text-text-secondary leading-relaxed">
              {insight}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-2.5 shrink-0">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="w-4 h-4 text-brand-400" />
          {t('parametricSandbox')}
        </span>
        <span className="rounded border border-accent-teal/35 bg-accent-teal/15 px-2.5 py-1 text-xs text-accent-teal">
          {t('liveEquilibrium')}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto p-4">
        <div className="mb-3 w-full max-w-sm">
          <p className="mb-1.5 text-xs font-medium text-text-tertiary">{t('presets')}</p>
          <div className="flex flex-wrap gap-1.5">
            {presetButtons.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`simulator-scenario-${p.id}`}
                onClick={() => applyScenario(p.id)}
                className="rounded-full border border-border-subtle bg-surface-primary/50 px-2.5 py-1 text-xs hover:border-brand-500/40 transition-all"
              >
                {t(p.i18nKey)}
              </button>
            ))}
          </div>
        </div>

        <svg width={w} height={h} className="mb-3 block overflow-visible">
          <line x1={pad} y1={pad - 10} x2={pad} y2={h - pad} stroke="#6b6494" strokeWidth={2} />
          <line x1={pad} y1={h - pad} x2={w - pad + 10} y2={h - pad} stroke="#6b6494" strokeWidth={2} />
          <text x={pad - 15} y={pad} fill="#b8b3d4" fontSize={11} fontWeight="bold">P</text>
          <text x={w - pad} y={h - pad + 15} fill="#b8b3d4" fontSize={11} fontWeight="bold">Q</text>

          <motion.polygon
            points={`${toX(0)},${toY(dQ0)} ${toX(eqQ)},${toY(eqP)} ${toX(0)},${toY(eqP)}`}
            fill="#34d399" opacity={0.15}
            animate={{ points: `${toX(0)},${toY(dQ0)} ${toX(eqQ)},${toY(eqP)} ${toX(0)},${toY(eqP)}` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          />
          <motion.polygon
            points={`${toX(0)},${toY(eqP)} ${toX(eqQ)},${toY(eqP)} ${toX(0)},${toY(Math.max(0, sP_Q0))}`}
            fill="#818cf8" opacity={0.15}
            animate={{ points: `${toX(0)},${toY(eqP)} ${toX(eqQ)},${toY(eqP)} ${toX(0)},${toY(Math.max(0, sP_Q0))}` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          />
          <motion.line
            x1={toX(0)} y1={toY(dQ0)} x2={toX(dP0)} y2={toY(0)}
            stroke="#34d399" strokeWidth={3} strokeLinecap="round"
            animate={{ x1: toX(0), y1: toY(dQ0), x2: toX(dP0), y2: toY(0) }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          />
          <text x={toX(dP0) - 10} y={toY(0) - 10} fill="#34d399" fontSize={12} fontWeight="bold">D</text>
          <motion.line
            x1={toX(sQ1)} y1={toY(sP1)} x2={toX(sQ2)} y2={toY(sP2)}
            stroke="#818cf8" strokeWidth={3} strokeLinecap="round"
            animate={{ x1: toX(sQ1), y1: toY(sP1), x2: toX(sQ2), y2: toY(sP2) }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          />
          <text x={toX(sQ2) - 10} y={toY(sP2) + 15} fill="#818cf8" fontSize={12} fontWeight="bold">S</text>
          <line x1={pad} y1={toY(eqP)} x2={toX(eqQ)} y2={toY(eqP)} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
          <line x1={toX(eqQ)} y1={h - pad} x2={toX(eqQ)} y2={toY(eqP)} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
          <circle cx={toX(eqQ)} cy={toY(eqP)} r={6} fill="#fbbf24" />
        </svg>

        <div className="mb-4 flex gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-accent-emerald">
            <span className="h-3.5 w-3.5 rounded-sm border border-accent-emerald bg-accent-emerald/25" />
            {t('consumerSurplus')}
          </span>
          <span className="flex items-center gap-1.5 text-brand-300">
            <span className="h-3.5 w-3.5 rounded-sm border border-brand-400 bg-brand-500/25" />
            {t('producerSurplus')}
          </span>
        </div>

        <div className="mb-3 w-full max-w-sm rounded-xl border border-border-subtle bg-surface-primary/50 p-3">
          <p className="mb-1 text-[11px] font-semibold text-brand-300">{t('equilibriumFormulas')}</p>
          <p className="font-mono text-sm text-text-secondary">P* = (100 + ΔD − ΔS) / 2</p>
          <p className="font-mono text-sm text-text-secondary">Q* = P* + ΔS</p>
        </div>

        <div className="w-full max-w-sm space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4">
          <div>
            <div className="mb-2 flex justify-between">
              <label className="text-xs font-semibold text-accent-emerald">{t('demandShock')}</label>
              <span className="font-mono text-xs text-text-tertiary">{demandShift > 0 ? '+' : ''}{demandShift}</span>
            </div>
            <input type="range" min={-40} max={40} value={demandShift} onChange={(e) => { setDemandShift(Number(e.target.value)); onEngage?.(); }} className="w-full" style={{ accentColor: '#34d399' }} />
          </div>
          <div>
            <div className="mb-2 flex justify-between">
              <label className="text-xs font-semibold text-brand-300">{t('supplyShock')}</label>
              <span className="font-mono text-xs text-text-tertiary">{supplyShift > 0 ? '+' : ''}{supplyShift}</span>
            </div>
            <input type="range" min={-40} max={40} value={supplyShift} onChange={(e) => { setSupplyShift(Number(e.target.value)); onEngage?.(); }} className="w-full" style={{ accentColor: '#818cf8' }} />
          </div>
          <div className="flex items-center justify-between border-t border-border-subtle pt-3 font-mono text-sm">
            <span>P* = <strong>{eqP.toFixed(1)}</strong></span>
            <ArrowRight className="w-4 h-4 text-text-muted" />
            <span>Q* = <strong>{eqQ.toFixed(1)}</strong></span>
          </div>
        </div>

        <div className={cn(
          'mt-4 w-full max-w-sm rounded-lg border p-3.5 text-sm',
          challengeMet ? 'border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald' : 'border-accent-amber/35 bg-accent-amber/8 text-text-secondary',
        )}>
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Target className="w-4 h-4" />
            {t('challengeTitle')} {CHALLENGE_TARGET_P}
          </div>
          {challengeMet ? (
            <p>{t('challengeSuccess')} {eqP.toFixed(1)}.</p>
          ) : (
            <>
              <p>{t('challengeAdjust')}{CHALLENGE_TOLERANCE} of {CHALLENGE_TARGET_P}.</p>
              <p className="mt-1 text-xs text-text-tertiary">{t('challengeHint')}</p>
            </>
          )}
        </div>

        <div className="mt-4 flex w-full max-w-sm items-start gap-2 rounded-lg border border-brand-500/30 bg-brand-500/12 p-3.5 text-sm text-brand-200">
          <Zap className="mt-0.5 w-4 h-4 shrink-0" />
          <p>{insight ?? t('sandboxInsight')}</p>
        </div>

        <div className="mt-4 w-full max-w-sm rounded-xl border border-border-subtle bg-surface-card p-3" data-testid="sandbox-sensitivity-heatmap">
          <p className="mb-2 text-[10px] font-semibold text-text-muted">
            {lang === 'el' ? 'Ευαισθησία P*' : 'P* sensitivity'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['demand', 'supply'].map((axis) => {
              const cells = econSensitivity.filter((c) => c.cueId === axis);
              const peak = Math.max(...cells.map((c) => c.intensity), 0.01);
              return (
                <div key={axis} className="rounded-lg bg-surface-primary/50 p-2">
                  <p className="text-[9px] font-medium text-text-secondary mb-1 capitalize">{axis}</p>
                  <div className="flex gap-0.5 h-6 items-end">
                    {cells.slice(0, 5).map((cell, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-accent-cyan/70"
                        style={{ height: `${Math.max(12, (cell.intensity / peak) * 100)}%`, opacity: 0.35 + (cell.intensity / peak) * 0.65 }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
