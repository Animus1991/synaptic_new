import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, Sparkles, Users, Building2,
  ArrowRight, ArrowLeft, Upload, Target, Brain,
  Calendar, Clock, CheckCircle2, Zap, Search
} from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { getOnboardingContent } from '../lib/onboardingContent';
import { UiIcon } from './ui/UiIcon';

interface OnboardingProps {
  onComplete: (data: {
    role?: string;
    goals?: string[];
    dailyGoalMinutes?: number;
    examDate?: string;
    openUpload?: boolean;
    openTeacher?: boolean;
    displayName?: string;
    exploreDemoMode?: boolean;
  }) => void;
}

type Step = 'welcome' | 'role' | 'goals' | 'schedule';

export function Onboarding({ onComplete }: OnboardingProps) {
  const { lang } = useI18n();
  const content = getOnboardingContent(lang);
  const { roles, goals, features } = content;
  const [step, setStep] = useState<Step>('welcome');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [dailyTime, setDailyTime] = useState(30);
  const [examDate, setExamDate] = useState('');
  const [displayName, setDisplayName] = useState('');

  const steps: Step[] = ['welcome', 'role', 'goals', 'schedule'];
  const stepIndex = steps.indexOf(step);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const next = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };
  const prev = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const isTeacherRole = selectedRole === 'tutor';
  const hasExamGoal = selectedGoals.includes('exam');
  const selectedRoleMeta = roles.find((role) => role.id === selectedRole);
  const selectedGoalLabels = goals.filter((goal) => selectedGoals.includes(goal.id)).map((goal) => goal.label);
  const formattedExamDate = useMemo(() => {
    if (!examDate) return content.noExamDate;
    return new Date(examDate).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [content.noExamDate, examDate, lang]);

  const roleIcons: Record<string, typeof GraduationCap> = {
    university: GraduationCap,
    highschool: BookOpen,
    selflearner: Sparkles,
    tutor: Users,
    company: Building2,
  };

  const featureIcons = [Upload, Brain, Target, Zap];

  const completeOnboarding = (opts?: { openUpload?: boolean; openTeacher?: boolean; exploreDemoMode?: boolean }) => {
    onComplete({
      role: selectedRole ?? undefined,
      goals: selectedGoals,
      dailyGoalMinutes: dailyTime,
      examDate: examDate || undefined,
      displayName: displayName.trim() || undefined,
      openUpload: opts?.openUpload,
      openTeacher: opts?.openTeacher,
      exploreDemoMode: opts?.exploreDemoMode,
    });
  };

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col">
      <div className="h-1 bg-surface-hover">
        <div className="h-1 bg-brand-700 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="w-16 h-16 mx-auto rounded-2xl platform-brand-icon flex items-center justify-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="text-center space-y-3">
                  <h1 className="text-3xl font-medium ws-serif">{content.welcomeTitle}</h1>
                  <p className="text-text-secondary leading-relaxed max-w-xl mx-auto">
                    {content.welcomeBody}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 text-center">
                    {content.welcomeFeatureTitle}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {features.map((feature, index) => {
                    const Icon = featureIcons[index] ?? Search;
                    return (
                      <div key={feature.title} className="ux-card text-left">
                        <div className="w-9 h-9 rounded-xl bg-brand-600/10 flex items-center justify-center mb-3">
                          <Icon className="w-4 h-4 text-brand-500" />
                        </div>
                        <p className="text-sm font-medium text-text-primary">{feature.title}</p>
                        <p className="text-xs text-text-tertiary mt-1">{feature.desc}</p>
                      </div>
                    );
                  })}
                  </div>
                </div>
                <div className="max-w-sm mx-auto text-left space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-tertiary mb-1.5" htmlFor="onb-name">
                    {content.nameLabel} <span className="text-text-muted">{content.nameOptional}</span>
                    </label>
                    <input
                      id="onb-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={content.namePlaceholder}
                      autoComplete="name"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <button onClick={next} data-testid="onboarding-continue" className="w-full inline-flex items-center justify-center gap-2 px-8 py-3 ws-fab rounded-xl font-medium transition-all">
                    {content.letsGo} <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => completeOnboarding({ exploreDemoMode: true })}
                    className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {content.skipSetup}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'role' && (
              <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-medium ws-serif">{content.roleTitle}</h2>
                  <p className="text-text-secondary mt-1 text-sm">{content.roleSubtitle}</p>
                </div>
                <div className="space-y-2">
                  {roles.map(role => {
                    const RoleIcon = roleIcons[role.id] ?? GraduationCap;
                    return (
                      <button key={role.id} onClick={() => setSelectedRole(role.id)}
                        className={cn('w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                          selectedRole === role.id ? 'border-brand-500/50 bg-brand-500/10' : 'border-border-subtle hover:border-brand-500/20'
                        )}>
                        <RoleIcon className={cn('w-6 h-6', selectedRole === role.id ? 'text-brand-400' : 'text-text-tertiary')} />
                        <div>
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-xs text-text-tertiary">{role.desc}</p>
                        </div>
                        {selectedRole === role.id && <CheckCircle2 className="w-5 h-5 text-brand-400 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 'goals' && (
              <motion.div key="goals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-medium ws-serif">{content.goalsTitle}</h2>
                  <p className="text-text-secondary mt-1 text-sm">{content.goalsSubtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {goals.map(goal => (
                    <button key={goal.id} onClick={() => toggleGoal(goal.id)}
                      className={cn('p-4 rounded-xl border transition-all text-left',
                        selectedGoals.includes(goal.id) ? 'border-brand-500/50 bg-brand-500/10' : 'border-border-subtle hover:border-brand-500/20'
                      )}>
                      <UiIcon id={goal.icon} size="lg" className="mb-2 text-brand-600" />
                      <p className="text-sm font-medium">{goal.label}</p>
                      <p className="text-[11px] text-text-tertiary mt-1">
                        {goal.id === 'exam'
                          ? content.examDateHint
                          : goal.id === 'understand'
                            ? content.adaptiveHint
                            : content.goalsSubtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'schedule' && (
              <motion.div key="schedule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-medium ws-serif">{content.prefsTitle}</h2>
                  <p className="text-text-secondary mt-1 text-sm">{content.prefsSubtitle}</p>
                </div>
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-medium">{content.dailyGoal}</span>
                    </div>
                    <div className="flex gap-2">
                      {[15, 30, 45, 60, 90].map(m => (
                        <button key={m} onClick={() => setDailyTime(m)}
                          className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all',
                            dailyTime === m ? 'platform-nav-active' : 'border border-border-subtle text-text-tertiary'
                          )}>{m}m</button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-medium">{content.upcomingExam}</span>
                    </div>
                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50 w-full" />
                    <p className="text-[11px] text-text-tertiary mt-2">
                      {hasExamGoal ? content.examDateHint : content.examOnlyHint}
                    </p>
                  </div>
                  <div className="ux-card">
                    <p className="text-sm font-medium text-text-primary mb-3">{content.summaryTitle}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-text-tertiary">{content.summaryProfile}</span>
                        <span className="text-text-primary font-medium text-right">{selectedRoleMeta?.label ?? '—'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-text-tertiary">{content.summaryGoals}</span>
                        <span className="text-text-primary font-medium text-right">
                          {selectedGoalLabels.length > 0 ? selectedGoalLabels.join(', ') : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-text-tertiary">{content.summaryDailyGoal}</span>
                        <span className="text-text-primary font-medium">{dailyTime} min</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-text-tertiary">{content.summaryExamDate}</span>
                        <span className="text-text-primary font-medium text-right">{formattedExamDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover/50 text-xs text-text-muted flex items-start gap-2">
                    <Brain className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    {content.adaptiveHint}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between max-w-lg mx-auto w-full">
        {stepIndex > 0 ? (
          <button onClick={prev} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" /> {content.back}</button>
        ) : <div />}
        {step !== 'welcome' && step !== 'schedule' && (
          <button onClick={next} data-testid="onboarding-next" className="flex items-center gap-2 px-5 py-2 ws-fab rounded-xl text-sm font-medium transition-all">
            {content.continueBtn} <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {step === 'schedule' && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {isTeacherRole && (
              <button
                type="button"
                data-testid="onboarding-open-teacher"
                onClick={() => completeOnboarding({ openTeacher: true })}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium border border-brand-500/30 bg-brand-600/10 text-brand-800 hover:bg-brand-600/20 transition-all text-sm"
              >
                <Users className="w-4 h-4" /> {content.teacherDashboardCta}
              </button>
            )}
            <button
              type="button"
              onClick={() => completeOnboarding({ openUpload: true })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 ws-fab rounded-xl text-sm font-medium transition-all"
            >
              <Upload className="w-4 h-4" /> {isTeacherRole ? content.uploadCta : content.beginLearning}
            </button>
          </div>
        )}
      </div>

      {step === 'schedule' && (
        <div className="pb-6 px-4 text-center">
          <button
            type="button"
            data-testid="onboarding-skip-explore"
            onClick={() => completeOnboarding({ exploreDemoMode: true })}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {content.skipExplore}
          </button>
        </div>
      )}
    </div>
  );
}
