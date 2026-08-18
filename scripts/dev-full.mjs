#!/usr/bin/env node
/**
 * Starts the full local stack with one command:
 *   [web] Vite frontend (5173)
 *   [api] Synapse server (Express :8787 + Yjs collab :8788)
 *
 * Dependency-free replacement for `concurrently` so it behaves identically on
 * Windows (PowerShell/cmd), macOS, and Linux. If either process exits, the
 * other is torn down and the exit code is propagated.
 */
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';

/** Kill the whole process tree — on Windows `child.kill()` only reaches the cmd shim. */
function killTree(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill();
  }
}

/** @type {{ name: string, child: import('node:child_process').ChildProcess }[]} */
const children = [];
let shuttingDown = false;

function prefixPipe(name, stream, out) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) out.write(`[${name}] ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) out.write(`[${name}] ${buffer}\n`);
  });
}

function launch(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    // npm/vite are .cmd shims on Windows and need a shell to resolve.
    shell: isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  prefixPipe(name, child.stdout, process.stdout);
  prefixPipe(name, child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[dev:full] ${name} exited (${signal ?? code ?? 0}) — stopping the rest.`);
    for (const entry of children) {
      if (entry.child !== child) killTree(entry.child);
    }
    process.exitCode = typeof code === 'number' ? code : 1;
  });
  children.push({ name, child });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shuttingDown = true;
    for (const entry of children) killTree(entry.child);
  });
}

console.log('[dev:full] Starting Vite (web) + Synapse server (api :8787, collab :8788)…');
launch('api', 'npm', ['run', 'dev'], 'server');
launch('web', 'npm', ['run', 'dev'], '.');
