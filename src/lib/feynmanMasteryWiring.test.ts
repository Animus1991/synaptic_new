import { describe, expect, it } from 'vitest';
import { updateSkillMastery, updateBetaMastery } from './pedagogy';
import type { SkillNode } from '../types';

// Integration test: Feynman completion → persistent mastery update
//
// Invariant: submitFeynmanResult(concept, score, courseId) in useStore.ts uses
// correct = score >= 60 and confidence = score, then calls updateSkillMastery +
// updateBetaMastery with those values. This test verifies those calculations
// produce the right mastery direction for each score band.

function feynmanInputs(overallScore: number): { correct: boolean; confidence: number } {
  return { correct: overallScore >= 60, confidence: overallScore };
}

function freshSkill(concept: string): SkillNode {
  return {
    concept,
    mastery: 40,
    practiceCount: 0,
    retentionPrediction: 50,
    errorRate: 0.3,
    lastPracticed: new Date().toISOString(),
    averageResponseTime: 0,
    courseId: 'test-course',
  };
}

function freshBeta(concept: string) {
  return { concept, alpha: 1, beta: 1, firstAttempts: 0, importance: 1 };
}

describe('Feynman → mastery update pipeline', () => {
  it('score 80 → correct=true, mastery increases', () => {
    const { correct, confidence } = feynmanInputs(80);
    expect(correct).toBe(true);
    const updated = updateSkillMastery(freshSkill('elasticity'), correct, confidence);
    expect(updated.mastery).toBeGreaterThan(40);
    expect(updated.practiceCount).toBe(1);
    expect(updated.errorRate).toBeLessThan(0.3);
  });

  it('score 60 → correct=true (boundary)', () => {
    const { correct } = feynmanInputs(60);
    expect(correct).toBe(true);
    const updated = updateSkillMastery(freshSkill('demand'), correct, 60);
    expect(updated.mastery).toBeGreaterThan(40);
  });

  it('score 59 → correct=false, mastery decreases', () => {
    const { correct, confidence } = feynmanInputs(59);
    expect(correct).toBe(false);
    const updated = updateSkillMastery(freshSkill('supply'), correct, confidence);
    expect(updated.mastery).toBeLessThan(40);
    expect(updated.errorRate).toBeGreaterThan(0.3);
  });

  it('score 0 → correct=false, mastery decreases', () => {
    const { correct, confidence } = feynmanInputs(0);
    expect(correct).toBe(false);
    const updated = updateSkillMastery(freshSkill('gdp'), correct, confidence);
    expect(updated.mastery).toBeLessThan(40);
  });

  it('score 100 → correct=true, mastery increases', () => {
    const { correct, confidence } = feynmanInputs(100);
    expect(correct).toBe(true);
    const updated = updateSkillMastery(freshSkill('inflation'), correct, confidence);
    expect(updated.mastery).toBeGreaterThan(40);
    expect(updated.errorRate).toBeLessThan(0.3);
  });

  it('beta mastery updates alpha on correct answer', () => {
    const { correct } = feynmanInputs(75);
    const beta = freshBeta('elasticity');
    const updated = updateBetaMastery(beta, correct);
    expect(updated.alpha).toBeGreaterThan(beta.alpha);
    expect(updated.beta).toBe(beta.beta);
  });

  it('beta mastery updates beta on incorrect answer', () => {
    const { correct } = feynmanInputs(40);
    const beta = freshBeta('elasticity');
    const updated = updateBetaMastery(beta, correct);
    expect(updated.beta).toBeGreaterThan(beta.beta);
    expect(updated.alpha).toBe(beta.alpha);
  });

  it('practiceCount increments on every submission', () => {
    const skill = freshSkill('equilibrium');
    const after1 = updateSkillMastery(skill, true, 80);
    const after2 = updateSkillMastery(after1, false, 30);
    expect(after1.practiceCount).toBe(1);
    expect(after2.practiceCount).toBe(2);
  });

  it('mastery is clamped to 0–100', () => {
    const maxSkill = { ...freshSkill('test'), mastery: 99 };
    const minSkill = { ...freshSkill('test'), mastery: 2 };
    expect(updateSkillMastery(maxSkill, true, 100).mastery).toBeLessThanOrEqual(100);
    expect(updateSkillMastery(minSkill, false, 0).mastery).toBeGreaterThanOrEqual(0);
  });
});
