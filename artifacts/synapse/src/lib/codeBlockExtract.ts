/**
 * Code-block recognition for Synapse sources.
 *
 * Detects fenced code blocks (```), inline code spans, and classifies the
 * programming language so the workspace can route Python snippets to Pyodide
 * and other languages to the CodeEditor.
 */

export interface ExtractedCodeBlock {
  id: string;
  /** Detected or declared language. */
  language: string;
  /** Full code content including line breaks. */
  code: string;
  /** True if this is an inline backtick span. */
  inline: boolean;
  /** 0-based character offset of the block start. */
  charStart: number;
  /** 0-based character offset of the block end. */
  charEnd: number;
}

const LANG_ALIASES: Record<string, string> = {
  py: 'python',
  python3: 'python',
  js: 'javascript',
  ts: 'typescript',
  node: 'javascript',
  cxx: 'cpp',
  cplusplus: 'cpp',
  'c++': 'cpp',
  csharp: 'c#',
  cs: 'c#',
  rb: 'ruby',
  golang: 'go',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ps: 'powershell',
  ps1: 'powershell',
  html: 'html',
  css: 'css',
  sql: 'sql',
  r: 'r',
  rust: 'rust',
  rs: 'rust',
  java: 'java',
  kotlin: 'kotlin',
  kt: 'kotlin',
  swift: 'swift',
  scala: 'scala',
  matlab: 'matlab',
  octave: 'octave',
};

function normalizeLanguage(lang: string): string {
  const key = lang.toLowerCase().trim();
  return LANG_ALIASES[key] ?? key;
}

/**
 * Classify the programming language of a code block. Uses the declared hint
 * when available, otherwise falls back to content heuristics.
 */
export function classifyCodeLanguage(code: string, hint = ''): string {
  if (hint) {
    const normalized = normalizeLanguage(hint);
    if (normalized && normalized !== 'text') return normalized;
  }

  const firstLine = code.split('\n')[0] ?? '';
  if (firstLine.startsWith('#!/usr/bin/env python') || firstLine.startsWith('#!/usr/bin/python')) return 'python';
  if (firstLine.startsWith('#!/bin/bash') || firstLine.startsWith('#!/bin/sh')) return 'bash';
  if (firstLine.startsWith('#!/usr/bin/env node')) return 'javascript';

  if (/\bdef\s+\w+\s*\([^)]*\):/.test(code)) return 'python';
  if (/\bfunction\b|\bconst\s+\w+\s*=\s*[\(|\[]/.test(code) && /console\.log|document\.|import\s+/.test(code)) return 'javascript';
  if (/\bimport\s+\{[^}]+\}\s+from\s+['"]/.test(code) || /:\s*(string|number|boolean)\b/.test(code)) return 'typescript';
  if (/\bpublic\s+static\s+void\s+main\b/.test(code)) return 'java';
  if (/\b#include\s+</.test(code)) return 'cpp';
  if (/\bSELECT\s+.+\s+FROM\s+/is.test(code)) return 'sql';
  if (/\bfn\s+main\s*\(\s*\)\s*\{/.test(code)) return 'rust';
  if (/\bpackage\s+main\b|\bfunc\s+\w+\s*\(/.test(code)) return 'go';

  return 'text';
}

/**
 * Return true for languages that Pyodide can execute in the browser.
 */
export function isExecutableLanguage(language: string): boolean {
  return language === 'python';
}

/**
 * Extract fenced code blocks (```) and inline backtick spans from text.
 */
export function extractCodeBlocks(text: string): ExtractedCodeBlock[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks: ExtractedCodeBlock[] = [];
  const fence = /^```\s*([\w+#-]*)\s*$/m;
  let i = 0;
  let blockIndex = 0;

  while (i < normalized.length) {
    const fenceMatch = normalized.slice(i).match(fence);
    if (!fenceMatch) break;

    const start = i + fenceMatch.index!;
    const hint = fenceMatch[1] ?? '';
    const contentStart = start + fenceMatch[0].length;
    const nextFence = normalized.indexOf('\n```', contentStart);
    if (nextFence === -1) break;

    const code = normalized.slice(contentStart, nextFence).trim();
    const end = nextFence + 4;
    const language = classifyCodeLanguage(code, hint);
    blocks.push({
      id: `code-${blockIndex++}`,
      language,
      code,
      inline: false,
      charStart: start,
      charEnd: end,
    });
    i = end;
  }

  // Inline backtick spans.
  const inlineRe = /`([^`\n]+)`/g;
  for (const m of normalized.matchAll(inlineRe)) {
    const code = m[1]!.trim();
    if (code.length < 2 || code.length > 80) continue;
    const language = classifyCodeLanguage(code, '');
    blocks.push({
      id: `code-${blockIndex++}`,
      language,
      code,
      inline: true,
      charStart: m.index!,
      charEnd: m.index! + m[0].length,
    });
  }

  return blocks;
}

/**
 * Extract only executable Python blocks, suitable for the Pyodide runner.
 */
export function extractPythonBlocks(text: string): ExtractedCodeBlock[] {
  return extractCodeBlocks(text).filter((b) => b.language === 'python' && !b.inline);
}

/**
 * Render a code block as a fenced Markdown string for display or export.
 */
export function codeBlockToMarkdown(block: ExtractedCodeBlock): string {
  if (block.inline) return '`' + block.code + '`';
  return '```' + block.language + '\n' + block.code + '\n```';
}
