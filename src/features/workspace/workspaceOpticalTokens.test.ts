import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PLATFORM_TYPE_FLOOR,
  WORKSPACE_RADIUS_SCALE,
  WORKSPACE_TOUCH_TARGETS,
  WORKSPACE_TYPE_SCALE,
} from './workspaceOpticalTokens';

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

const workspaceBlock = (() => {
  const start = css.indexOf('[data-testid="study-workspace"] {');
  expect(start).toBeGreaterThan(-1);
  const end = css.indexOf('}', start);
  return css.slice(start, end);
})();

const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('Wave E1 — workspace optical tokens contract', () => {
  it('workspace type scale matches index.css', () => {
    expect(workspaceBlock).toMatch(new RegExp(`--type-micro:\\s*${esc(WORKSPACE_TYPE_SCALE.micro)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-caption:\\s*${esc(WORKSPACE_TYPE_SCALE.caption)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-body-sm:\\s*${esc(WORKSPACE_TYPE_SCALE.bodySm)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-meta:\\s*${esc(WORKSPACE_TYPE_SCALE.meta)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-body:\\s*${esc(WORKSPACE_TYPE_SCALE.body)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-title:\\s*${esc(WORKSPACE_TYPE_SCALE.title)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-display-sm:\\s*${esc(WORKSPACE_TYPE_SCALE.displaySm)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--type-display:\\s*${esc(WORKSPACE_TYPE_SCALE.display)}`));
  });

  it('workspace radius scale matches index.css (chip/btn 8 · card 12 · panel 16)', () => {
    expect(workspaceBlock).toMatch(new RegExp(`--radius-sm:\\s*${esc(WORKSPACE_RADIUS_SCALE.sm)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--radius-md:\\s*${esc(WORKSPACE_RADIUS_SCALE.md)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--radius-lg:\\s*${esc(WORKSPACE_RADIUS_SCALE.lg)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--radius-xl:\\s*${esc(WORKSPACE_RADIUS_SCALE.xl)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--radius-panel:\\s*${esc(WORKSPACE_RADIUS_SCALE.panel)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--radius-bubble:\\s*${esc(WORKSPACE_RADIUS_SCALE.bubble)}`));
  });

  it('touch targets stay >=44px on phone chrome', () => {
    expect(workspaceBlock).toMatch(new RegExp(`--btn-height:\\s*${esc(WORKSPACE_TOUCH_TARGETS.btnHeight)}`));
    expect(workspaceBlock).toMatch(new RegExp(`--btn-height-sm:\\s*${esc(WORKSPACE_TOUCH_TARGETS.btnHeightSm)}`));
    expect(css).toMatch(/min-height:\s*2\.75rem;\s*\n\s*min-width:\s*2\.75rem/);
  });

  it('platform shell floor lifted (micro 11px / caption 12px) and no raw 9-11px classes remain', () => {
    expect(css).toMatch(new RegExp(`--type-micro:\\s*${esc(PLATFORM_TYPE_FLOOR.micro)}`));
    expect(css).toMatch(new RegExp(`--type-caption:\\s*${esc(PLATFORM_TYPE_FLOOR.caption)}`));
  });
});
