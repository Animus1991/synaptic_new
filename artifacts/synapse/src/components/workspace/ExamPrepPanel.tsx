import { useMemo, useState } from 'react';
import { Play, CaretLeft, CaretRight, Code } from '@phosphor-icons/react';
import { EXERCISE_ARCHETYPES, buildArchetypePromptSuffix } from '../../lib/examPrep/exerciseArchetypes';
import { METHODOLOGY_PATTERNS } from '../../lib/examPrep/methodologyPatterns';
import { ALGORITHM_SCENARIOS, clampStepIndex } from '../../lib/examPrep/algorithmStepperModel';
import { GLOSSA_STARTER, runGlossa } from '../../lib/examPrep/glossaInterpreter';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type ExamPrepTab = 'patterns' | 'algorithms' | 'glossa' | 'exercises';

export function ExamPrepPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<ExamPrepTab>('patterns');

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="exam-prep-panel">
      <div className="shrink-0 flex gap-1 border-b border-border-subtle px-4 py-2 overflow-x-auto">
        {(['patterns', 'algorithms', 'glossa', 'exercises'] as const).map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`exam-prep-tab-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors',
              tab === id
                ? 'bg-brand-600/15 text-brand-800'
                : 'text-text-secondary hover:bg-surface-hover',
            )}
          >
            {t(`examPrepTab${id === 'patterns' ? 'Patterns' : id === 'algorithms' ? 'Algorithms' : id === 'glossa' ? 'Glossa' : 'Exercises'}` as never)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'patterns' && <PatternCards />}
        {tab === 'algorithms' && <AlgorithmStepper />}
        {tab === 'glossa' && <GlossaSandbox />}
        {tab === 'exercises' && <ExerciseArchetypes />}
      </div>
    </div>
  );
}

function PatternCards() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(METHODOLOGY_PATTERNS[0]?.id);

  const pattern = METHODOLOGY_PATTERNS.find((p) => p.id === selected);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ul className="space-y-2">
        {METHODOLOGY_PATTERNS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setSelected(p.id)}
              data-testid={`pattern-card-${p.id}`}
              className={cn(
                'w-full text-left rounded-xl border px-3 py-2 transition-colors',
                selected === p.id
                  ? 'border-brand-500/40 bg-brand-600/10'
                  : 'border-border-subtle hover:bg-surface-hover',
              )}
            >
              <p className="text-sm font-medium">{t(p.titleKey as never)}</p>
              <p className="text-[10px] text-text-muted">{p.tags.join(' · ')}</p>
            </button>
          </li>
        ))}
      </ul>
      {pattern && (
        <div className="rounded-xl border border-border-subtle bg-surface-card/40 p-4">
          <p className="text-sm font-semibold mb-2">{t(pattern.titleKey as never)}</p>
          <p className="text-xs text-text-secondary mb-4">{t(pattern.summaryKey as never)}</p>
          <pre className="text-[10px] font-mono whitespace-pre-wrap bg-surface-primary rounded-lg p-3 border border-border-subtle">
            {t(pattern.templateKey as never)}
          </pre>
        </div>
      )}
    </div>
  );
}

function AlgorithmStepper() {
  const { t } = useI18n();
  const [scenarioId, setScenarioId] = useState(ALGORITHM_SCENARIOS[0]?.id ?? '');
  const [stepIdx, setStepIdx] = useState(0);

  const scenario = ALGORITHM_SCENARIOS.find((s) => s.id === scenarioId);
  const step = scenario?.steps[clampStepIndex(scenario, stepIdx)];

  return (
    <div className="space-y-4">
      <select
        value={scenarioId}
        onChange={(e) => { setScenarioId(e.target.value); setStepIdx(0); }}
        className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-xs"
        data-testid="algorithm-scenario-select"
      >
        {ALGORITHM_SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>{t(s.titleKey as never)}</option>
        ))}
      </select>

      {scenario && step && (
        <>
          <p className="text-sm font-medium">{t(step.labelKey as never)}</p>

          {scenario.kind === 'array-scan' && scenario.initialArray && (
            <div className="flex gap-2 flex-wrap">
              {scenario.initialArray.map((val, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-mono',
                    step.highlightIndices?.includes(i)
                      ? 'border-brand-500 bg-brand-600/20'
                      : 'border-border-subtle',
                  )}
                >
                  {val}
                </div>
              ))}
            </div>
          )}

          {step.stackContents && (
            <div className="flex flex-col-reverse items-start gap-1">
              {step.stackContents.map((item, i) => (
                <div key={i} className="px-4 py-1 rounded border border-border-subtle bg-surface-card text-xs font-mono">
                  {item}
                </div>
              ))}
              <p className="text-[10px] text-text-muted">STACK</p>
            </div>
          )}

          {step.queueContents && (
            <div className="flex items-center gap-1 flex-wrap">
              <p className="text-[10px] text-text-muted w-full">QUEUE</p>
              {step.queueContents.map((item, i) => (
                <div key={i} className="px-3 py-1 rounded border border-border-subtle bg-surface-card text-xs font-mono">
                  {item}
                </div>
              ))}
            </div>
          )}

          {step.variables && (
            <div className="flex gap-3 text-[10px] font-mono text-text-secondary">
              {Object.entries(step.variables).map(([k, v]) => (
                <span key={k}>{k}={String(v)}</span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={stepIdx <= 0}
              onClick={() => setStepIdx((i) => i - 1)}
              className="p-2 rounded-lg border border-border-subtle disabled:opacity-40"
              data-testid="algo-step-prev"
            >
              <CaretLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!scenario || stepIdx >= scenario.steps.length - 1}
              onClick={() => setStepIdx((i) => i + 1)}
              className="p-2 rounded-lg border border-border-subtle disabled:opacity-40"
              data-testid="algo-step-next"
            >
              <CaretRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-muted self-center">
              {stepIdx + 1}/{scenario.steps.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function GlossaSandbox() {
  const { t } = useI18n();
  const [source, setSource] = useState(GLOSSA_STARTER);
  const [result, setResult] = useState<ReturnType<typeof runGlossa> | null>(null);

  const run = () => setResult(runGlossa(source));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Code className="w-4 h-4" />
        {t('examPrepGlossaTitle')}
      </div>
      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={10}
        className="w-full rounded-xl border border-border-subtle bg-surface-card p-3 text-xs font-mono"
        data-testid="glossa-source"
      />
      <button
        type="button"
        onClick={run}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-medium"
        data-testid="glossa-run"
      >
        <Play className="w-3 h-3" />
        {t('examPrepGlossaRun')}
      </button>
      {result && (
        <div className="rounded-xl border border-border-subtle p-3 text-xs" data-testid="glossa-output">
          {result.ok ? (
            <>
              <p className="font-medium text-accent-emerald mb-1">{t('examPrepGlossaOutput')}</p>
              <pre className="font-mono whitespace-pre-wrap">{result.output.join('\n') || '(empty)'}</pre>
              {Object.keys(result.variables).length > 0 && (
                <p className="mt-2 text-text-muted">
                  vars: {JSON.stringify(result.variables)}
                </p>
              )}
            </>
          ) : (
            <p className="text-accent-rose">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseArchetypes() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(EXERCISE_ARCHETYPES[0]?.id);
  const [copied, setCopied] = useState(false);

  const archetype = useMemo(
    () => EXERCISE_ARCHETYPES.find((a) => a.id === selected),
    [selected],
  );

  const copyArchetypeHint = async () => {
    if (!archetype) return;
    const suffix = buildArchetypePromptSuffix(archetype);
    try {
      await navigator.clipboard.writeText(suffix);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EXERCISE_ARCHETYPES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelected(a.id)}
            data-testid={`archetype-${a.id}`}
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-medium border',
              selected === a.id
                ? 'border-brand-500/40 bg-brand-600/10 text-brand-800'
                : 'border-border-subtle text-text-secondary',
            )}
          >
            {t(a.labelKey as never)}
          </button>
        ))}
      </div>

      {archetype && (
        <div className="rounded-xl border border-border-subtle bg-surface-card/40 p-4 space-y-3">
          <p className="text-sm font-semibold">{t(archetype.labelKey as never)}</p>
          <p className="text-xs text-text-secondary">{t(archetype.descriptionKey as never)}</p>
          <div>
            <p className="text-[10px] font-medium text-text-muted mb-1">{t('examPrepRubricLabel')}</p>
            <ul className="list-disc list-inside text-xs text-text-secondary space-y-0.5">
              {archetype.rubricKeys.map((k) => (
                <li key={k}>{t(k as never)}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-medium text-text-muted mb-1">{t('examPrepStepsLabel')}</p>
            <ol className="list-decimal list-inside text-xs text-text-secondary space-y-0.5">
              {archetype.solutionStepKeys.map((k) => (
                <li key={k}>{t(k as never)}</li>
              ))}
            </ol>
          </div>
          <button
            type="button"
            onClick={copyArchetypeHint}
            data-testid="archetype-copy-hint"
            className="rounded-lg border border-brand-500/30 bg-brand-600/10 px-3 py-1.5 text-[10px] font-medium text-brand-800 hover:opacity-90"
          >
            {copied ? t('examPrepArchetypeCopied') : t('examPrepCopyArchetypeHint')}
          </button>
        </div>
      )}
    </div>
  );
}
