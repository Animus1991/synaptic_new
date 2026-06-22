import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RotateCcw, Copy, Check, PenSquare, LineChart } from 'lucide-react';
import { cn } from '../../utils/cn';
import { inferVariablesFromFormula, evaluateFormulaExpression, type FormulaVariable } from '../../lib/formulaSolver';
import { loadScratchpadFormulas, saveScratchpadFormulas } from '../../lib/workspacePersistence';
import type { ScratchpadExport } from '../../lib/workspaceScratchpadBridge';
import {
  curveToSvgPath,
  detectPlotSpec,
  sampleFormulaCurve,
} from '../../lib/scratchpadGraph';
import { FormulaLatexPreview } from './FormulaLatexPreview';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

interface Variable { symbol: string; value: string; unit: string }
interface SavedFormula { id: string; name: string; formula: string; variables: Variable[] }
interface PersistedScratch {
  formulas: SavedFormula[];
  vars: Variable[];
  steps: string[];
  active: string;
}

interface NoteFormula {
  id: string;
  name: string;
  formula: string;
}

interface Props {
  noteFormulas?: NoteFormula[];
  emptyMessage?: string;
  onUpload?: () => void;
  /** Workspace/task identifier used to scope persistence (avoids cross-task bleed). */
  scopeKey?: string;
  /** Send active formula (+ steps) to the whiteboard for LaTeX preview and insertion. */
  onSendToWhiteboard?: (payload: ScratchpadExport) => void;
  lang?: 'en' | 'el';
}

export function FormulaScratchpad({ noteFormulas = [], emptyMessage, onUpload, scopeKey, onSendToWhiteboard, lang = 'en' }: Props) {
  const scope = scopeKey ?? '__global';
  const persisted = loadScratchpadFormulas<PersistedScratch>(scope);
  const initialFormulas: SavedFormula[] = noteFormulas.map((f) => ({
    ...f,
    variables: inferVariablesFromFormula(f.formula),
  }));
  const [formulas, setFormulas] = useState<SavedFormula[]>(() =>
    initialFormulas.length > 0 ? initialFormulas : (persisted?.formulas ?? []),
  );
  const [active, setActive] = useState<string>(() => initialFormulas[0]?.id ?? persisted?.active ?? '');
  const [vars, setVars] = useState<Variable[]>(() =>
    initialFormulas[0]?.variables ?? persisted?.vars ?? [{ symbol: 'x', value: '', unit: '' }],
  );
  const [steps, setSteps] = useState<string[]>(() => persisted?.steps ?? []);
  const [copied, setCopied] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const activeFormula = formulas.find((f) => f.id === active);

  const plotSpec = useMemo(() => {
    if (!activeFormula) return null;
    return detectPlotSpec(activeFormula.formula, vars);
  }, [activeFormula, vars]);

  const plotPath = useMemo(() => {
    if (!activeFormula || !plotSpec || !showGraph) return '';
    const points = sampleFormulaCurve(activeFormula.formula, vars, plotSpec);
    return curveToSvgPath(points, 280, 140);
  }, [activeFormula, vars, plotSpec, showGraph]);

  useEffect(() => {
    saveScratchpadFormulas<PersistedScratch>(scope, { formulas, vars, steps, active });
  }, [scope, formulas, vars, steps, active]);

  useEffect(() => {
    if (noteFormulas.length === 0) return;
    const mapped: SavedFormula[] = noteFormulas.map((f) => ({
      ...f,
      variables: inferVariablesFromFormula(f.formula),
    }));
    setFormulas(mapped);
    if (mapped[0]) {
      setActive(mapped[0].id);
      setVars([...mapped[0].variables]);
      setSteps([]);
    }
  }, [noteFormulas]);

  const selectFormula = (id: string) => {
    const f = formulas.find(x => x.id === id);
    if (f) { setActive(id); setVars([...f.variables]); setSteps([]); }
  };

  const updateVar = (idx: number, value: string) => {
    setVars(prev => prev.map((v, i) => i === idx ? { ...v, value } : v));
  };

  const compute = () => {
    if (!activeFormula) return;
    const { steps } = evaluateFormulaExpression(activeFormula.formula, vars as FormulaVariable[]);
    setSteps(steps);
  };

  const copyResult = () => {
    navigator.clipboard.writeText(steps.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addCustom = () => {
    const id = `f-${Date.now()}`;
    const f: SavedFormula = { id, name: 'Custom Formula', formula: 'y = mx + b', variables: [
      { symbol: 'm', value: '', unit: '' }, { symbol: 'x', value: '', unit: '' }, { symbol: 'b', value: '', unit: '' },
    ]};
    setFormulas(prev => [...prev, f]);
    selectFormula(id);
  };

  const sendToWhiteboard = () => {
    if (!activeFormula || !onSendToWhiteboard) return;
    onSendToWhiteboard({
      id: activeFormula.id,
      name: activeFormula.name,
      formula: activeFormula.formula,
      steps: steps.length > 0 ? steps : undefined,
      variables: vars.filter((v) => v.value.trim()),
    });
  };

  if (formulas.length === 0) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? 'Upload notes to extract formulas from your material, or add a custom formula.'}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border-subtle bg-surface-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-secondary/40 shrink-0">
        <span className="text-xs font-semibold text-text-secondary">📐 Formula Scratchpad</span>
        <button onClick={addCustom} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-muted hover:text-text-secondary bg-surface-hover">
          <Plus className="w-3 h-3" /> Add Custom
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Formula list */}
        <div className="w-40 border-r border-border-subtle overflow-y-auto py-2 shrink-0">
          {formulas.map(f => (
            <button key={f.id} onClick={() => selectFormula(f.id)}
              className={cn('w-full text-left px-3 py-2 text-xs transition-all',
                active === f.id ? 'bg-brand-600/15 text-brand-300 border-l-2 border-brand-500' : 'text-text-secondary hover:bg-surface-hover')}>
              {f.name}
            </button>
          ))}
        </div>

        {/* Work area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeFormula && (
            <>
              {/* Formula display */}
              <div className="text-center">
                <p className="text-[10px] text-text-muted mb-1">{activeFormula.name}</p>
                <div className="py-3 px-6 rounded-xl bg-surface-primary/60 inline-block">
                  <FormulaLatexPreview formula={activeFormula.formula} />
                </div>
                <p className="text-[9px] text-text-muted font-mono mt-1 opacity-70">{activeFormula.formula}</p>
              </div>

              {/* Variable inputs */}
              <div className="space-y-2">
                <p className="text-[10px] text-text-muted font-medium">Variables</p>
                {vars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-400 text-sm w-12 shrink-0 text-right">{v.symbol}</span>
                    <span className="text-text-muted text-xs">=</span>
                    <input
                      type="text" value={v.value} onChange={e => updateVar(i, e.target.value)}
                      placeholder="value"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-surface-input border border-border-subtle text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50"
                    />
                    {v.unit && <span className="text-[10px] text-text-muted w-8">{v.unit}</span>}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={compute} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all">
                  {lang === 'el' ? 'Υπολογισμός βημάτων' : 'Compute Step-by-Step'}
                </button>
                {plotSpec && (
                  <button
                    type="button"
                    data-testid="scratchpad-graph-plot"
                    onClick={() => setShowGraph((v) => !v)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-medium',
                      showGraph ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan' : 'border-border-subtle text-text-muted',
                    )}
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    {lang === 'el' ? 'Γράφημα' : 'Plot'}
                  </button>
                )}
                {onSendToWhiteboard && (
                  <button
                    type="button"
                    onClick={sendToWhiteboard}
                    title={lang === 'el' ? 'Άνοιγμα στον πίνακα' : 'Open on whiteboard'}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/20"
                  >
                    <PenSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{lang === 'el' ? 'Πίνακας' : 'Board'}</span>
                  </button>
                )}
                <button onClick={() => { setVars(activeFormula.variables.map(v => ({ ...v, value: '' }))); setSteps([]); }}
                  className="p-2.5 rounded-xl border border-border-subtle text-text-muted hover:text-text-secondary hover:bg-surface-hover">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {showGraph && plotPath && plotSpec && (
                <div
                  className="rounded-xl border border-border-subtle bg-surface-primary/50 p-3"
                  data-testid="scratchpad-graph-panel"
                >
                  <p className="mb-2 text-[10px] font-semibold text-text-muted">
                    {plotSpec.dependent} = f({plotSpec.independent})
                  </p>
                  <svg viewBox="0 0 280 140" className="w-full h-36 rounded-lg bg-surface-card/60">
                    <path d={plotPath} fill="none" stroke="#67e8f9" strokeWidth="2" />
                  </svg>
                </div>
              )}

              {/* Steps output */}
              <AnimatePresence>
                {steps.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-4 rounded-xl bg-surface-primary/60 border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-muted font-medium">Solution</span>
                      <button onClick={copyResult} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary">
                        {copied ? <><Check className="w-3 h-3 text-accent-emerald" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    {steps.map((s, i) => (
                      <motion.p key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}
                        className={cn('text-sm font-mono', s.startsWith('✓') ? 'text-accent-emerald font-semibold' : s.startsWith('⚠') ? 'text-accent-amber' : 'text-text-secondary')}>
                        {s}
                      </motion.p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
