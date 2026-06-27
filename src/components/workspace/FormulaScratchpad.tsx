import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RotateCcw, Copy, Check, PenSquare, LineChart, Sparkles, ShieldCheck, Loader2, Calculator } from '@/lib/lucide-shim';
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
import { ScratchpadNotesPanel } from './ScratchpadNotesPanel';
import type { ScratchpadEntry, ScratchpadMode } from '../../lib/scratchpadEntryStore';
import { validateScratchpadStepsWithSympy } from '../../lib/sympyScratchpadRunner';
import type { ScratchpadSympyValidationResult } from '../../lib/scratchpadSympyValidation';
import { auditScratchpadSympyChain, scratchpadSympyEdgeLabel } from '../../lib/scratchpadSympyChainEdgeCasesQA';
import { ScratchpadSympyChainStrip } from './ScratchpadSympyChainStrip';

interface Variable { symbol: string; value: string; unit: string }
interface SavedFormula { id: string; name: string; formula: string; variables: Variable[] }
interface PersistedScratch {
  formulas: SavedFormula[];
  vars: Variable[];
  steps: string[];
  active: string;
  derivationDraft?: string;
}

interface NoteFormula {
  id: string;
  name: string;
  formula: string;
}

interface Props {
  noteFormulas?: NoteFormula[];
  emptyMessage?: string;
  hasSource?: boolean;
  onUpload?: () => void;
  /** Workspace/task identifier used to scope persistence (avoids cross-task bleed). */
  scopeKey?: string;
  /** Send active formula (+ steps) to the whiteboard for LaTeX preview and insertion. */
  onSendToWhiteboard?: (payload: ScratchpadExport) => void;
  onAskAgent?: (formulaText: string) => void;
  lang?: 'en' | 'el';
  concept?: string;
  sectionLabel?: string;
  sectionIndex?: number;
  notesDraft?: string;
  onNotesDraftChange?: (text: string) => void;
  onEntrySaved?: (entry: ScratchpadEntry) => void;
  onConvertToFlashcard?: (card: { front: string; back: string }, entry: ScratchpadEntry) => void;
  onConvertToAnnotation?: (entry: ScratchpadEntry) => void;
  onAskAgentAboutNote?: (text: string, mode: ScratchpadMode) => void;
}

export function FormulaScratchpad({
  noteFormulas = [],
  emptyMessage,
  hasSource = false,
  onUpload,
  scopeKey,
  onSendToWhiteboard,
  onAskAgent,
  lang = 'en',
  concept,
  sectionLabel,
  sectionIndex,
  notesDraft,
  onNotesDraftChange,
  onEntrySaved,
  onConvertToFlashcard,
  onConvertToAnnotation,
  onAskAgentAboutNote,
}: Props) {
  const scope = scopeKey ?? '__global';
  const [panel, setPanel] = useState<'formulas' | 'notes'>('formulas');
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
  const [derivationDraft, setDerivationDraft] = useState(() => persisted?.derivationDraft ?? '');
  const [copied, setCopied] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [numericResult, setNumericResult] = useState<number | null>(null);
  const [sympyValidation, setSympyValidation] = useState<ScratchpadSympyValidationResult | null>(null);
  const [sympyLoading, setSympyLoading] = useState(false);

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
    saveScratchpadFormulas<PersistedScratch>(scope, {
      formulas, vars, steps, active, derivationDraft,
    });
  }, [scope, formulas, vars, steps, active, derivationDraft]);

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
    if (f) {
      setActive(id);
      setVars([...f.variables]);
      setSteps([]);
      setDerivationDraft('');
      setSympyValidation(null);
      setNumericResult(null);
    }
  };

  const updateVar = (idx: number, value: string) => {
    setVars(prev => prev.map((v, i) => i === idx ? { ...v, value } : v));
  };

  const compute = () => {
    if (!activeFormula) return;
    const { steps, result } = evaluateFormulaExpression(activeFormula.formula, vars as FormulaVariable[]);
    setSteps(steps);
    setNumericResult(result);
    setDerivationDraft(steps.join('\n'));
    setSympyValidation(null);
  };

  const derivationLines = useMemo(
    () => derivationDraft.split('\n').filter((l) => l.trim().length > 0),
    [derivationDraft],
  );

  const sympyChainReport = useMemo(() => {
    if (!activeFormula) return null;
    return auditScratchpadSympyChain({
      formula: activeFormula.formula,
      stepLines: derivationLines,
      variables: vars as FormulaVariable[],
      validation: sympyValidation,
      lang,
    });
  }, [activeFormula, derivationLines, vars, sympyValidation, lang]);

  const validateWithSympy = useCallback(async () => {
    if (!activeFormula || derivationLines.length === 0) return;
    setSympyLoading(true);
    try {
      const result = await validateScratchpadStepsWithSympy(
        activeFormula.formula,
        derivationLines,
        vars as FormulaVariable[],
        numericResult,
      );
      setSympyValidation(result);
    } finally {
      setSympyLoading(false);
    }
  }, [activeFormula, derivationLines, vars, numericResult]);

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
      <div className="flex flex-col h-full rounded-2xl border border-border-subtle bg-surface-card overflow-hidden">
        <ScratchpadHeader
          panel={panel}
          setPanel={setPanel}
          lang={lang}
          onAddCustom={hasSource ? addCustom : undefined}
        />
        {panel === 'notes' ? (
          <ScratchpadNotesPanel
            scopeKey={scope}
            concept={concept}
            sectionLabel={sectionLabel}
            sectionIndex={sectionIndex}
            lang={lang}
            draft={notesDraft}
            onDraftChange={onNotesDraftChange}
            onEntrySaved={onEntrySaved}
            onConvertToFlashcard={onConvertToFlashcard}
            onConvertToAnnotation={onConvertToAnnotation}
            onAskAgent={onAskAgentAboutNote}
          />
        ) : (
          <WorkspaceEmptyState
        tool="scratchpad"
            message={emptyMessage ?? 'Upload notes to extract formulas from your material, or add a custom formula.'}
            hasSource={hasSource}
            onUpload={onUpload}
            secondaryLabel={hasSource ? (lang === 'el' ? 'Προσαρμοσμένος τύπος' : 'Add custom formula') : undefined}
            onSecondary={hasSource ? addCustom : undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border-subtle bg-surface-card overflow-hidden">
      <ScratchpadHeader
        panel={panel}
        setPanel={setPanel}
        lang={lang}
        onAddCustom={panel === 'formulas' ? addCustom : undefined}
      />

      {panel === 'notes' ? (
        <ScratchpadNotesPanel
          scopeKey={scope}
          concept={concept}
          sectionLabel={sectionLabel}
          sectionIndex={sectionIndex}
          lang={lang}
          draft={notesDraft}
          onDraftChange={onNotesDraftChange}
          onEntrySaved={onEntrySaved}
          onConvertToFlashcard={onConvertToFlashcard}
          onConvertToAnnotation={onConvertToAnnotation}
          onAskAgent={onAskAgentAboutNote}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-40 border-r border-border-subtle overflow-y-auto py-2 shrink-0">
            {formulas.map(f => (
              <button key={f.id} onClick={() => selectFormula(f.id)}
                className={cn('w-full text-left px-3 py-2 text-xs transition-all',
                  active === f.id ? 'bg-brand-600/15 text-brand-300 border-l-2 border-brand-500' : 'text-text-secondary hover:bg-surface-hover')}>
                {f.name}
              </button>
            ))}
          </div>

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
                {onAskAgent && activeFormula && (
                  <button
                    type="button"
                    data-testid="scratchpad-ask-agent"
                    onClick={() => onAskAgent(`${activeFormula.name}: ${activeFormula.formula}`)}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Agent
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
                <button onClick={() => {
                  setVars(activeFormula.variables.map(v => ({ ...v, value: '' })));
                  setSteps([]);
                  setDerivationDraft('');
                  setSympyValidation(null);
                  setNumericResult(null);
                }}
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

              <div
                className="rounded-xl border border-border-subtle bg-surface-primary/40 p-3 space-y-2"
                data-testid="scratchpad-sympy-panel"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold text-text-muted">
                    {lang === 'el' ? 'Βήματα παραγωγής (SymPy)' : 'Derivation steps (SymPy)'}
                  </p>
                  <button
                    type="button"
                    data-testid="scratchpad-validate-sympy"
                    disabled={sympyLoading || derivationLines.length === 0}
                    onClick={() => { void validateWithSympy(); }}
                    className="inline-flex items-center gap-1 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 px-2.5 py-1 text-[10px] font-medium text-accent-emerald hover:bg-accent-emerald/15 disabled:opacity-40"
                  >
                    {sympyLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <ShieldCheck className="w-3 h-3" />}
                    {lang === 'el' ? 'Επικύρωση' : 'Validate'}
                  </button>
                </div>
                {sympyChainReport && (
                  <ScratchpadSympyChainStrip report={sympyChainReport} lang={lang} />
                )}
                <textarea
                  data-testid="scratchpad-derivation-draft"
                  value={derivationDraft}
                  onChange={(e) => {
                    setDerivationDraft(e.target.value);
                    setSympyValidation(null);
                  }}
                  rows={4}
                  placeholder={lang === 'el'
                    ? 'Ένα βήμα ανά γραμμή — π.χ. m*x + b'
                    : 'One step per line — e.g. m*x + b'}
                  className="w-full rounded-lg border border-border-subtle bg-surface-input px-3 py-2 text-xs font-mono text-text-secondary placeholder:text-text-muted focus:border-brand-500/40 focus:outline-none"
                />
                {sympyValidation && (
                  <div className="space-y-1" data-testid="scratchpad-sympy-results">
                    <p className={cn(
                      'text-[10px] font-medium',
                      sympyValidation.ok ? 'text-accent-emerald' : 'text-accent-amber',
                    )}
                    >
                      {sympyValidation.engine === 'sympy'
                        ? (lang === 'el' ? 'SymPy' : 'SymPy')
                        : (lang === 'el' ? 'Αριθμητικό fallback' : 'Numeric fallback')}
                      {' · '}
                      {sympyValidation.ok
                        ? (lang === 'el' ? 'Έγκυρη αλυσίδα' : 'Valid chain')
                        : (lang === 'el' ? 'Χρειάζεται διόρθωση' : 'Needs fix')}
                    </p>
                    {sympyValidation.simplifiedTarget && (
                      <p className="text-[9px] text-text-muted font-mono truncate">
                        target: {sympyValidation.simplifiedTarget}
                      </p>
                    )}
                    {sympyValidation.error && (
                      <p className="text-[9px] text-accent-amber">{sympyValidation.error}</p>
                    )}
                    {sympyValidation.steps.filter((s) => s.status !== 'skipped').map((row) => {
                      const edge = sympyChainReport?.entries[row.index];
                      return (
                      <p
                        key={`sympy-row-${row.index}`}
                        className={cn(
                          'text-[10px] font-mono',
                          row.status === 'valid' ? 'text-accent-emerald' : 'text-accent-rose',
                        )}
                      >
                        {row.status === 'valid' ? '✓' : '✗'} {row.text}
                        {edge && edge.kind !== 'valid-chain' && (
                          <span className="ml-1 text-accent-amber" data-testid={`scratchpad-sympy-edge-${row.index}`}>
                            [{scratchpadSympyEdgeLabel(edge.kind, lang)}]
                          </span>
                        )}
                        {row.sympyForm ? ` → ${row.sympyForm}` : ''}
                        {row.message ? ` (${row.message})` : ''}
                      </p>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScratchpadHeader({
  panel,
  setPanel,
  lang,
  onAddCustom,
}: {
  panel: 'formulas' | 'notes';
  setPanel: (p: 'formulas' | 'notes') => void;
  lang: 'en' | 'el';
  onAddCustom?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-secondary/40 shrink-0 gap-2">
      <div className="flex gap-1">
        <button
          type="button"
          data-testid="scratchpad-tab-formulas"
          onClick={() => setPanel('formulas')}
          className={cn(
            'px-2 py-1 rounded-md text-[10px] font-medium inline-flex items-center gap-1',
            panel === 'formulas' ? 'bg-brand-600/20 text-brand-600' : 'text-text-muted',
          )}
        >
          <Calculator className="w-3 h-3" />
          {lang === 'el' ? 'Τύποι' : 'Formulas'}
        </button>
        <button
          type="button"
          data-testid="scratchpad-tab-notes"
          onClick={() => setPanel('notes')}
          className={cn(
            'px-2 py-1 rounded-md text-[10px] font-medium inline-flex items-center gap-1',
            panel === 'notes' ? 'bg-brand-600/20 text-brand-600' : 'text-text-muted',
          )}
        >
          <PenSquare className="w-3 h-3" />
          {lang === 'el' ? 'Σκέψη' : 'Thinking'}
        </button>
      </div>
      {onAddCustom && panel === 'formulas' && (
        <button onClick={onAddCustom} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-muted hover:text-text-secondary bg-surface-hover">
          <Plus className="w-3 h-3" /> {lang === 'el' ? 'Προσθήκη' : 'Add Custom'}
        </button>
      )}
    </div>
  );
}
