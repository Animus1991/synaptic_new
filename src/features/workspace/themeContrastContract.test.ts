/**
 * Wave F8 — theme contrast contract.
 * Ensures each product theme declares (or inherits) primary/secondary ink +
 * surface tokens so eye-harmony cannot silently regress.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexCss = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
const primerCss = readFileSync(resolve(__dirname, '../../styles/primer-minimal.css'), 'utf8');
const css = `${indexCss}\n${primerCss}`;

const THEMES = [
  'minimal',
  'minimal-dark',
  'light',
  'dark',
  'blueprint',
  'warm-sand',
  'spectrum',
] as const;

/** Themes that own a full token block (not just a few overrides). */
const FULL_TOKEN_THEMES = ['minimal', 'minimal-dark', 'light', 'warm-sand', 'spectrum'] as const;

const REQUIRED_VARS = [
  '--color-text-primary',
  '--color-text-secondary',
  '--color-surface-card',
  '--color-surface-primary',
  '--color-border-subtle',
] as const;

/** Extract a top-level `[data-theme="…"] { … }` that declares text-primary ink. */
function themeTokenBlock(theme: string): string {
  // Selector-only gap before `{`: whitespace, commas, and sibling theme attrs.
  // Rejects comment prose like `via [data-theme="light"] Warm Sand … {`.
  const re = new RegExp(
    `\\[data-theme=["']${theme}["']\\]((?:\\s|,|\\[data-theme=["'][^"']+["']\\])*)\\{`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const brace = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = brace; i < css.length; i++) {
      const ch = css[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const body = css.slice(brace + 1, i);
          if (body.includes('--color-text-primary:')) return body;
          break;
        }
      }
    }
  }
  return '';
}

describe('Wave F8 — theme contrast token presence', () => {
  for (const theme of THEMES) {
    it(`theme "${theme}" is registered in CSS`, () => {
      expect(css).toContain(`[data-theme="${theme}"]`);
    });
  }

  for (const theme of FULL_TOKEN_THEMES) {
    it(`theme "${theme}" declares core ink/surface tokens`, () => {
      const body = themeTokenBlock(theme);
      expect(body.length).toBeGreaterThan(80);
      for (const v of REQUIRED_VARS) {
        expect(body).toContain(`${v}:`);
      }
    });
  }

  it('dark/blueprint inherit base dark ink from @theme (parity overrides only)', () => {
    expect(indexCss).toMatch(/\[data-theme="dark"\],\s*\[data-theme="blueprint"\]/);
    const themeStart = indexCss.indexOf('@theme {');
    expect(themeStart).toBeGreaterThan(-1);
    const themeEnd = indexCss.indexOf('\n}', themeStart);
    const themeBlock = indexCss.slice(themeStart, themeEnd);
    for (const v of REQUIRED_VARS) {
      expect(themeBlock).toContain(`${v}:`);
    }
  });

  it('workspace optical floors keep secondary/muted ink readable on light + dark themes', () => {
    expect(indexCss).toMatch(
      /:is\(\[data-theme="minimal"\],\s*\[data-theme="light"\]\)\s*\[data-testid="study-workspace"\]/,
    );
    expect(indexCss).toMatch(
      /:is\(\[data-theme="minimal-dark"\],\s*\[data-theme="dark"\],\s*\[data-theme="blueprint"\]\)\s*\[data-testid="study-workspace"\]/,
    );
    expect(indexCss).toMatch(
      /\[data-testid="study-workspace"\][\s\S]*?--color-text-muted:\s*color-mix/,
    );
  });

  it('Wave F5 maps Tailwind rounded-* to workspace radius tokens', () => {
    expect(indexCss).toMatch(
      /\[data-testid="study-workspace"\]\s*\.rounded-lg\s*\{\s*border-radius:\s*var\(--radius-md\)/,
    );
    expect(indexCss).toMatch(
      /\[data-testid="study-workspace"\]\s*\.rounded-2xl\s*\{\s*border-radius:\s*var\(--radius-panel\)/,
    );
  });

  it('Wave F6 tablet touch floor covers composer + whiteboard + presets', () => {
    expect(indexCss).toMatch(/max-width:\s*1023px/);
    expect(indexCss).toContain('agent-composer-tools');
    expect(indexCss).toContain('whiteboard-draw-toolbar');
    expect(indexCss).toContain('simulator-course-presets');
  });

  it('platform banner warn uses dedicated ink token on light surfaces', () => {
    expect(css).toMatch(/--color-banner-warn-ink/);
    expect(css).toMatch(/\.platform-banner-warn/);
  });
});
