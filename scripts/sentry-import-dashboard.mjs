#!/usr/bin/env node
/**
 * Import the Synapse chunk-health dashboard into Sentry.
 *
 * Required env:
 *   SENTRY_AUTH_TOKEN — org auth token with project:write
 *   SENTRY_ORG        — slug, e.g. my-org
 *   SENTRY_PROJECT    — slug, e.g. synapse-web
 *
 * Usage:
 *   npm run sentry:import-dashboard
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dashboardFile = path.join(root, 'docs/observability/sentry-dashboard.synapse-chunk-health.json');

const token = process.env.SENTRY_AUTH_TOKEN?.trim();
const org = process.env.SENTRY_ORG?.trim();
const project = process.env.SENTRY_PROJECT?.trim();

if (!token || !org || !project) {
  console.error(
    'Missing SENTRY_AUTH_TOKEN, SENTRY_ORG, or SENTRY_PROJECT.\n'
    + 'See docs/observability/sentry-chunk-errors.md § Dashboard import.',
  );
  process.exit(1);
}

const args = [
  'dashboards',
  'create',
  '--org', org,
  '--project', project,
  '--file', dashboardFile,
];

const result = spawnSync('npx', ['@sentry/cli', ...args], {
  stdio: 'inherit',
  env: { ...process.env, SENTRY_AUTH_TOKEN: token },
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Dashboard imported: Synapse — Chunk Health');
