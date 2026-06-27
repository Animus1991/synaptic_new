#!/usr/bin/env node
/**
 * CI post-step — append prod perf sample, compute rolling median, write job summary.
 *
 * Env:
 *   B11_STRETCH_SAMPLE_PATH — default test-results/b11-prod-stretch.json
 *   B11_STRETCH_HISTORY_PATH — default .github/perf/b11-prod-stretch-history.json
 *   B11_STRETCH_WINDOW — default 10
 *   GITHUB_STEP_SUMMARY — GitHub Actions job summary file
 *   GITHUB_OUTPUT — set stretch_gate_ready=true when median ≤ target for N runs
 */

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendStretchSample,
  emptyHistory,
  evaluateStretchGateReadiness,
  formatStretchSummary,
  type B11StretchHistory,
} from '../src/lib/b11ProdStretchTracker';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const samplePath = resolve(root, process.env.B11_STRETCH_SAMPLE_PATH ?? 'test-results/b11-prod-stretch.json');
const historyPath = resolve(root, process.env.B11_STRETCH_HISTORY_PATH ?? '.github/perf/b11-prod-stretch-history.json');
const windowSize = Number(process.env.B11_STRETCH_WINDOW ?? 10);

function readSample(): { elapsedMs: number; withinStretch?: boolean; recordedAt?: string } {
  const raw = readFileSync(samplePath, 'utf8');
  const parsed = JSON.parse(raw) as { elapsedMs?: unknown };
  if (typeof parsed.elapsedMs !== 'number' || !Number.isFinite(parsed.elapsedMs)) {
    throw new Error(`Invalid sample at ${samplePath}`);
  }
  return parsed as { elapsedMs: number; withinStretch?: boolean; recordedAt?: string };
}

function readHistory(): B11StretchHistory {
  try {
    const parsed = JSON.parse(readFileSync(historyPath, 'utf8')) as B11StretchHistory;
    if (parsed.version === 1 && Array.isArray(parsed.samples)) return parsed;
  } catch {
    /* first run */
  }
  return emptyHistory(1_200, windowSize);
}

function writeHistory(history: B11StretchHistory): void {
  mkdirSync(dirname(historyPath), { recursive: true });
  writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
}

function main(): void {
  const sample = readSample();
  const history = appendStretchSample(readHistory(), {
    elapsedMs: sample.elapsedMs,
    recordedAt: sample.recordedAt ?? new Date().toISOString(),
    withinStretch: sample.withinStretch,
    runId: process.env.GITHUB_RUN_ID,
  });
  writeHistory(history);

  const readiness = evaluateStretchGateReadiness(history, windowSize);
  const summary = formatStretchSummary(history, readiness);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf8');
  }

  // eslint-disable-next-line no-console
  console.log(readiness.message);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `stretch_gate_ready=${readiness.ready ? 'true' : 'false'}\n`, 'utf8');
    if (readiness.medianMs != null) {
      appendFileSync(process.env.GITHUB_OUTPUT, `stretch_median_ms=${readiness.medianMs}\n`, 'utf8');
    }
  }

  if (readiness.ready) {
    // eslint-disable-next-line no-console
    console.log(
      '::notice title=B11 stretch gate ready::Uncomment PROD_STRETCH_GATE in .github/workflows/ci.yml (perf-budget-prod job)',
    );
  }
}

main();
