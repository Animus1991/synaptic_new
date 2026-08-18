import type { AgentMode, UserSettings } from '../types';
import { t as ti18n, type I18nKey } from './i18n';

/** Map user teaching preferences → default agent mode */
export function settingsToAgentMode(settings: UserSettings): AgentMode {
  if (settings.teachingStyle === 'socratic') return 'socratic';
  if (settings.teachingStyle === 'direct') return 'direct';
  if (settings.explanationDepth === 'beginner') return 'beginner';
  if (settings.challengeLevel === 'high-challenge') return 'exam-coach';
  return 'direct';
}

export function shouldShowDiagrams(settings: UserSettings): boolean {
  return settings.diagramFrequency !== 'minimal';
}

export function shouldIncludeWorkedExample(settings: UserSettings): boolean {
  return settings.exampleDensity !== 'fewer';
}

export function shouldPreferManyExamples(settings: UserSettings): boolean {
  return settings.exampleDensity === 'many';
}

export function quizQuestionCount(settings: UserSettings): number {
  let count = 3;
  switch (settings.questionFrequency) {
    case 'minimal': count = 2; break;
    case 'frequent': count = 5; break;
    default: count = 3;
  }
  if (settings.practiceIntensity === 'light') count = Math.max(2, count - 1);
  if (settings.practiceIntensity === 'intense') count = Math.min(6, count + 1);
  return count;
}

export function sessionPaceMinutes(settings: UserSettings): 10 | 25 | 50 {
  switch (settings.pacing) {
    case 'slow': return 50;
    case 'fast': return 10;
    default: return 25;
  }
}

export function lessonStepCount(settings: UserSettings): number {
  let count = 6;
  switch (settings.lessonLength) {
    case 'short': count = 5; break;
    case 'long': count = 7; break;
    default: count = 6;
  }
  if (settings.revisionLoops === 'fewer') count = Math.max(5, count - 1);
  if (settings.revisionLoops === 'more') count = Math.min(8, count + 1);
  return count;
}

export function passThreshold(settings: UserSettings): number {
  return settings.masteryThreshold;
}

export function dailyGoalProgressPct(studyMinutesToday: number, dailyGoalMinutes: number): number {
  const goal = Math.max(1, dailyGoalMinutes);
  return Math.min(100, Math.round((studyMinutesToday / goal) * 100));
}

export function agentTonePrefix(settings: UserSettings): string {
  if (settings.feedbackTone === 'gentle') return 'Take your time — ';
  if (settings.feedbackTone === 'strict') return 'Be precise — ';
  return '';
}

/** @deprecated use i18n.ts directly */
export function t(key: string, lang: UserSettings['language']): string {
  return ti18n(key as I18nKey, lang);
}
