/** B11 prod stretch — rolling median tracker for CI gate readiness. */

export type B11StretchSample = {
  elapsedMs: number;
  recordedAt: string;
  withinStretch: boolean;
  runId?: string;
};

export type B11StretchHistory = {
  version: 1;
  stretchTargetMs: number;
  windowSize: number;
  samples: B11StretchSample[];
};

export type B11StretchGateReadiness = {
  ready: boolean;
  medianMs: number | null;
  sampleCount: number;
  requiredSamples: number;
  stretchTargetMs: number;
  message: string;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export function emptyHistory(stretchTargetMs = 1_200, windowSize = 10): B11StretchHistory {
  return { version: 1, stretchTargetMs, windowSize, samples: [] };
}

export function appendStretchSample(
  history: B11StretchHistory,
  sample: Omit<B11StretchSample, 'withinStretch'> & { withinStretch?: boolean },
): B11StretchHistory {
  const withinStretch = sample.withinStretch ?? sample.elapsedMs <= history.stretchTargetMs;
  const next: B11StretchSample = {
    elapsedMs: sample.elapsedMs,
    recordedAt: sample.recordedAt,
    withinStretch,
    runId: sample.runId,
  };
  const samples = [...history.samples, next].slice(-history.windowSize);
  return { ...history, samples };
}

export function evaluateStretchGateReadiness(
  history: B11StretchHistory,
  requiredSamples = history.windowSize,
): B11StretchGateReadiness {
  const { stretchTargetMs, samples } = history;
  const sampleCount = samples.length;
  const medianMs = median(samples.map((s) => s.elapsedMs));

  if (sampleCount < requiredSamples) {
    return {
      ready: false,
      medianMs,
      sampleCount,
      requiredSamples,
      stretchTargetMs,
      message: `Collecting samples (${sampleCount}/${requiredSamples}); median ${medianMs ?? '—'}ms vs stretch ≤${stretchTargetMs}ms`,
    };
  }

  if (medianMs == null || medianMs > stretchTargetMs) {
    return {
      ready: false,
      medianMs,
      sampleCount,
      requiredSamples,
      stretchTargetMs,
      message: `Median ${medianMs}ms over last ${sampleCount} runs — still above stretch ≤${stretchTargetMs}ms`,
    };
  }

  return {
    ready: true,
    medianMs,
    sampleCount,
    requiredSamples,
    stretchTargetMs,
    message: `Median ${medianMs}ms over last ${sampleCount} runs — enable PROD_STRETCH_GATE=1 in ci.yml`,
  };
}

export function formatStretchSummary(history: B11StretchHistory, readiness: B11StretchGateReadiness): string {
  const rows = history.samples
    .slice()
    .reverse()
    .map((s) => `| ${s.elapsedMs} | ${s.withinStretch ? 'yes' : 'no'} | ${s.recordedAt}${s.runId ? ` (${s.runId})` : ''} |`)
    .join('\n');

  return [
    '## B11 prod stretch tracker',
    '',
    readiness.message,
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| This run | ${history.samples.at(-1)?.elapsedMs ?? '—'}ms |`,
    `| Rolling median (${history.samples.length}/${readiness.requiredSamples}) | ${readiness.medianMs ?? '—'}ms |`,
    `| Stretch target | ≤${history.stretchTargetMs}ms |`,
    `| Gate ready | ${readiness.ready ? '**yes** — uncomment `PROD_STRETCH_GATE` in `.github/workflows/ci.yml`' : 'no'} |`,
    '',
    '### Recent samples (newest first)',
    '',
    '| elapsedMs | within stretch | recordedAt |',
    '| --- | --- | --- |',
    rows || '| — | — | — |',
    '',
  ].join('\n');
}
