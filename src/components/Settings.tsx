import { useState, useRef } from 'react';
import {
  Brain, BookOpen, Target, Zap,
  Gauge, Shield, Calendar, Palette, Database, KeyRound
} from '@/lib/lucide-shim';
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
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState(settings.authEmail ?? '');
  const [authPassword, setAuthPassword] = useState('');
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Page className="ux-flow-shell">
      <PageHeader
        title={c.pageTitle}
        subtitle={c.pageSubtitle}
        icon={Brain}
      />

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start [&>*]:mb-6 lg:[&>*]:mb-0">
      <SettingsSection title={c.sectionTeachingApproach} icon={<Brain className="w-5 h-5 text-brand-400" />} delay={0.05}>
        <ToggleRow label={c.labelTeachingStyle} options={c.teachingStyleOptions} value={settings.teachingStyle} onChange={v => onUpdate({ teachingStyle: v as UserSettings['teachingStyle'] })} />
        <ToggleRow label={c.labelExplanationDepth} options={c.explanationDepthOptions} value={settings.explanationDepth} onChange={v => onUpdate({ explanationDepth: v as UserSettings['explanationDepth'] })} />
        <ToggleRow label={c.labelFeedbackTone} options={c.feedbackToneOptions} value={settings.feedbackTone} onChange={v => onUpdate({ feedbackTone: v as UserSettings['feedbackTone'] })} />
      </SettingsSection>

      <SettingsSection title={c.sectionContentBalance} icon={<BookOpen className="w-5 h-5 text-accent-teal" />} delay={0.1}>
        <SliderRow label={c.labelTheoryVsPractice} leftLabel={c.theoryVsPracticeLeft} rightLabel={c.theoryVsPracticeRight} value={settings.theoryVsPractice} onChange={v => onUpdate({ theoryVsPractice: v })} />
        <ToggleRow label={c.labelQuestionFrequency} options={c.questionFrequencyOptions} value={settings.questionFrequency} onChange={v => onUpdate({ questionFrequency: v as UserSettings['questionFrequency'] })} />
        <ToggleRow label={c.labelExampleDensity} options={c.exampleDensityOptions} value={settings.exampleDensity} onChange={v => onUpdate({ exampleDensity: v as UserSettings['exampleDensity'] })} />
        <ToggleRow label={c.labelDiagramFrequency} options={c.diagramFrequencyOptions} value={settings.diagramFrequency} onChange={v => onUpdate({ diagramFrequency: v as UserSettings['diagramFrequency'] })} />
      </SettingsSection>

      <SettingsSection title={c.sectionPacingDifficulty} icon={<Gauge className="w-5 h-5 text-accent-amber" />} delay={0.15}>
        <ToggleRow label={c.labelPacing} options={c.pacingOptions} value={settings.pacing} onChange={v => onUpdate({ pacing: v as UserSettings['pacing'] })} />
        <ToggleRow label={c.labelChallengeLevel} options={c.challengeLevelOptions} value={settings.challengeLevel} onChange={v => onUpdate({ challengeLevel: v as UserSettings['challengeLevel'] })} />
        <ToggleRow label={c.labelLessonLength} options={c.lessonLengthOptions} value={settings.lessonLength} onChange={v => onUpdate({ lessonLength: v as UserSettings['lessonLength'] })} />
        <SliderRow label={c.labelMasteryThreshold} leftLabel="60%" rightLabel="100%" value={settings.masteryThreshold} onChange={v => onUpdate({ masteryThreshold: v })} min={60} max={100} />
      </SettingsSection>

      <SettingsSection title={c.sectionPracticeRevision} icon={<Target className="w-5 h-5 text-accent-cyan" />} delay={0.2}>
        <ToggleRow label={c.labelPracticeIntensity} options={c.practiceIntensityOptions} value={settings.practiceIntensity} onChange={v => onUpdate({ practiceIntensity: v as UserSettings['practiceIntensity'] })} />
        <ToggleRow label={c.labelRevisionLoops} options={c.revisionLoopsOptions} value={settings.revisionLoops} onChange={v => onUpdate({ revisionLoops: v as UserSettings['revisionLoops'] })} />
      </SettingsSection>

      <SettingsSection title={t('pluginMarketplaceTitle')} icon={<Zap className="w-5 h-5 text-brand-400" />} delay={0.22}>
        <PluginMarketplacePanel />
      </SettingsSection>

      <SettingsSection title={c.sectionSourceContent} icon={<Shield className="w-5 h-5 text-accent-emerald" />} delay={0.25}>
        <ToggleRow label={c.labelSourceMode} options={c.sourceModeOptions} value={settings.sourceMode} onChange={v => onUpdate({ sourceMode: v as UserSettings['sourceMode'] })} />
        <p className="text-xs text-text-muted mt-1 px-1">
          {c.sourceModeHint}
        </p>
      </SettingsSection>

      <SettingsSection title={c.sectionStudyGoals} icon={<Calendar className="w-5 h-5 text-accent-rose" />} delay={0.3}>
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

      <SettingsSection title={c.sectionAiLlm} icon={<Brain className="w-5 h-5 text-brand-400" />} delay={0.32}>
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

      <SettingsSection title={c.sectionAccountSync} icon={<KeyRound className="w-5 h-5 text-accent-teal" />} delay={0.34}>
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
                className="text-accent hover:underline"
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

      <SettingsSection title={c.sectionInterface} icon={<Palette className="w-5 h-5 text-brand-300" />} delay={0.35}>
        <ToggleRow label={c.labelTheme} options={c.themeOptions} value={settings.theme} onChange={v => onUpdate({ theme: v as UserSettings['theme'] })} />
        <ToggleRow label={c.labelLanguage} options={c.languageOptions} value={settings.language} onChange={v => onUpdate({ language: v as UserSettings['language'] })} />
      </SettingsSection>

      <div className="lg:col-span-2">
        <ColorCodingReferencePanel />
      </div>

      <SettingsSection title={c.sectionDataProgress} icon={<Database className="w-5 h-5 text-accent-cyan" />} delay={0.38}>
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

      <SettingsSection title={c.sectionDeveloper} icon={<Gauge className="w-5 h-5 text-accent-amber" />} delay={0.39}>
        <p className="text-xs text-text-secondary">{c.developerHint}</p>
        <WorkspaceTTIPanel />
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

function SettingsSection({ title, icon, children, delay }: { title: string; icon: React.ReactNode; children: React.ReactNode; delay: number }) {
  return (
    <AnimatedCard delay={delay} padding="md">
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
