import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getSessionAsync } from '../store/sessionStore';

export const analyticsRouter = Router();

type InsightAction = {
  id: string;
  title: string;
  detail: string;
  concept?: string;
};

/**
 * GET /v1/analytics/insights?range=7d|30d|semester
 * Derives observations + study CTAs from the synced learner session (Wave E).
 */
analyticsRouter.get('/analytics/insights', authenticate, async (req: Request, res: Response) => {
  try {
    const session = await getSessionAsync(req.account!.id);
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    const days = range === '7d' ? 7 : range === 'semester' ? 180 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const rawActivities = (session.activities ?? []) as Array<{ timestamp?: string; type?: string }>;
    const activities = rawActivities.filter((a) => {
      if (!a.timestamp) return false;
      const t = new Date(a.timestamp).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });

    const model = session.learnerModel as {
      weakAreas?: { concept: string; mastery: number }[];
      almostKnown?: { concept: string; mastery: number }[];
      overallMastery?: number;
      streakDays?: number;
      interactionInsights?: string[];
    } | null;

    const observations: string[] = [];
    if (Array.isArray(model?.interactionInsights) && model.interactionInsights.length > 0) {
      observations.push(...model.interactionInsights.slice(0, 5));
    }
    if (typeof model?.overallMastery === 'number') {
      observations.push(`Overall mastery is at ${Math.round(model.overallMastery)}% in the selected window.`);
    }
    if (typeof model?.streakDays === 'number' && model.streakDays > 0) {
      observations.push(`Current study streak: ${model.streakDays} day(s).`);
    }
    const quizN = activities.filter((a) => a.type === 'quiz_passed' || a.type === 'quiz_failed').length;
    if (quizN > 0) {
      observations.push(`${quizN} quiz attempt(s) recorded in this range.`);
    }
    if (observations.length === 0) {
      observations.push('Keep studying — more activity unlocks sharper AI insights.');
    }

    const actions: InsightAction[] = [];
    const weak = model?.weakAreas?.[0];
    if (weak?.concept) {
      actions.push({
        id: `study-${weak.concept}`,
        title: `Study: ${weak.concept}`,
        detail: 'Open the workspace focused on this weak concept.',
        concept: weak.concept,
      });
    }
    const almost = model?.almostKnown?.[0];
    if (almost?.concept && almost.concept !== weak?.concept) {
      actions.push({
        id: `push-${almost.concept}`,
        title: `Finish: ${almost.concept}`,
        detail: 'You are close — a short review should lock it in.',
        concept: almost.concept,
      });
    }

    res.json({ range, observations, actions, activityCount: activities.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Insights failed' });
  }
});
