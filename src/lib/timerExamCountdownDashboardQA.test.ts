import { describe, expect, it } from 'vitest';
import {
  auditTimerExamCountdownDashboard,
  computeDashboardDaysToExam,
  normalizeExamDateIso,
  resolveEffectiveExamIso,
  syncExamTargetFromDashboard,
} from './timerExamCountdownDashboardQA';
import { saveExamTarget } from './workspacePersistence';
import type { DashboardStats, LearnerModel, Task } from '../types';

const NOW = new Date('2026-06-01T12:00:00.000Z').getTime();
const EXAM_DATE = '2026-06-10';

const baseLearner = {
  overallMastery: 50,
  weakAreas: [],
  misconceptions: [],
  confidenceCalibration: [],
  spacingIntervals: [],
  weeklyMastery: [50, 52],
  totalSessions: 3,
} as unknown as LearnerModel;

const baseStats = {
  streak: 1,
  todayXP: 10,
  reviewsDue: 0,
  conceptsMastered: 1,
  totalConcepts: 5,
  studyTimeToday: 15,
} as DashboardStats;

describe('timerExamCountdownDashboardQA', () => {
  it('computes dashboard day count consistently', () => {
    expect(computeDashboardDaysToExam(EXAM_DATE, NOW)).toBe(9);
    expect(normalizeExamDateIso(EXAM_DATE)).toBeTruthy();
  });

  it('prefers settings exam date over scope storage', () => {
    saveExamTarget('scope-a', new Date('2025-01-01').toISOString());
    const iso = resolveEffectiveExamIso({
      scopeKey: 'scope-a',
      settingsExamDate: EXAM_DATE,
    });
    expect(computeDashboardDaysToExam(iso, NOW)).toBe(9);
  });

  it('syncs dashboard date into timer scope', () => {
    const scopeKey = `sync-test-${Date.now()}`;
    const { synced, effectiveIso } = syncExamTargetFromDashboard({
      scopeKey,
      settingsExamDate: EXAM_DATE,
    });
    expect(synced).toBe(true);
    expect(computeDashboardDaysToExam(effectiveIso, NOW)).toBe(9);
  });

  it('audits parity and exam-prep next action within 14d', () => {
    const tasks = [{
      id: 'exam-1',
      type: 'exam-prep',
      title: 'Exam prep',
      status: 'pending',
      priority: 'high',
      category: 'learn',
      courseName: 'Econ',
      xpReward: 20,
    }] as Task[];

    const report = auditTimerExamCountdownDashboard({
      scopeKey: `audit-${Date.now()}`,
      settingsExamDate: '2026-06-08',
      lang: 'en',
      now: NOW,
      learnerModel: baseLearner,
      tasks,
      stats: baseStats,
    });

    expect(report.examPrepWindow).toBe(true);
    expect(report.nextActionKind).toBe('exam-prep');
    expect(report.syncOk).toBe(true);
    expect(report.bannerSummary).toContain('d to exam');
  });
});
