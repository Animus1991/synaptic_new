import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, Sparkles, Users, Building2,
  ArrowRight, ArrowLeft, Upload, Target, Brain,
  Calendar, Clock, CheckCircle2
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

type Step = 'welcome' | 'role' | 'goals' | 'preferences' | 'upload';

export function Onboarding({ onComplete }: OnboardingProps) {
  const { lang } = useI18n();
  const content = getOnboardingContent(lang);
  const { roles, goals } = content;
  const [step, setStep] = useState<Step>('welcome');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [dailyTime, setDailyTime] = useState(30);
  const [examDate, setExamDate] = useState('');
  const [displayName, setDisplayName] = useState('');

  const stepIndex = ['welcome', 'role', 'goals', 'preferences', 'upload'].indexOf(step);
  const progress = ((stepIndex + 1) / 5) * 100;

  const next = () => {
    const steps: Step[] = ['welcome', 'role', 'goals', 'preferences', 'upload'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };
  const prev = () => {
    const steps: Step[] = ['welcome', 'role', 'goals', 'preferences', 'upload'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const isTeacherRole = selectedRole === 'tutor';

  const roleIcons: Record<string, typeof GraduationCap> = {
    university: GraduationCap,
    highschool: BookOpen,
    selflearner: Sparkles,
    tutor: Users,
    company: Building2,
  };

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col">
      {/* Progress */}
      <div className="h-1 bg-surface-hover">
        <div className="h-1 bg-brand-700 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl platform-brand-icon flex items-center justify-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-medium ws-serif">{content.welcomeTitle}</h1>
                <p className="text-text-secondary leading-relaxed max-w-md mx-auto">
                  {content.welcomeBody}
                </p>
                <div className="max-w-sm mx-auto text-left">
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
                <button onClick={next} data-testid="onboarding-continue" className="inline-flex items-center gap-2 px-8 py-3 ws-fab rounded-xl font-medium transition-all">
                  {content.letsGo} <ArrowRight className="w-4 h-4" />
                </button>
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
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'preferences' && (
              <motion.div key="prefs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
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
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover/50 text-xs text-text-muted flex items-start gap-2">
                    <Brain className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    {content.adaptiveHint}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl platform-brand-icon flex items-center justify-center">
                  <Target className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-medium ws-serif">{content.uploadTitle}</h2>
                <p className="text-text-secondary leading-relaxed max-w-md mx-auto">
                  {content.uploadBody}
                </p>
                <p className="text-xs text-brand-700/90 max-w-md mx-auto rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
                  {isTeacherRole ? content.teacherUploadHint : content.uploadWorkspaceHint}
                </p>
                <div className="flex flex-col gap-3">
                  {isTeacherRole && (
                    <button
                      type="button"
                      data-testid="onboarding-open-teacher"
                      onClick={() => onComplete({
                        role: selectedRole ?? undefined,
                        goals: selectedGoals,
                        dailyGoalMinutes: dailyTime,
                        examDate: examDate || undefined,
                        openTeacher: true,
                        displayName: displayName.trim() || undefined,
                      })}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium border border-brand-500/30 bg-brand-600/10 text-brand-800 hover:bg-brand-600/20 transition-all"
                    >
                      <Users className="w-4 h-4" /> {content.teacherDashboardCta}
                    </button>
                  )}
                  <button onClick={() => onComplete({
                    role: selectedRole ?? undefined,
                    goals: selectedGoals,
                    dailyGoalMinutes: dailyTime,
                    examDate: examDate || undefined,
                    openUpload: true,
                    displayName: displayName.trim() || undefined,
                  })} className="inline-flex items-center justify-center gap-2 px-8 py-3 ws-fab rounded-xl font-medium transition-all">
                    <Upload className="w-4 h-4" /> {content.uploadCta}
                  </button>
                  <button
                    type="button"
                    data-testid="onboarding-skip-explore"
                    onClick={() => onComplete({
                    role: selectedRole ?? undefined,
                    goals: selectedGoals,
                    dailyGoalMinutes: dailyTime,
                    examDate: examDate || undefined,
                    displayName: displayName.trim() || undefined,
                    exploreDemoMode: true,
                  })} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                    {content.skipExplore}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 flex items-center justify-between max-w-lg mx-auto w-full">
        {stepIndex > 0 ? (
          <button onClick={prev} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" /> {content.back}</button>
        ) : <div />}
        {step !== 'upload' && step !== 'welcome' && (
          <button onClick={next} data-testid="onboarding-next" className="flex items-center gap-2 px-5 py-2 ws-fab rounded-xl text-sm font-medium transition-all">
            {content.continueBtn} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
