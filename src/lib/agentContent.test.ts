import { describe, expect, it } from 'vitest';
import type { AgentMode } from '../types';
import { getAgentContent } from './agentContent';
import { getOnboardingContent } from './onboardingContent';

describe('agentContent', () => {
  it('returns Greek UI strings when lang is el', () => {
    const el = getAgentContent('el');
    const en = getAgentContent('en');
    expect(el.ui.thinking).toBe('Σκέφτομαι…');
    expect(el.ui.allSources).toBe('Όλες οι Πηγές');
    expect(el.modes.socratic.desc).not.toBe(en.modes.socratic.desc);
    expect(el.quickActions[0]).not.toBe(en.quickActions[0]);
  });

  it('covers all agent modes in both locales', () => {
    const modes = Object.keys(getAgentContent('en').modes) as AgentMode[];
    expect(modes).toHaveLength(15);
    for (const mode of modes) {
      expect(getAgentContent('el').modes[mode].label).toBeTruthy();
    }
  });

  it('OPT-K74 — grounding badges stay short (no emoji width on phone)', () => {
    const en = getAgentContent('en').ui;
    expect(en.badgeSourceGrounded).toBe('Source grounded');
    expect(en.badgeAiInference).toBe('AI inference');
    expect(en.badgeSourceGrounded).not.toMatch(/📖|🧠/);
  });
});

describe('onboardingContent', () => {
  it('returns Greek copy when lang is el', () => {
    const el = getOnboardingContent('el');
    expect(el.welcomeTitle).toBe('Καλώς ήρθες στο Synapse');
    expect(el.roles).toHaveLength(5);
    expect(el.goals).toHaveLength(6);
  });
});
