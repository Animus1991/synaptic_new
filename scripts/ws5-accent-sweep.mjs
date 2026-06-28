/**
 * WS-5: Replace legacy dark-glass / cyan accent classes with Warm Sand tokens
 * in workspace components. Idempotent — safe to re-run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDir = path.join(root, 'src', 'components', 'workspace');

const REPLACEMENTS = [
  // Dark-glass tool toggles → warm neutral toggle
  [
    'border-white/12 bg-white/[0.05] text-text-secondary hover:text-text-primary',
    'ws-tool-toggle',
  ],
  [
    'border-white/10 bg-white/[0.04] text-text-secondary hover:text-text-primary',
    'ws-tool-toggle',
  ],
  // Active accent-cyan button clusters → brand chip
  [
    'border-accent-cyan/30 bg-accent-cyan/15 text-accent-cyan',
    'ws-chip-brand',
  ],
  [
    'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan',
    'ws-chip-brand',
  ],
  [
    'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan font-medium',
    'ws-chip-brand font-medium',
  ],
  // Brand action buttons
  [
    'border-brand-500/30 bg-brand-600/10 px-2 py-1 text-[10px] font-medium text-brand-300',
    'ws-chip-brand rounded-lg px-2 py-1 text-[10px] font-medium',
  ],
  [
    'border-brand-500/30 bg-brand-600/10 px-2 py-0.5 text-[10px] font-medium text-brand-300',
    'ws-chip-brand rounded-md px-2 py-0.5 text-[10px] font-medium',
  ],
  [
    'bg-brand-600/20 text-brand-300 border border-brand-500/30',
    'ws-chip-brand border',
  ],
  [
    'border border-brand-500/30 bg-brand-600/10 text-brand-300',
    'ws-chip-brand border',
  ],
  // Text accents
  ['text-brand-300', 'text-brand-800'],
  ['text-brand-400', 'text-brand-700'],
  ['hover:text-brand-300', 'hover:text-brand-800'],
  ['hover:text-brand-200', 'hover:text-brand-800'],
  ['hover:text-accent-cyan/80', 'hover:opacity-80'],
  // TTS / focus rings
  ['ring-2 ring-accent-cyan/40 bg-accent-cyan/10', 'ws-focus-line'],
  ['ring-2 ring-accent-cyan/50 bg-accent-cyan/10', 'ws-focus-line'],
  // Info strips
  ['border-b border-accent-cyan/25 bg-accent-cyan/8', 'ws-info-strip border-b'],
  ['border-b border-accent-cyan/20 bg-accent-cyan/5', 'ws-info-strip border-b'],
  ['border-accent-cyan/30 bg-accent-cyan/10 px-2 py-1 text-[10px] font-medium text-accent-cyan', 'ws-chip-brand rounded-lg px-2 py-1 text-[10px] font-medium'],
  ['hover:border-accent-cyan/35 hover:text-accent-cyan', 'hover:border-brand-600/35 hover:text-brand-800'],
  // Pass 2 — remaining cyan / glass fragments
  ['text-accent-cyan', 'text-brand-800'],
  ['hover:bg-accent-cyan/15', 'hover:opacity-90'],
  ['border-accent-cyan/40 bg-accent-cyan/15 px-2 py-1 text-[10px] font-medium text-accent-cyan', 'ws-chip-brand px-2 py-1 text-[10px] font-medium'],
  ['shrink-0 inline-flex items-center gap-1 rounded-lg border border-accent-cyan/40 bg-accent-cyan/15 px-2 py-1 text-[10px] font-medium text-accent-cyan', 'ws-chip-brand shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium'],
  ['ring-1 ring-accent-cyan/40', 'ring-1 ring-brand-600/35'],
  ['border-white/10 bg-surface-card text-text-secondary hover:border-brand-400/40 hover:text-brand-800', 'border-border-subtle bg-surface-card text-text-secondary hover:border-brand-600/35 hover:text-brand-800'],
  ['rounded-lg border ws-chip-brand rounded-lg', 'ws-chip-brand rounded-lg border'],
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.tsx')) processFile(full);
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('updated', path.relative(root, filePath));
  }
}

walk(workspaceDir);
// Also sweep WorkspaceToolHeader-adjacent lib if any
const extra = [
  path.join(root, 'src', 'components', 'workspace', 'WorkspaceToolHeader.tsx'),
];
for (const f of extra) {
  if (fs.existsSync(f)) processFile(f);
}

console.log('WS-5 sweep complete');
