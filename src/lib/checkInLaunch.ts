/**
 * Map a completed daily check-in → immediate study launch (task or session)
 * so the learner does not hunt manually after chatting.
 */

import type { Task } from '../types';
import type { DailyCheckInAnswers } from './dailyLearningCheckIn';
import { filterTasksForSession, type SessionType } from './taskFlows';
import { getRecommendedSessionType } from './recommendedSessionType';

export type CheckInLaunch =
  | { kind: 'session'; sessionType: SessionType; taskId: string; taskTitle: string }
  | { kind: 'task'; taskId: string; taskTitle: string; sessionType: SessionType }
  | { kind: 'none'; reason: 'no-pending-tasks' };

function intentToSessionType(answers: DailyCheckInAnswers): SessionType {
  return getRecommendedSessionType({
    daysToExam: null,
    reviewDueCount: 0,
    weakCount: 0,
    openTaskCount: 1,
    checkInEnergy: answers.energy,
    checkInMinutes: answers.availableMinutes,
    checkInIntent: answers.sessionIntent,
  });
}

function pendingForCourse(tasks: Task[], courseId?: string, courseTitle?: string): Task[] {
  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in-progress');
  if (courseId) {
    const byId = pending.filter((t) => t.courseId === courseId);
    if (byId.length) return byId;
  }
  if (courseTitle && courseTitle !== 'suggested') {
    const needle = courseTitle.toLowerCase();
    const byTitle = pending.filter((t) => t.courseName.toLowerCase().includes(needle));
    if (byTitle.length) return byTitle;
  }
  return pending;
}

function rankForIntent(tasks: Task[], intent?: DailyCheckInAnswers['sessionIntent']): Task[] {
  const score = (t: Task): number => {
    let s = 0;
    if (intent === 'review' && (t.category === 'review' || t.isSpacedRepetition)) s += 5;
    if (intent === 'practice' && (t.category === 'practice' || t.type === 'practice' || t.type === 'quiz')) s += 5;
    if (intent === 'exam' && (t.category === 'exam' || t.type === 'exam-prep' || t.type === 'timed-test')) s += 5;
    if (intent === 'learn' && (t.category === 'learn' || t.type === 'lesson' || t.type === 'deep-dive')) s += 4;
    if (intent === 'light' && (t.isSpacedRepetition || t.type === 'flashcards' || t.type === 'concept-check')) s += 5;
    if (t.priority === 'critical') s += 2;
    if (t.priority === 'high') s += 1;
    return s;
  };
  return [...tasks].sort((a, b) => score(b) - score(a));
}

/**
 * Pick the best immediate launch from check-in answers + open tasks.
 * Prefers a course-scoped task matching intent; falls back to a session queue.
 */
export function resolveCheckInLaunch(
  answers: DailyCheckInAnswers,
  tasks: Task[],
): CheckInLaunch {
  if (answers.studiedToday === 'done') {
    // Soft exit — they already finished; do not force another session.
    const light = filterTasksForSession(tasks, '10min');
    if (light[0]) {
      return {
        kind: 'task',
        taskId: light[0].id,
        taskTitle: light[0].title,
        sessionType: '10min',
      };
    }
  }

  const sessionType = intentToSessionType(answers);
  const scoped = pendingForCourse(tasks, answers.focusCourseId, answers.focusCourseTitle);
  const ranked = rankForIntent(scoped, answers.sessionIntent);

  if (ranked[0]) {
    return {
      kind: 'task',
      taskId: ranked[0].id,
      taskTitle: ranked[0].title,
      sessionType,
    };
  }

  const queue = filterTasksForSession(tasks, sessionType);
  if (queue[0]) {
    return {
      kind: 'session',
      sessionType,
      taskId: queue[0].id,
      taskTitle: queue[0].title,
    };
  }

  const anyPending = tasks.find((t) => t.status === 'pending');
  if (anyPending) {
    return {
      kind: 'task',
      taskId: anyPending.id,
      taskTitle: anyPending.title,
      sessionType,
    };
  }

  return { kind: 'none', reason: 'no-pending-tasks' };
}

export function launchAckSuffix(
  lang: 'en' | 'el',
  launch: CheckInLaunch,
): string {
  if (launch.kind === 'none') {
    return lang === 'el'
      ? ' Δεν βρήκα ανοιχτό task — όταν ανεβάσεις υλικό ή δημιουργηθούν tasks, ξεκινάμε από εδώ.'
      : " I couldn't find an open task — once you have material/tasks, we'll start from here.";
  }
  if (lang === 'el') {
    return ` Ξεκινάω αμέσως με «${launch.taskTitle}» — χωρίς άλλο tap.`;
  }
  return ` Starting “${launch.taskTitle}” right away — no extra tap.`;
}
