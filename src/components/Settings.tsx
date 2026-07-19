import { useState, useRef, useMemo } from 'react';
import {
  Brain, BookOpen, Target, Zap,
  Gauge, Shield, Calendar, Palette, Database, KeyRound,
  Moon, Sun, Sparkles, Layers, Monitor,
} from '@/lib/lucide-shim';
import type { LucideIcon } from '@/lib/lucide-shim';
import type { UserSettings, Task } from '../types';
import { cn } from '../utils/cn';
import { clearAllSessionData, downloadBackup, importSessionData } from '../lib/sessionBackup';
import { authLogin, authRegister, pushRemoteLibrary, createCheckoutSession, authExportAccount, authDeleteAccount, type AuthSession } from '../lib/authClient';
import { GoogleIntegrationsPanel } from './GoogleIntegrationsPanel';
import { googleAuthStartUrl } from '../lib/googleClient';
import { loadLibrarySync } from '../lib/libraryStorage';
import { Page, PageHeader, AnimatedCard } from './ui/primitives';
import { WorkspaceTTIPanel } from './WorkspaceTTIPanel';
import { useI18n } from '../lib/i18n';
import { getSettingsContent } from '../lib/settingsContent';
import { RagIndexProgressBanner } from './RagIndexProgressBanner';
import { PluginMarketplacePanel } from './PluginMarketplacePanel';
import { privacyPolicyUrl } from '../lib/siteConfig';
import { ColorCodingReferencePanel } from './ui/ColorCodingReferencePanel';
import {
  getNotebookLmParityOverride,
  resolveNotebookLmParity,
  setNotebookLmParityOverride,
} from '../lib/notebookLmParity';
import { useMinimalTheme } from '../lib/useMinimalTheme';

import { type TaskCalendarSyncUpdate } from '../lib/taskCalendarSync';

interface SettingsProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
  onPullLibrary?: () => Promise<unknown>;
  onPullSession?: () => Promise<unknown>;
  onPushSession?: () => Promise<unknown>;
  onSyncAccount?: () => Promise<unknown>;
  onRefreshPlan?: () => Promise<unknown>;
  onReplayProductTour?: () => void;
  tasks?: Task[];
  onApplyCalendarSync?: (updates: TaskCalendarSyncUpdate[]) => void;
}

export function Settings({
  settings,
  onUpdate,
  onPullLibrary,
  onPullSession,
  onPushSession,
  onSyncAccount,
  onRefreshPlan,
  onReplayProductTour,
  tasks = [],
  onApplyCalendarSync,
}: SettingsProps) {
  const { t } = useI18n();
  const c = getSettingsContent(settings.language);
  const isMinimal = useMinimalTheme();
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState(settings.authEmail ?? '');
  const [authPassword, setAuthPassword] = useState('');
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [parityTick, setParityTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parityOverride = useMemo(() => {
    void parityTick;
    return getNotebookLmParityOverride();
  }, [parityTick]);
  const parityEffective = useMemo(() => {
    void parityTick;
    return resolveNotebookLmParity();
  }, [parityTick]);
  const parityToggleValue =
    parityOverride === true ? 'on' : parityOverride === false ? 'off' : 'default';

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = importSessionData(text);
    if (result.ok) {
      setBackupStatus(c.formatImported(result.keysImported));
    } else {
      setBackupStatus(result.error);
    }
  };

  const proxyBase = (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');

  const finishAuth = async (session: AuthSession, label: string) => {
    onUpdate({
      authToken: session.token,
      authEmail: session.email,
      authPlan: session.plan ?? 'free',
      llmProxyUrl: settings.llmProxyUrl ?? `${proxyBase}/v1`,
    });
    if (onSyncAccount) {
      await onSyncAccount();
      setAuthStatus(c.formatAuthStatusSynced(label, session.email));
      return;
    }
    if (onPullLibrary) await onPullLibrary();
    if (onPullSession) await onPullSession();
    if (onPushSession) await onPushSession();
    setAuthStatus(c.formatAuthStatus(label, session.email));
  };

  const startCheckout = async (plan: 'pro' | 'team') => {
    if (!settings.authToken) {
      setAuthStatus(c.signInBeforeUpgrade);
      return;
    }
    try {
      const origin = window.location.origin;
      const { url } = await createCheckoutSession(settings.authToken, settings, plan, {
        successUrl: `${origin}/?billing=success`,
        cancelUrl: `${origin}/?billing=cancel`,
      });
      if (url) window.location.href = url;
      else setAuthStatus(c.checkoutUrlMissing);
    } catch (e) {
      setAuthStatus(e instanceof Error ? e.message : c.checkoutFailed);
    }
  };

  const settingsSections = useMemo(
    () => [
      { id: 'settings-teaching', label: c.sectionTeachingApproach },
      { id: 'settings-content', label: c.sectionContentBalance },
      { id: 'settings-pacing', label: c.sectionPacingDifficulty },
      { id: 'settings-practice', label: c.sectionPracticeRevision },
      { id: 'settings-plugins', label: t('pluginMarketplaceTitle') },
      { id: 'settings-source', label: c.sectionSourceContent },
      { id: 'settings-goals', label: c.sectionStudyGoals },
      { id: 'settings-ai', label: c.sectionAiLlm },
      { id: 'settings-account', label: c.sectionAccountSync },
      { id: 'settings-google', label: c.sectionGoogleWorkspace },
      { id: 'settings-interface', label: c.sectionInterface },
      { id: 'settings-data', label: c.sectionDataProgress },
      { id: 'settings-developer', label: c.sectionDeveloper },
    ],
    [c, t],
  );

  return (
    <Page className={cn('ux-flow-shell', isMinimal && 'enterprise-calm')}>
      <PageHeader
        title={c.pageTitle}
        subtitle={c.pageSubtitle}
        icon={Brain}
      />

      <nav
        className="ux-settings-nav sticky top-16 z-20 -mx-1 mb-4 flex gap-2 overflow-x-auto pb-2 pt-1"
        aria-label={t('settingsSectionNav')}
        data-testid="settings-section-nav"
      >
        {settingsSections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="platform-pill shrink-0 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-brand-700"
          >
            {section.label}
          </a>
        ))}
      </nav>

      {/* Wave P-L01 — masonry column flow. CSS multi-column packs
          asymmetric-height section cards greedily top-to-bottom left-to-right,
          eliminating the large vertical whitespace that CSS Grid + items-start
          leaves under the shorter column. `break-inside-avoid` per child pins
          each SettingsSection so it never splits across columns.
          Falls back to single column below `lg` breakpoint. */}
      <div className="lg:columns-2 lg:gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
      <SettingsSection id="settings-teaching" title={c.sectionTeachingApproach} icon={<Brain className="w-5 h-5 text-brand-400" />} delay={0.05}>
        <ToggleRow label={c.labelTeachingStyle} options={c.teachingStyleOptions} value={settings.teachingStyle} onChange={v => onUpdate({ teachingStyle: v as UserSettings['teachingStyle'] })} />
        <ToggleRow label={c.labelExplanationDepth} options={c.explanationDepthOptions} value={settings.explanationDepth} onChange={v => onUpdate({ explanationDepth: v as UserSettings['explanationDepth'] })} />
        <ToggleRow label={c.labelFeedbackTone} options={c.feedbackToneOptions} value={settings.feedbackTone} onChange={v => onUpdate({ feedbackTone: v as UserSettings['feedbackTone'] })} />
      </SettingsSection>

      <SettingsSection id="settings-content" title={c.sectionContentBalance} icon={<BookOpen className="w-5 h-5 text-accent-teal" />} delay={0.1}>
        <SliderRow label={c.labelTheoryVsPractice} leftLabel={c.theoryVsPracticeLeft} rightLabel={c.theoryVsPracticeRight} value={settings.theoryVsPractice} onChange={v => onUpdate({ theoryVsPractice: v })} />
        <ToggleRow label={c.labelQuestionFrequency} options={c.questionFrequencyOptions} value={settings.questionFrequency} onChange={v => onUpdate({ questionFrequency: v as UserSettings['questionFrequency'] })} />
        <ToggleRow label={c.labelExampleDensity} options={c.exampleDensityOptions} value={settings.exampleDensity} onChange={v => onUpdate({ exampleDensity: v as UserSettings['exampleDensity'] })} />
        <ToggleRow label={c.labelDiagramFrequency} options={c.diagramFrequencyOptions} value={settings.diagramFrequency} onChange={v => onUpdate({ diagramFrequency: v as UserSettings['diagramFrequency'] })} />
      </SettingsSection>

      <SettingsSection id="settings-pacing" title={c.sectionPacingDifficulty} icon={<Gauge className="w-5 h-5 text-accent-amber" />} delay={0.15}>
        <ToggleRow label={c.labelPacing} options={c.pacingOptions} value={settings.pacing} onChange={v => onUpdate({ pacing: v as UserSettings['pacing'] })} />
        <ToggleRow label={c.labelChallengeLevel} options={c.challengeLevelOptions} value={settings.challengeLevel} onChange={v => onUpdate({ challengeLevel: v as UserSettings['challengeLevel'] })} />
        <ToggleRow label={c.labelLessonLength} options={c.lessonLengthOptions} value={settings.lessonLength} onChange={v => onUpdate({ lessonLength: v as UserSettings['lessonLength'] })} />
        <SliderRow label={c.labelMasteryThreshold} leftLabel="60%" rightLabel="100%" value={settings.masteryThreshold} onChange={v => onUpdate({ masteryThreshold: v })} min={60} max={100} />
      </SettingsSection>

      <SettingsSection id="settings-practice" title={c.sectionPracticeRevision} icon={<Target className="w-5 h-5 text-accent-cyan" />} delay={0.2}>
        <ToggleRow label={c.labelPracticeIntensity} options={c.practiceIntensityOptions} value={settings.practiceIntensity} onChange={v => onUpdate({ practiceIntensity: v as UserSettings['practiceIntensity'] })} />
        <ToggleRow label={c.labelRevisionLoops} options={c.revisionLoopsOptions} value={settings.revisionLoops} onChange={v => onUpdate({ revisionLoops: v as UserSettings['revisionLoops'] })} />
      </SettingsSection>

      <SettingsSection id="settings-plugins" title={t('pluginMarketplaceTitle')} icon={<Zap className="w-5 h-5 text-brand-400" />} delay={0.22}>
        <PluginMarketplacePanel />
      </SettingsSection>

      <SettingsSection id="settings-source" title={c.sectionSourceContent} icon={<Shield className="w-5 h-5 text-accent-emerald" />} delay={0.25}>
        <ToggleRow label={c.labelSourceMode} options={c.sourceModeOptions} value={settings.sourceMode} onChange={v => onUpdate({ sourceMode: v as UserSettings['sourceMode'] })} />
        <p className="text-xs text-text-muted mt-1 px-1">
          {c.sourceModeHint}
        </p>
      </SettingsSection>

      <SettingsSection id="settings-goals" title={c.sectionStudyGoals} icon={<Calendar className="w-5 h-5 text-accent-rose" />} delay={0.3}>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-text-secondary block mb-1">{c.labelDailyStudyGoal}</label>
            <div className="flex items-center gap-3">
              {[15, 30, 45, 60, 90].map(m => (
                <button key={m} onClick={() => onUpdate({ dailyGoalMinutes: m })}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    settings.dailyGoalMinutes === m ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'border border-border-subtle text-text-tertiary'
                  )}>{m}m</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">{c.labelExamDate}</label>
            <input type="date" value={settings.examDate || ''} onChange={e => onUpdate({ examDate: e.target.value })}
              className="px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50" />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection id="settings-ai" title={c.sectionAiLlm} icon={<Brain className="w-5 h-5 text-brand-400" />} delay={0.32}>
        <div>
          <label className="text-xs text-text-secondary block mb-2">{c.labelOpenAiKey}</label>
          <input
            type="password"
            value={settings.openaiApiKey ?? ''}
            onChange={(e) => onUpdate({ openaiApiKey: e.target.value || undefined })}
            placeholder={c.placeholderOpenAiKey}
            className="w-full px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-2">{c.labelModel}</label>
          <input
            type="text"
            value={settings.llmModel ?? 'gpt-4o-mini'}
            onChange={(e) => onUpdate({ llmModel: e.target.value || undefined })}
            className="w-full px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-2">{c.labelApiBaseUrl}</label>
          <input
            type="url"
            value={settings.llmBaseUrl ?? ''}
            onChange={(e) => onUpdate({ llmBaseUrl: e.target.value || undefined })}
            placeholder={c.placeholderApiBaseUrl}
            className="w-full px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-2">{c.labelManagedProxyUrl}</label>
          <input
            type="url"
            value={settings.llmProxyUrl ?? ''}
            onChange={(e) => onUpdate({ llmProxyUrl: e.target.value || undefined })}
            placeholder={c.placeholderManagedProxyUrl}
            className="w-full px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
          />
          <p className="text-[11px] text-text-muted mt-1.5">{c.managedProxyHint}</p>
        </div>
        <ToggleRow label={c.labelUseLlm} options={c.useLlmOptions} value={settings.useLlm !== false ? 'true' : 'false'} onChange={v => onUpdate({ useLlm: v === 'true' })} />
        <p className="text-xs text-text-muted mt-1 px-1">
          {c.llmOfflineHint}
        </p>
        <ToggleRow label={c.labelUseVisionOcr} options={c.visionOcrOptions} value={settings.useVisionOcr !== false ? 'true' : 'false'} onChange={v => onUpdate({ useVisionOcr: v === 'true' })} />
        <p className="text-xs text-text-muted mt-1 px-1">
          {c.visionOcrHint}
        </p>
      </SettingsSection>

      <SettingsSection id="settings-account" title={c.sectionAccountSync} icon={<KeyRound className="w-5 h-5 text-accent-teal" />} delay={0.34}>
        {settings.authToken && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs px-2 py-1 rounded-lg bg-surface-hover border border-border-subtle">
              {c.planLabel} <strong className="text-brand-300">{settings.authPlan ?? 'free'}</strong>
            </span>
            {(settings.authPlan ?? 'free') === 'free' && (
              <>
                <button
                  type="button"
                  data-testid="upgrade-pro"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white"
                  onClick={() => void startCheckout('pro')}
                >
                  {c.upgradePro}
                </button>
                <button
                  type="button"
                  data-testid="upgrade-team"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-500/40 text-brand-300"
                  onClick={() => void startCheckout('team')}
                >
                  {c.upgradeTeam}
                </button>
              </>
            )}
            {onRefreshPlan && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary"
                onClick={async () => {
                  try {
                    await onRefreshPlan();
                    setAuthStatus(c.planRefreshed);
                  } catch (e) {
                    setAuthStatus(e instanceof Error ? e.message : c.refreshFailed);
                  }
                }}
              >
                {c.refreshPlan}
              </button>
            )}
          </div>
        )}
        <div>
          <label className="text-xs text-text-secondary block mb-2">{c.labelProxyBaseUrl}</label>
          <input
            type="url"
            value={settings.authProxyBase ?? settings.llmProxyUrl?.replace(/\/v1\/?$/, '') ?? ''}
            onChange={(e) => onUpdate({ authProxyBase: e.target.value || undefined })}
            placeholder={c.placeholderProxyBaseUrl}
            className="w-full px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder={c.placeholderEmail}
            className="px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm"
          />
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder={c.placeholderPassword}
            className="px-4 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white"
            onClick={async () => {
              try {
                const session = await authLogin(authEmail, authPassword, settings);
                await finishAuth(session, c.signedInAs);
              } catch (e) {
                setAuthStatus(e instanceof Error ? e.message : c.loginFailed);
              }
            }}
          >
            {c.signIn}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border-subtle"
            onClick={async () => {
              try {
                const session = await authRegister(authEmail, authPassword, settings);
                await finishAuth(session, c.registeredAs);
              } catch (e) {
                setAuthStatus(e instanceof Error ? e.message : c.registerFailed);
              }
            }}
          >
            {c.register}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border-subtle inline-flex items-center gap-2"
            data-testid="settings-google-sign-in"
            onClick={() => {
              window.location.href = googleAuthStartUrl(
                settings,
                'signin',
                `${window.location.origin}/?view=settings`,
              );
            }}
          >
            {c.google}
          </button>
          {settings.authToken && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border-subtle"
              onClick={() => onUpdate({ authToken: undefined, authEmail: undefined, authPlan: undefined })}
            >
              {c.signOut}
            </button>
          )}
          {settings.authToken && onPullLibrary && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border-subtle"
              onClick={async () => {
                try {
                  await onPullLibrary();
                  setAuthStatus(c.libraryPulled);
                } catch (e) {
                  setAuthStatus(e instanceof Error ? e.message : c.pullFailed);
                }
              }}
            >
              {c.pullLibrary}
            </button>
          )}
          {settings.authToken && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-accent-teal/40 text-accent-teal"
              onClick={async () => {
                try {
                  const lib = loadLibrarySync();
                  await pushRemoteLibrary(settings.authToken!, settings, lib);
                  setAuthStatus(c.librarySynced);
                } catch (e) {
                  setAuthStatus(e instanceof Error ? e.message : c.syncFailed);
                }
              }}
            >
              {c.pushLibrary}
            </button>
          )}
          {settings.authToken && onPullSession && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border-subtle"
              onClick={async () => {
                try {
                  await onPullSession();
                  setAuthStatus(c.progressPulled);
                } catch (e) {
                  setAuthStatus(e instanceof Error ? e.message : c.sessionPullFailed);
                }
              }}
            >
              {c.pullProgress}
            </button>
          )}
          {settings.authToken && onPushSession && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-accent-teal/40 text-accent-teal"
              onClick={async () => {
                try {
                  await onPushSession();
                  setAuthStatus(c.progressSynced);
                } catch (e) {
                  setAuthStatus(e instanceof Error ? e.message : c.sessionPushFailed);
                }
              }}
            >
              {c.pushProgress}
            </button>
          )}
        </div>
        {settings.authEmail && (
          <p className="text-xs text-text-secondary">{c.loggedIn} {settings.authEmail}</p>
        )}
        {settings.authToken && (
          <RagIndexProgressBanner
            settings={settings}
            lang={settings.language === 'el' ? 'el' : 'en'}
            variant="panel"
            className="mt-3"
          />
        )}
        {settings.authToken && (
          <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
            <p className="text-xs font-semibold text-text-primary">{t('gdprExportData')}</p>
            <p className="text-[11px] text-text-muted">{t('gdprExportHint')}</p>
            <p className="text-[11px]">
              <a
                href={privacyPolicyUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
                data-testid="privacy-policy-link"
              >
                Privacy policy
              </a>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="gdpr-export-account"
                className="px-3 py-2 rounded-xl text-xs font-medium border border-border-subtle text-text-secondary hover:border-brand-500/30"
                onClick={async () => {
                  if (!settings.authToken) return;
                  try {
                    const blob = await authExportAccount(settings.authToken, settings);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `synapse-export-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setAuthStatus(t('gdprExportSuccess'));
                  } catch (e) {
                    setAuthStatus(e instanceof Error ? e.message : c.exportFailed);
                  }
                }}
              >
                {t('gdprExportData')}
              </button>
            </div>
            <p className="text-[11px] text-text-muted pt-1">{t('gdprDeleteHint')}</p>
            <label className="text-[11px] text-text-secondary block">{t('gdprDeleteConfirm')}</label>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={settings.authEmail ?? 'email@example.com'}
              className="w-full px-3 py-2 rounded-xl bg-surface-input border border-border-subtle text-sm"
            />
            <button
              type="button"
              data-testid="gdpr-delete-account"
              disabled={!deleteConfirmEmail.trim()}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-accent-rose/30 text-accent-rose hover:bg-accent-rose/10 disabled:opacity-50"
              onClick={async () => {
                if (!settings.authToken || !settings.authEmail) return;
                if (deleteConfirmEmail.trim().toLowerCase() !== settings.authEmail.toLowerCase()) {
                  setAuthStatus(t('gdprDeleteConfirm'));
                  return;
                }
                if (!window.confirm(t('gdprDeleteHint'))) return;
                try {
                  await authDeleteAccount(settings.authToken, settings, deleteConfirmEmail.trim());
                  onUpdate({
                    authToken: undefined,
                    authEmail: undefined,
                    authPlan: undefined,
                  });
                  clearAllSessionData();
                  setDeleteConfirmEmail('');
                  setAuthStatus(t('gdprDeleteSuccess'));
                } catch (e) {
                  setAuthStatus(e instanceof Error ? e.message : c.deleteFailed);
                }
              }}
            >
              {t('gdprDeleteAccount')}
            </button>
          </div>
        )}
        {authStatus && <p className="text-xs text-text-muted">{authStatus}</p>}
      </SettingsSection>

      <SettingsSection
        id="settings-google"
        title={c.sectionGoogleWorkspace}
        icon={<KeyRound className="w-5 h-5 text-brand-400" />}
        delay={0.32}
      >
        <GoogleIntegrationsPanel
          settings={settings}
          onUpdate={onUpdate}
          onAuthComplete={(msg) => setAuthStatus(msg)}
          synapseTasks={tasks}
          onCalendarSync={onApplyCalendarSync}
          lang={settings.language}
        />
      </SettingsSection>

      <SettingsSection id="settings-interface" title={c.sectionInterface} icon={<Palette className="w-5 h-5 text-brand-300" />} delay={0.35}>
        <ThemePickerRow
          label={c.labelTheme}
          hint={c.themeHint}
          options={c.themeOptions}
          value={settings.theme}
          onChange={v => onUpdate({ theme: v as UserSettings['theme'] })}
        />
        <ToggleRow label={c.labelLanguage} options={c.languageOptions} value={settings.language} onChange={v => onUpdate({ language: v as UserSettings['language'] })} />
        <ToggleRow
          label={c.labelChromeDensity}
          options={c.chromeDensityOptions}
          value={settings.chromeDensity ?? 'comfortable'}
          onChange={v => onUpdate({ chromeDensity: v as UserSettings['chromeDensity'] })}
        />
      </SettingsSection>

      <div className="lg:col-span-2">
        <ColorCodingReferencePanel />
      </div>

      <SettingsSection id="settings-data" title={c.sectionDataProgress} icon={<Database className="w-5 h-5 text-accent-cyan" />} delay={0.38}>
        <ToggleRow label={c.labelDemoContent} options={c.demoContentOptions} value={settings.showDemoContent ? 'on' : 'off'} onChange={v => onUpdate({ showDemoContent: v === 'on' })} />
        <p className="text-[11px] text-text-muted">{c.demoContentHint}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { downloadBackup(); setBackupStatus(c.backupDownloaded); }}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30"
          >
            {c.exportBackup}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-border-subtle text-text-secondary hover:border-brand-500/30"
          >
            {c.importBackup}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(c.clearConfirm)) {
                const n = clearAllSessionData();
                setBackupStatus(c.formatCleared(n));
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-accent-rose/30 text-accent-rose hover:bg-accent-rose/10"
          >
            {c.clearLocalData}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            e.target.value = '';
          }}
        />
        {backupStatus && (
          <p className="text-xs text-text-secondary px-1">{backupStatus}</p>
        )}
      </SettingsSection>

      <SettingsSection id="settings-developer" title={c.sectionDeveloper} icon={<Gauge className="w-5 h-5 text-accent-amber" />} delay={0.39}>
        <p className="text-xs text-text-secondary">{c.developerHint}</p>
        <WorkspaceTTIPanel />
        <div className="pt-2 border-t border-border-subtle space-y-2" data-testid="settings-notebooklm-parity">
          <ToggleRow
            label={t('settingsNotebookLmParity')}
            options={[
              { value: 'default', label: t('settingsNotebookLmParityDefault') },
              { value: 'on', label: t('settingsNotebookLmParityOn') },
              { value: 'off', label: t('settingsNotebookLmParityOff') },
            ]}
            value={parityToggleValue}
            onChange={(v) => {
              if (v === 'on') setNotebookLmParityOverride(true);
              else if (v === 'off') setNotebookLmParityOverride(false);
              else setNotebookLmParityOverride(null);
              setParityTick((n) => n + 1);
            }}
          />
          <p className="text-[11px] text-text-muted">
            {t('settingsNotebookLmParityHint')}{' '}
            ({parityEffective ? t('settingsNotebookLmParityOn') : t('settingsNotebookLmParityOff')})
          </p>
        </div>
        {onReplayProductTour && (
          <div className="pt-2 border-t border-border-subtle">
            <p className="text-xs text-text-secondary mb-2">{t('tourReplayHint')}</p>
            <button
              type="button"
              onClick={onReplayProductTour}
              data-testid="settings-replay-product-tour"
              className="px-3 py-2 rounded-lg text-xs font-medium border border-border-subtle hover:bg-surface-hover transition-colors"
            >
              {t('tourReplay')}
            </button>
          </div>
        )}
      </SettingsSection>
      </div>

      <div className="platform-panel-soft">
        <p className="text-xs text-text-tertiary leading-relaxed flex items-start gap-2">
          <Zap className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          {c.footerNote}
        </p>
      </div>
    </Page>
  );
}

function SettingsSection({ id, title, icon, children, delay }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode; delay: number }) {
  return (
    <AnimatedCard id={id} delay={delay} padding="md" className="scroll-mt-28">
      <h3 className="ws-serif text-sm font-medium flex items-center gap-2 mb-4 text-text-primary">{icon}{title}</h3>
      <div className="space-y-4">{children}</div>
    </AnimatedCard>
  );
}

function ToggleRow({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-text-secondary block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              value === opt.value ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'border border-border-subtle text-text-tertiary hover:text-text-secondary'
            )}>{opt.label}</button>
        ))}
      </div>
    </div>
  );
}

const THEME_ICONS: Record<string, LucideIcon> = {
  dark: Moon,
  light: Sun,
  spectrum: Sparkles,
  blueprint: Layers,
  system: Monitor,
};

/** L-S01 / K-S01: denser theme chips with Phosphor icons (no emoji). */
function ThemePickerRow({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div data-testid="settings-theme-picker">
      <label className="text-xs text-text-secondary block mb-2">{label}</label>
      {hint && (
        <p className="text-[11px] leading-snug mb-2" data-testid="settings-theme-hint">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const Icon = THEME_ICONS[opt.value] ?? Palette;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all',
                /* Wave P-3 C12 — .ux-theme-chip-active uses brand-700 ink on light
                   themes (brand-300 collapsed to ~2:1 on warm-light white cards). */
                active
                  ? 'ux-theme-chip-active'
                  : 'border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-brand-500/25',
              )}
              aria-pressed={active}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderRow({ label, leftLabel, rightLabel, value, onChange, min = 0, max = 100 }: { label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="text-xs text-text-secondary block mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-text-muted w-20 text-right">{leftLabel}</span>
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1" />
        <span className="text-[10px] text-text-muted w-20">{rightLabel}</span>
      </div>
    </div>
  );
}
