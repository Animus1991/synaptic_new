import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, Sparkles, Users, Building2,
  ArrowRight, ArrowLeft, Upload, Target, Brain,
  Calendar, Clock, CheckCircle2, Zap, Search, AlertCircle,
} from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';
import { getOnboardingContent } from '../lib/onboardingContent';
import {
  type OnboardingGoalId,
  type OnboardingRoleId,
  type OnboardingValidationError,
  validateOnboardingStep,
} from '../lib/onboardingProfile';
import {
  isResumedDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingWizardStep,
} from '../lib/onboardingDraft';
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
    skipWizard?: boolean;
  }) => void;
}

type Step = OnboardingWizardStep;

const STEP_ORDER: Step[] = ['welcome', 'role', 'goals', 'schedule'];

function initFromDraft() {
  const draft = loadOnboardingDraft();
  if (!draft) {
    return {
      step: 'welcome' as Step,
      selectedRole: null as OnboardingRoleId | null,
      selectedGoals: [] as OnboardingGoalId[],
      dailyTime: 30,
      examDate: '',
      displayName: '',
      resumed: false,
    };
  }
  return {
    step: draft.step,
    selectedRole: draft.selectedRole,
    selectedGoals: draft.selectedGoals,
    dailyTime: draft.dailyTime,
    examDate: draft.examDate,
    displayName: draft.displayName,
    resumed: isResumedDraft(draft),
  };
}

function validationMessage(
  error: OnboardingValidationError,
  content: ReturnType<typeof getOnboardingContent>,
): string {
  switch (error) {
    case 'roleRequired': return content.validationRoleRequired;
    case 'goalRequired': return content.validationGoalRequired;
    case 'examDateRequired': return content.validationExamDateRequired;
    case 'examDatePast': return content.validationExamDatePast;
    default: return '';
  }
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { lang } = useI18n();
  const content = getOnboardingContent(lang);
  const { roles, goals, features } = content;
  const initial = useMemo(() => initFromDraft(), []);
  const [step, setStep] = useState<Step>(initial.step);
  const [selectedRole, setSelectedRole] = useState<OnboardingRoleId | null>(initial.selectedRole);
  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoalId[]>(initial.selectedGoals);
  const [dailyTime, setDailyTime] = useState(initial.dailyTime);
  const [examDate, setExamDate] = useState(initial.examDate);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [showResumeHint] = useState(initial.resumed);
  const [validationError, setValidationError] = useState<OnboardingValidationError | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveOnboardingDraft({
      step,
      selectedRole,
      selectedGoals,
      dailyTime,
      examDate,
      displayName,
    });
  }, [step, selectedRole, selectedGoals, dailyTime, examDate, displayName]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;
  const progressLabel = content.progressAria
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(STEP_ORDER.length));

  const clearValidation = () => {
    if (validationError) setValidationError(null);
  };

  const showValidation = (error: OnboardingValidationError) => {
    setValidationError(error);
    window.requestAnimationFrame(() => errorRef.current?.focus());
  };

  const next = () => {
    if (step === 'role') {
      const error = validateOnboardingStep('role', {
        role: selectedRole,
        goals: selectedGoals,
        examDate,
      });
      if (error) {
        showValidation(error);
        return;
      }
    }
    if (step === 'goals') {
      const error = validateOnboardingStep('goals', {
        role: selectedRole,
        goals: selectedGoals,
        examDate,
      });
      if (error) {
        showValidation(error);
        return;
      }
    }
    clearValidation();
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };

  const prev = () => {
    clearValidation();
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const toggleGoal = (id: OnboardingGoalId) => {
    clearValidation();
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const isTeacherRole = selectedRole === 'tutor';
  const hasExamGoal = selectedGoals.includes('exam');
  const selectedRoleMeta = roles.find((role) => role.id === selectedRole);
  const selectedGoalLabels = goals
    .filter((goal) => selectedGoals.includes(goal.id as OnboardingGoalId))
    .map((goal) => goal.label);
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

  const buildPayload = () => ({
    role: selectedRole ?? undefined,
    goals: selectedGoals,
    dailyGoalMinutes: dailyTime,
    examDate: examDate || undefined,
    displayName: displayName.trim() || undefined,
  });

  const completeOnboarding = (opts?: {
    openUpload?: boolean;
    openTeacher?: boolean;
    exploreDemoMode?: boolean;
    skipWizard?: boolean;
  }) => {
    if (!opts?.skipWizard && step === 'schedule') {
      const error = validateOnboardingStep('schedule', {
        role: selectedRole,
        goals: selectedGoals,
        examDate,
      });
      if (error) {
        showValidation(error);
        return;
      }
    }
    clearValidation();
    onComplete({
      ...buildPayload(),
      openUpload: opts?.openUpload,
      openTeacher: opts?.openTeacher,
      exploreDemoMode: opts?.exploreDemoMode,
      skipWizard: opts?.skipWizard,
    });
  };

  const validationText = validationError ? validationMessage(validationError, content) : null;

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col ux-flow-shell ux-onboarding-shell">
      <div
        className="h-1 bg-surface-hover"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEP_ORDER.length}
        aria-label={progressLabel}
      >
        <div
          className="h-1 bg-brand-700 ux-flow-progress-fill transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {showResumeHint && (
            <p
              data-testid="onboarding-resume-hint"
              className="mb-4 text-center text-xs text-brand-400/90"
            >
              {content.resumeDraftHint}
            </p>
          )}
          {validationText && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              data-testid="onboarding-validation-error"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 outline-none focus:ring-2 focus:ring-red-400/50"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              {validationText}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
                aria-current="step"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl platform-brand-icon flex items-center justify-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="text-center space-y-3">
                  <h1 className="text-xl font-semibold ws-serif">{content.welcomeTitle}</h1>
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
                      {content.nameLabel}{' '}
                      <span className="text-text-muted">{content.nameOptional}</span>
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
                  <button
                    onClick={next}
                    data-testid="onboarding-continue"
                    className="w-full inline-flex items-center justify-center gap-2 px-8 py-3 ws-fab rounded-xl font-medium transition-all"
                  >
                    {content.letsGo} <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="onboarding-continue-without-upload"
                    onClick={() => completeOnboarding({ skipWizard: true })}
                    className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {content.continueWithoutUpload}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'role' && (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
                aria-current="step"
              >
                <div className="text-center">
                  <h2 id="onb-role-title" className="text-xl font-medium ws-serif">{content.roleTitle}</h2>
                  <p className="text-text-secondary mt-1 text-sm">{content.roleSubtitle}</p>
                </div>
                <div className="space-y-2" role="radiogroup" aria-labelledby="onb-role-title">
                  {roles.map((role) => {
                    const RoleIcon = roleIcons[role.id] ?? GraduationCap;
                    const roleId = role.id as OnboardingRoleId;
                    const selected = selectedRole === roleId;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-testid={`onboarding-role-${role.id}`}
                        onClick={() => {
                          clearValidation();
                          setSelectedRole(roleId);
                        }}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                          selected
                            ? 'border-brand-500/50 bg-brand-500/10'
                            : 'border-border-subtle hover:border-brand-500/20',
                        )}
                      >
                        <RoleIcon
                          className={cn('w-6 h-6', selected ? 'text-brand-400' : 'text-text-tertiary')}
                        />
                        <div>
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-xs text-text-tertiary">{role.desc}</p>
                        </div>
                        {selected && <CheckCircle2 className="w-5 h-5 text-brand-400 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
                aria-current="step"
              >
                <div className="text-center">
                  <h2 id="onb-goals-title" className="text-xl font-medium ws-serif">{content.goalsTitle}</h2>
                  <p className="text-text-secondary mt-1 text-sm">{content.goalsSubtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="onb-goals-title">
                  {goals.map((goal) => {
                    const goalId = goal.id as OnboardingGoalId;
                    const selected = selectedGoals.includes(goalId);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        aria-pressed={selected}
                        data-testid={`onboarding-goal-${goal.id}`}
                        onClick={() => toggleGoal(goalId)}
                        className={cn(
                          'p-4 rounded-xl border transition-all text-left',
                          selected
                            ? 'border-brand-500/50 bg-brand-500/10'
                            : 'border-border-subtle hover:border-brand-500/20',
                        )}
                      >
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
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
                aria-current="step"
              >
                <div className="text-center">
                  <h2 className="text-xl font-medium ws-serif">{content.prefsTitle}</h2>
                  <p className="text-text-secondary mt-1 text-sm">{content.prefsSubtitle}</p>
                </div>
                {isTeacherRole && (
                  <div
                    className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-100 flex items-start gap-2"
                    data-testid="onboarding-teacher-preview-hint"
                  >
                    <Users className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                    {content.teacherPreviewHint}
                  </div>
                )}
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-medium">{content.dailyGoal}</span>
                    </div>
                    <div className="flex gap-2">
                      {[15, 30, 45, 60, 90].map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={dailyTime === m}
                          onClick={() => setDailyTime(m)}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
                            dailyTime === m
                              ? 'platform-nav-active'
                              : 'border border-border-subtle text-text-tertiary',
                          )}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-medium">{content.upcomingExam}</span>
                    </div>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => {
                        clearValidation();
                        setExamDate(e.target.value);
                      }}
                      aria-invalid={validationError === 'examDateRequired' || validationError === 'examDatePast'}
                      className="px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50 w-full"
                    />
                    <p className="text-[11px] text-text-tertiary mt-2">
                      {hasExamGoal ? content.examDateHint : content.examOnlyHint}
                    </p>
                  </div>
                  <div className="ux-card">
                    <p className="text-sm font-medium text-text-primary mb-3">{content.summaryTitle}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-text-tertiary">{content.summaryProfile}</span>
                        <span className="text-text-primary font-medium text-right">
                          {selectedRoleMeta?.label ?? '—'}
                        </span>
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
          <button
            type="button"
            onClick={prev}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="w-4 h-4" /> {content.back}
          </button>
        ) : (
          <div />
        )}
        {step !== 'welcome' && step !== 'schedule' && (
          <button
            type="button"
            onClick={next}
            data-testid="onboarding-next"
            className="flex items-center gap-2 px-5 py-2 ws-fab rounded-xl text-sm font-medium transition-all"
          >
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
              data-testid="onboarding-upload"
              onClick={() => completeOnboarding({ openUpload: true })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 ws-fab rounded-xl text-sm font-medium transition-all"
            >
              <Upload className="w-4 h-4" /> {isTeacherRole ? content.uploadCta : content.beginLearning}
            </button>
          </div>
        )}
      </div>

      {step === 'schedule' && (
        <div className="pb-6 px-4 flex flex-col items-center gap-2 max-w-lg mx-auto w-full">
          <button
            type="button"
            data-testid="onboarding-continue-without-upload"
            onClick={() => completeOnboarding()}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {content.continueWithoutUpload}
          </button>
          <button
            type="button"
            data-testid="onboarding-explore-demo"
            onClick={() => completeOnboarding({ exploreDemoMode: true })}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {content.exploreDemoSandbox}
          </button>
        </div>
      )}
    </div>
  );
}
