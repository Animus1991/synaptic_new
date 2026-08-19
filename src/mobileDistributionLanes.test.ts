/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * D2 — keep the mobile distribution npm scripts in lockstep with the Fastlane
 * lanes they invoke. A `mobile:*` script pointing at a lane that no longer
 * exists (or a platform mismatch) would fail silently in CI/on a release box;
 * this guard turns that drift into a red unit test instead.
 */

const repoRoot = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const fastfile = readFileSync(resolve(repoRoot, 'mobile/fastlane/Fastfile'), 'utf8');

/** Map platform → set of lane names defined in the Fastfile. */
function parseLanes(source: string): Record<'ios' | 'android', Set<string>> {
  const lanes: Record<'ios' | 'android', Set<string>> = { ios: new Set(), android: new Set() };
  let current: 'ios' | 'android' | null = null;
  for (const line of source.split('\n')) {
    const platform = /^\s*platform\s+:(\w+)\s+do/.exec(line);
    if (platform) {
      current = platform[1] === 'ios' || platform[1] === 'android' ? platform[1] : null;
      continue;
    }
    const lane = /^\s*lane\s+:(\w+)\s+do/.exec(line);
    if (lane && current) lanes[current].add(lane[1]!);
  }
  return lanes;
}

/** Extract the platform + lane a `mobile:*` npm script invokes. */
function parseScript(value: string): { platform: 'ios' | 'android'; lane: string } | null {
  const m = /fastlane\s+(ios|android)\s+(\w+)/.exec(value);
  if (!m) return null;
  return { platform: m[1] as 'ios' | 'android', lane: m[2]! };
}

const lanes = parseLanes(fastfile);
const mobileScripts = Object.entries(pkg.scripts).filter(([name]) => /^mobile:(ios|android):/.test(name));

describe('mobile distribution lanes (D2)', () => {
  it('defines lanes for both platforms in the Fastfile', () => {
    expect(lanes.ios.size).toBeGreaterThan(0);
    expect(lanes.android.size).toBeGreaterThan(0);
  });

  it('every mobile:* npm script invokes a fastlane lane', () => {
    for (const [name, value] of mobileScripts) {
      expect(parseScript(value), `${name} should call \`fastlane <platform> <lane>\``).not.toBeNull();
    }
  });

  it('every referenced lane exists on the matching platform', () => {
    for (const [name, value] of mobileScripts) {
      const parsed = parseScript(value);
      if (!parsed) continue;
      expect(
        lanes[parsed.platform].has(parsed.lane),
        `${name} → ${parsed.platform} ${parsed.lane} is not defined in mobile/fastlane/Fastfile`,
      ).toBe(true);
    }
  });

  it('wires the full promotion ladder (build → beta → release) for both platforms', () => {
    const scriptNames = new Set(mobileScripts.map(([name]) => name));
    for (const platform of ['ios', 'android'] as const) {
      for (const stage of ['build', 'beta', 'release']) {
        expect(scriptNames.has(`mobile:${platform}:${stage}`)).toBe(true);
      }
    }
  });
});
