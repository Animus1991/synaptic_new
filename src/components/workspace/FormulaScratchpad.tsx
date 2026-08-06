import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emphasizedTransition, fadeUp } from '../../lib/motion';
import { Plus, RotateCcw, Copy, Check, PenSquare, LineChart, Sparkles, ShieldCheck, Loader2, Calculator, X, Pencil } from '@/lib/lucide-shim';
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
import { ScratchpadNotesPanel } from './ScratchpadNotesPanel';
import type { ScratchpadEntry, ScratchpadMode } from '../../lib/scratchpadEntryStore';
import { validateScratchpadStepsWithSympy, simplifyExpressionWithSympy } from '../../lib/sympyScratchpadRunner';
import type { ScratchpadSympyValidationResult } from '../../lib/scratchpadSympyValidation';
import { auditScratchpadSympyChain, scratchpadSympyEdgeLabel } from '../../lib/scratchpadSympyChainEdgeCasesQA';
import { ScratchpadSympyChainStrip } from './ScratchpadSympyChainStrip';
import { checkVariableUnits, type UnitCheckResult } from '../../lib/unitDimensionChecker';
import { useI18n } from '../../lib/i18n';
import { PanelOverflowMenu } from './PanelOverflowMenu';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { useWorkspaceEmptyActions } from './WorkspaceEmptyActionsContext';
import { PrimaryCTA, SecondaryCTA } from '../ui/primitives';

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
  /** OPT-AI-B — next-step hint without full solution. */
  onStepHint?: (text: string) => Promise<string> | string;
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

const SCRATCHPAD_SHELL =
  'ux-tier-b-tool ux-tier-b-scratchpad ux-tier-b-shell workspace-glass-panel flex flex-col h-full overflow-hidden';

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
export function FormulaScratchpad({
  noteFormulas = [],
  emptyMessage,
  hasSource = false,
  onUpload,
  scopeKey,
  onSendToWhiteboard,
  onAskAgent,
  onStepHint,
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
  const { t } = useI18n();
  const scope = scopeKey ?? '__global';
  const [panel, setPanel] = useState<'formulas' | 'notes'>('formulas');
  const [stepHint, setStepHint] = useState<string | null>(null);
  const [stepHintLoading, setStepHintLoading] = useState(false);
  const [editingFormula, setEditingFormula] = useState<string | null>(null);
  const [formulaNameDraft, setFormulaNameDraft] = useState('');
  const [formulaExprDraft, setFormulaExprDraft] = useState('');
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
  const [simplifiedExpr, setSimplifiedExpr] = useState<string | null>(null);
  const [simplifyLoading, setSimplifyLoading] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const emptyActions = useWorkspaceEmptyActions('scratchpad');

  const activeFormula = formulas.find((f) => f.id === active);

  const unitCheck: UnitCheckResult = useMemo(
    () => checkVariableUnits(vars, activeFormula?.formula),
    [vars, activeFormula?.formula],
  );

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

  const simplifyWithSympy = useCallback(async () => {
    if (!activeFormula) return;
    setSimplifyLoading(true);
    setSimplifiedExpr(null);
    try {
      const rhs = activeFormula.formula.includes('=')
        ? activeFormula.formula.split('=').slice(1).join('=').trim()
        : activeFormula.formula;
      const result = await simplifyExpressionWithSympy(rhs);
      if (result.ok && result.simplified) setSimplifiedExpr(result.simplified);
      else setSimplifiedExpr(result.error ?? 'Simplify failed');
    } finally {
      setSimplifyLoading(false);
    }
  }, [activeFormula]);

  const copyResult = () => {
    navigator.clipboard.writeText(steps.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addCustom = (formulaExpr?: string) => {
    const formula = (formulaExpr?.trim() || 'y = m*x + b');
    const id = `f-${Date.now()}`;
    const variables = inferVariablesFromFormula(formula);
    const nextVars = variables.length > 0 ? variables : [{ symbol: 'x', value: '', unit: '' }];
    const f: SavedFormula = {
      id,
      name: t('scratchCustomName'),
      formula,
      variables: nextVars,
    };
    /* Set active inline — selectFormula would miss the new row (stale formulas closure). */
    setFormulas((prev) => [...prev, f]);
    setActive(id);
    setVars([...nextVars]);
    setSteps([]);
    setDerivationDraft('');
    setSympyValidation(null);
    setNumericResult(null);
    setComposerDraft('');
  };

  const startEditFormula = (id: string) => {
    const f = formulas.find((x) => x.id === id);
    if (!f) return;
    setEditingFormula(id);
    setFormulaNameDraft(f.name);
    setFormulaExprDraft(f.formula);
  };

  const saveFormulaEdit = () => {
    if (!editingFormula) return;
    const trimExpr = formulaExprDraft.trim();
    if (!trimExpr) { setEditingFormula(null); return; }
    const newVars = inferVariablesFromFormula(trimExpr);
    setFormulas((prev) =>
      prev.map((f) =>
        f.id === editingFormula
          ? { ...f, name: formulaNameDraft.trim() || f.name, formula: trimExpr, variables: newVars }
          : f,
      ),
    );
    if (editingFormula === active) {
      setVars(newVars.map((v) => ({ ...v, value: '' })));
      setSteps([]);
      setDerivationDraft('');
      setSympyValidation(null);
      setNumericResult(null);
    }
    setEditingFormula(null);
  };

  const deleteFormula = (id: string) => {
    setFormulas((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (active === id) {
        if (next.length > 0) {
          const first = next[0];
          setActive(first.id);
          setVars([...first.variables]);
          setSteps([]);
          setDerivationDraft('');
          setSympyValidation(null);
          setNumericResult(null);
        } else {
          setActive('');
          setVars([{ symbol: 'x', value: '', unit: '' }]);
          setSteps([]);
        }
      }
      return next;
    });
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
      <div className={SCRATCHPAD_SHELL} data-testid="scratchpad-root" data-bleed="full">
        {/* Wave SP2 — no +Add on empty (composer is the primary entry) */}
        <ScratchpadHeader panel={panel} setPanel={setPanel} />
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
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            data-testid="scratchpad-empty-composer"
            data-bleed="full"
          >
            {/* Wave SP4 — full panel width composer (no centered narrow column) */}
            <div className="flex w-full max-w-none flex-col gap-3 px-3 pb-6 pt-3 sm:px-4 sm:pt-4">
              <div className="space-y-1 text-left">
                <h3 className="text-base font-semibold leading-snug text-text-primary sm:text-lg">
                  {t('scratchComposerLabel')}
                </h3>
                <p className="type-caption leading-relaxed text-text-secondary">
                  {concept
                    ? t('scratchEmptyHint').replace('{topic}', concept)
                    : t('scratchEmptyHintGeneric')}
                </p>
              </div>

              <form
                className="space-y-2 rounded-xl border border-border-subtle bg-surface-secondary/40 p-3 sm:p-4"
                data-testid="scratchpad-composer-surface"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustom(composerDraft);
                }}
              >
                <label className="sr-only" htmlFor="scratchpad-composer-input">
                  {t('scratchComposerLabel')}
                </label>
                <input
                  id="scratchpad-composer-input"
                  data-testid="scratchpad-composer-input"
                  type="text"
                  value={composerDraft}
                  onChange={(e) => setComposerDraft(e.target.value)}
                  placeholder={t('scratchComposerPlaceholder')}
                  className="w-full min-h-11 rounded-lg border border-border-subtle bg-surface-card px-3 py-2.5 font-mono type-body text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <PrimaryCTA
                  type="submit"
                  size="md"
                  data-testid="scratchpad-composer-start"
                  className="ws-touch-floor w-full min-h-11 rounded-lg"
                >
                  {t('scratchComposerStart')}
                </PrimaryCTA>
              </form>

              {(emptyActions.length > 0 || (!hasSource && onUpload)) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {!hasSource && onUpload && (
                    <SecondaryCTA size="sm" onClick={onUpload} data-testid="workspace-empty-upload">
                      {t('uploadMaterial')}
                    </SecondaryCTA>
                  )}
                  {emptyActions.map((action) => (
                    <SecondaryCTA
                      key={`${action.id}-${action.label}`}
                      size="sm"
                      onClick={action.onClick}
                      data-testid={`workspace-empty-${action.id}`}
                    >
                      {action.label}
                    </SecondaryCTA>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={SCRATCHPAD_SHELL} data-testid="scratchpad-root" data-bleed="full">
      <ScratchpadHeader
        panel={panel}
        setPanel={setPanel}
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
        <div
          className="flex min-h-0 flex-1 overflow-hidden"
          data-testid="scratchpad-workspace"
          data-layout="work-first"
        >
          <aside
            className="ux-tier-b-sidebar flex w-36 shrink-0 flex-col overflow-hidden border-r border-border-subtle sm:w-44"
            data-testid="scratchpad-formula-list"
          >
            <p
              className="shrink-0 border-b border-border-subtle px-2.5 py-2 type-caption font-medium text-text-secondary"
              data-testid="scratchpad-formula-list-label"
            >
              {t('scratchYourFormulas')}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {formulas.map((f) => (
                <div key={f.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selectFormula(f.id)}
                    className={cn(
                      'w-full truncate py-2 pl-2.5 pr-7 text-left type-caption transition-colors',
                      active === f.id
                        ? 'border-l-2 border-l-brand-500 bg-surface-secondary font-medium text-text-primary'
                        : 'border-l-2 border-l-transparent text-text-secondary hover:bg-surface-hover',
                    )}
                    title={f.name}
                  >
                    {f.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteFormula(f.id); }}
                    className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-accent-rose/10 hover:text-accent-rose group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t('close')}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {activeFormula && (
            <>
              {editingFormula === activeFormula.id ? (
                <div className="space-y-2 border-b border-border-subtle px-3 py-3 sm:px-4">
                  <p className="type-caption font-semibold text-text-secondary">{t('scratchEditFormula')}</p>
                  <input
                    value={formulaNameDraft}
                    onChange={(e) => setFormulaNameDraft(e.target.value)}
                    className="w-full min-h-9 rounded-lg border border-border-subtle bg-surface-input px-3 py-2 type-body text-text-primary focus:border-border-default focus:outline-none"
                    placeholder={activeFormula.name}
                    aria-label={t('scratchEditFormula')}
                  />
                  <input
                    value={formulaExprDraft}
                    onChange={(e) => setFormulaExprDraft(e.target.value)}
                    className="w-full min-h-9 rounded-lg border border-border-subtle bg-surface-input px-3 py-2 type-body font-mono text-text-primary focus:border-border-default focus:outline-none"
                    placeholder="e.g. y = m*x + b"
                    aria-label={t('scratchEditFormula')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveFormulaEdit();
                      if (e.key === 'Escape') setEditingFormula(null);
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingFormula(null)}
                      className="px-3 py-1.5 type-caption text-text-muted hover:text-text-secondary"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={saveFormulaEdit}
                      disabled={!formulaExprDraft.trim()}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 type-caption font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {t('save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-b border-border-subtle px-3 py-3 sm:px-4"
                  data-testid="scratchpad-formula-hero"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="min-w-0 text-base font-semibold leading-snug text-text-primary sm:text-lg">
                      {activeFormula.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => startEditFormula(activeFormula.id)}
                      className="ws-touch-floor inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      aria-label={t('scratchEditFormula')}
                      title={t('scratchEditFormula')}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="w-full rounded-xl bg-surface-secondary/50 px-4 py-4 text-left">
                    <FormulaLatexPreview formula={activeFormula.formula} />
                  </div>
                  <p className="mt-1.5 font-mono type-caption text-text-muted">{activeFormula.formula}</p>
                </div>
              )}

              <div className="space-y-2.5 px-3 py-3 sm:px-4" data-testid="scratchpad-variables">
                <p className="type-caption font-medium text-text-secondary">{t('scratchVariables')}</p>
                {vars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold text-text-primary">{v.symbol}</span>
                    <span className="type-caption text-text-muted">=</span>
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => updateVar(i, e.target.value)}
                      placeholder={t('scratchVariableValue')}
                      className="min-h-10 flex-1 rounded-lg border border-border-subtle bg-surface-input px-3 py-2 type-body font-mono text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
                    />
                    {v.unit ? <span className="w-10 type-caption text-text-muted">{v.unit}</span> : null}
                  </div>
                ))}
                {!unitCheck.ok && (
                  <div className="space-y-0.5" data-testid="scratchpad-unit-check">
                    {unitCheck.issues.map((issue, i) => (
                      <p key={`${issue.symbol}-${i}`} className="type-caption text-accent-amber">
                        {issue.symbol}: {issue.message}
                      </p>
                    ))}
                  </div>
                )}
                {unitCheck.ok && vars.some((v) => v.unit.trim()) && (
                  <p
                    className="type-caption rounded-lg border border-border-subtle bg-surface-secondary/50 px-2 py-1 text-text-secondary"
                    data-testid="scratchpad-unit-check-ok"
                  >
                    {t('scratchUnitsOk')}
                  </p>
                )}
              </div>

              <div
                className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-3 pb-3 sm:px-4"
                data-testid="scratchpad-action-bar"
              >
                <PrimaryCTA
                  type="button"
                  size="md"
                  onClick={compute}
                  data-testid="scratchpad-compute"
                  className="ws-touch-floor min-h-11 flex-1 rounded-lg sm:flex-none sm:min-w-[10rem]"
                >
                  {t('scratchComputeSteps')}
                </PrimaryCTA>
                {plotSpec && (
                  <button
                    type="button"
                    data-testid="scratchpad-graph-plot"
                    onClick={() => setShowGraph((v) => !v)}
                    className={cn(
                      'ws-touch-floor inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-2.5 type-caption font-medium',
                      showGraph
                        ? 'border-border-default bg-surface-secondary text-text-primary'
                        : 'border-border-subtle text-text-secondary hover:border-border-default',
                    )}
                    aria-pressed={showGraph}
                    aria-label={t('scratchPlot')}
                  >
                    <LineChart className="h-3.5 w-3.5" aria-hidden />
                    <span className="hidden sm:inline">{t('scratchPlot')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setVars(activeFormula.variables.map((v) => ({ ...v, value: '' })));
                    setSteps([]);
                    setDerivationDraft('');
                    setSympyValidation(null);
                    setNumericResult(null);
                  }}
                  className="ws-touch-floor inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  aria-label={t('reset')}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                </button>
                {(onAskAgent || onStepHint || onSendToWhiteboard) && (
                  <PanelOverflowMenu
                    ariaLabel={t('wsMore')}
                    data-testid="scratchpad-overflow"
                    triggerTestId="scratchpad-overflow-trigger"
                    summaryClassName="ws-touch-floor inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover"
                  >
                    {onAskAgent && activeFormula && (
                      <button
                        type="button"
                        data-testid="scratchpad-ask-agent"
                        onClick={() => onAskAgent(`${activeFormula.name}: ${activeFormula.formula}`)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        {t('scratchAskAgent')}
                      </button>
                    )}
                    {onStepHint && activeFormula && (
                      <button
                        type="button"
                        data-testid="scratchpad-step-hint"
                        disabled={stepHintLoading}
                        onClick={() => {
                          setStepHintLoading(true);
                          void Promise.resolve(
                            onStepHint(`${activeFormula.name}: ${activeFormula.formula}\n${derivationDraft}`),
                          ).then((hint) => {
                            setStepHint(hint);
                            setStepHintLoading(false);
                          }).catch(() => setStepHintLoading(false));
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-60"
                      >
                        {stepHintLoading ? t('scratchStepHintLoading') : t('scratchStepHint')}
                      </button>
                    )}
                    {onSendToWhiteboard && (
                      <button
                        type="button"
                        data-testid="scratchpad-send-whiteboard"
                        onClick={sendToWhiteboard}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      >
                        <PenSquare className="h-3.5 w-3.5" aria-hidden />
                        {t('scratchOpenWhiteboard')}
                      </button>
                    )}
                  </PanelOverflowMenu>
                )}
              </div>

              {stepHint && (
                <p
                  className="mx-3 mt-2 rounded-lg border border-border-subtle bg-surface-secondary/50 px-2.5 py-1.5 type-caption text-text-primary sm:mx-4"
                  data-testid="scratchpad-step-hint-text"
                >
                  {stepHint}
                </p>
              )}

              {showGraph && plotPath && plotSpec && (
                <div
                  className="mx-3 mt-2 rounded-xl border border-border-subtle bg-surface-secondary/40 p-3 sm:mx-4"
                  data-testid="scratchpad-graph-panel"
                >
                  <p className="mb-2 type-caption font-medium text-text-secondary">
                    {plotSpec.dependent} = f({plotSpec.independent})
                  </p>
                  <svg viewBox="0 0 280 140" className="h-36 w-full rounded-lg bg-surface-card/60">
                    <path d={plotPath} fill="none" stroke="var(--palette-cyan, #67e8f9)" strokeWidth="2" />
                  </svg>
                </div>
              )}

              <AnimatePresence>
                {steps.length > 0 && (
                  <motion.div
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={emphasizedTransition}
                    className="mx-3 mt-2 space-y-2 rounded-xl border border-border-subtle bg-surface-secondary/40 p-3 sm:mx-4"
                    data-testid="scratchpad-solution"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="type-caption font-medium text-text-secondary">{t('scratchSolution')}</span>
                      <button
                        type="button"
                        onClick={copyResult}
                        className="inline-flex items-center gap-1 type-caption text-text-muted hover:text-text-secondary"
                      >
                        {copied
                          ? <><Check className="h-3 w-3 text-accent-emerald" aria-hidden /> {t('copied')}</>
                          : <><Copy className="h-3 w-3" aria-hidden /> {t('copy')}</>}
                      </button>
                    </div>
                    {steps.map((s, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.12 }}
                        className={cn(
                          'font-mono type-meta',
                          s.startsWith('✓') ? 'font-semibold text-text-primary' : s.startsWith('⚠') ? 'text-accent-amber' : 'text-text-secondary',
                        )}
                      >
                        {s}
                      </motion.p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <CollapsibleChromeSection
                title={t('scratchDerivationSteps')}
                alwaysCollapse
                data-testid="scratchpad-steps-chrome"
                className="mt-2 border-t border-border-subtle"
              >
                <div
                  className="space-y-2 px-3 pb-3 pt-1 sm:px-4"
                  data-testid="scratchpad-sympy-panel"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="scratchpad-simplify-sympy"
                      disabled={simplifyLoading || !activeFormula}
                      onClick={() => { void simplifyWithSympy(); }}
                      className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle bg-surface-secondary px-2.5 type-caption font-medium text-text-secondary hover:border-border-default disabled:opacity-40"
                    >
                      {simplifyLoading
                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        : <Sparkles className="h-3 w-3" aria-hidden />}
                      {t('scratchSimplify')}
                    </button>
                    <button
                      type="button"
                      data-testid="scratchpad-validate-sympy"
                      disabled={sympyLoading || derivationLines.length === 0}
                      onClick={() => { void validateWithSympy(); }}
                      className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle bg-surface-secondary px-2.5 type-caption font-medium text-text-primary hover:border-border-default disabled:opacity-40"
                    >
                      {sympyLoading
                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        : <ShieldCheck className="h-3 w-3" aria-hidden />}
                      {t('scratchValidate')}
                    </button>
                  </div>
                  {simplifiedExpr && (
                    <p className="font-mono type-caption text-text-secondary" data-testid="scratchpad-simplified-expr">
                      {simplifiedExpr}
                    </p>
                  )}
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
                    placeholder={t('scratchDerivationPlaceholder')}
                    className="w-full rounded-lg border border-border-subtle bg-surface-input px-3 py-2 font-mono type-caption text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
                  />
                  {sympyValidation && (
                    <div className="space-y-1" data-testid="scratchpad-sympy-results">
                      <p
                        className={cn(
                          'type-caption font-medium',
                          sympyValidation.ok ? 'text-text-primary' : 'text-accent-amber',
                        )}
                      >
                        {sympyValidation.engine === 'sympy'
                          ? t('scratchEngineSympy')
                          : t('scratchEngineNumericFallback')}
                        {' · '}
                        {sympyValidation.ok
                          ? t('scratchValidChain')
                          : t('scratchNeedsFix')}
                      </p>
                      {sympyValidation.simplifiedTarget && (
                        <p className="truncate font-mono type-caption text-text-muted">
                          {sympyValidation.simplifiedTarget}
                        </p>
                      )}
                      {sympyValidation.error && (
                        <p className="type-caption text-accent-amber">{sympyValidation.error}</p>
                      )}
                      {sympyValidation.steps.filter((s) => s.status !== 'skipped').map((row) => {
                        const edge = sympyChainReport?.entries[row.index];
                        return (
                          <p
                            key={`sympy-row-${row.index}`}
                            className={cn(
                              'font-mono type-caption',
                              row.status === 'valid' ? 'text-text-primary' : 'text-accent-rose',
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
              </CollapsibleChromeSection>
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
  onAddCustom,
}: {
  panel: 'formulas' | 'notes';
  setPanel: (p: 'formulas' | 'notes') => void;
  onAddCustom?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="ux-tier-b-toolbar flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-surface-secondary/40 px-3 py-1.5"
      data-testid="scratchpad-main-tabs"
    >
      <div className="flex gap-1" role="tablist" aria-label={t('toolScratchpad')}>
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'formulas'}
          data-testid="scratchpad-tab-formulas"
          onClick={() => setPanel('formulas')}
          className={cn(
            'ws-touch-floor inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 type-caption font-medium sm:px-3',
            panel === 'formulas'
              ? 'border border-border-subtle bg-surface-secondary text-text-primary'
              : 'text-text-secondary hover:bg-surface-hover',
          )}
        >
          <Calculator className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('scratchFormulasTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'notes'}
          data-testid="scratchpad-tab-notes"
          onClick={() => setPanel('notes')}
          className={cn(
            'ws-touch-floor inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 type-caption font-medium sm:px-3',
            panel === 'notes'
              ? 'border border-border-subtle bg-surface-secondary text-text-primary'
              : 'text-text-secondary hover:bg-surface-hover',
          )}
        >
          <PenSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('scratchThinkingTab')}
        </button>
      </div>
      {onAddCustom && panel === 'formulas' && (
        <button
          type="button"
          onClick={onAddCustom}
          data-testid="scratchpad-add-custom"
          className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle bg-surface-secondary px-2 type-caption font-medium text-text-secondary hover:border-border-default hover:text-text-primary sm:px-2.5"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{t('scratchAddCustom')}</span>
        </button>
      )}
    </div>
  );
}
