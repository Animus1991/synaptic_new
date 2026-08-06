/**
 * Wave SIM — Simulator full-bleed + warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave SIM — Simulator productization', () => {
  const sandbox = read('components/workspace/InteractiveSimulator.tsx');
  const panel = read('components/workspace/SimulatorPanel.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const i18n = read('lib/i18n.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');

  it('purpose is warm learner copy (not sensitivity-cues jargon)', () => {
    expect(spine).toMatch(/Move the sliders, watch the graph change/);
    expect(spine).toMatch(/Κούνα τους διακόπτες/);
    expect(spine).not.toMatch(/sensitivity cues and timer presets/);
  });

  it('how-to prefers what-if / graph language', () => {
    expect(guide).toMatch(/what-if/);
    expect(guide).toMatch(/τι θα γινόταν αν/);
    expect(guide).not.toMatch(/Adjust the input parameters/);
  });

  it('sandbox is full-bleed (no centered max-w-sm column)', () => {
    expect(sandbox).toContain('data-testid="simulator-sandbox"');
    expect(sandbox).toContain('data-bleed="full"');
    expect(panel).toContain('data-bleed="full"');
    expect(sandbox).toContain('max-w-none');
    expect(sandbox).toContain('viewBox=');
    expect(sandbox).not.toMatch(/className="[^"]*max-w-sm/);
    expect(sandbox).not.toMatch(/items-center overflow-y-auto/);
    expect(surface).toMatch(/activeTool !== 'simulator'/);
  });

  it('native labels drop Parametric / Live equilibrium jargon', () => {
    expect(i18n).toMatch(/What-if sandbox/);
    expect(i18n).toMatch(/Τι θα γινόταν αν/);
    expect(i18n).toMatch(/Live result/);
    expect(i18n).toMatch(/Ζωντανό αποτέλεσμα/);
    expect(i18n).not.toMatch(/Parametric Sandbox/);
    expect(i18n).not.toMatch(/Live equilibrium/);
    const discover = read('features/workspace/workspaceDiscoverability.ts');
    expect(discover).toMatch(/What-if sandbox/);
    expect(discover).toMatch(/Τι θα γινόταν αν/);
    expect(discover).not.toMatch(/Parametric Sandbox/);
  });
});
