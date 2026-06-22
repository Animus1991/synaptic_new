import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, BookOpen, Cpu, Database, FileText, Layers, RefreshCw,
  Shield, Sparkles, Users, Zap,
} from 'lucide-react';
import type { UserSettings } from '../types';
import { fetchTeacherDashboard } from '../lib/authClient';
import { listLearningEvents, countLearningEventsByType } from '../lib/learningEvents';
import { cn } from '../utils/cn';

export type TeacherDashboardData = {
  account: { id: string; email: string; plan: string };
  usage: {
    month: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    quota: number;
    remainingTokens: number;
  };
  library: { courseCount: number; fileCount: number; topicCount: number };
  features: { embeddings: boolean; rag: boolean; ner: boolean; stripe: boolean; ocr?: boolean };
};

interface Props {
  settings: UserSettings;
  lang?: 'en' | 'el';
}

export function TeacherDashboard({ settings, lang = settings.language ?? 'en' }: Props) {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const localEvents = countLearningEventsByType();
  const recentEvents = listLearningEvents(8);

  const load = async () => {
    if (!settings.authToken?.trim()) {
      setError(lang === 'el' ? 'Σύνδεση απαιτείται για τον πίνακα εκπαιδευτή.' : 'Sign in required for the teacher dashboard.');
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = (await fetchTeacherDashboard(settings.authToken, settings)) as TeacherDashboardData;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [settings.authToken, settings.llmProxyUrl, settings.authProxyBase]);

  const el = lang === 'el';
  const usagePct = data
    ? Math.min(100, Math.round(((data.usage.promptTokens + data.usage.completionTokens) / Math.max(1, data.usage.quota)) * 100))
    : 0;

  return (
    <div className="p-4 sm:p-6 lg:px-8 pb-24 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-400" />
            {el ? 'Πίνακας Εκπαιδευτή' : 'Teacher Dashboard'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {el
              ? 'Χρήση proxy, βιβλιοθήκη μαθημάτων και τοπικά learning events.'
              : 'Proxy usage, course library aggregates, and local learning events.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle text-sm hover:border-brand-500/30 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          {el ? 'Ανανέωση' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={BookOpen}
              label={el ? 'Μαθήματα' : 'Courses'}
              value={String(data.library.courseCount)}
              sub={el ? 'στη βιβλιοθήκη' : 'in library'}
            />
            <StatCard
              icon={FileText}
              label={el ? 'Αρχεία' : 'Source files'}
              value={String(data.library.fileCount)}
              sub={el ? 'ανεβασμένα' : 'uploaded'}
            />
            <StatCard
              icon={Layers}
              label={el ? 'Ενότητες' : 'Topics'}
              value={String(data.library.topicCount)}
              sub={el ? 'συνολικά' : 'total'}
            />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-amber" />
                {el ? 'Χρήση LLM (μήνας)' : 'LLM usage (month)'}
              </h2>
              <span className="text-xs text-text-muted">{data.account.email} · {data.account.plan}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', usagePct > 85 ? 'bg-accent-rose' : 'bg-brand-500')}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div><p className="text-lg font-bold">{data.usage.requests}</p><p className="text-text-muted">{el ? 'Αιτήματα' : 'Requests'}</p></div>
              <div><p className="text-lg font-bold">{data.usage.promptTokens.toLocaleString()}</p><p className="text-text-muted">Prompt</p></div>
              <div><p className="text-lg font-bold">{data.usage.completionTokens.toLocaleString()}</p><p className="text-text-muted">Completion</p></div>
              <div><p className="text-lg font-bold">{data.usage.remainingTokens.toLocaleString()}</p><p className="text-text-muted">{el ? 'Υπόλοιπο' : 'Remaining'}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-accent-cyan" />
              {el ? 'Δυνατότητες διακομιστή' : 'Server capabilities'}
            </h2>
            <div className="flex flex-wrap gap-2">
              <FeaturePill on={data.features.embeddings} label="Embeddings" />
              <FeaturePill on={data.features.rag} label="RAG" />
              <FeaturePill on={data.features.ner} label="NER" />
              <FeaturePill on={data.features.ocr ?? true} label="OCR" />
              <FeaturePill on={data.features.stripe} label="Stripe" />
            </div>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl border border-border-subtle bg-surface-card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-brand-300" />
          {el ? 'Τοπικά learning events' : 'Local learning events'}
        </h2>
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {Object.entries(localEvents).map(([type, count]) => (
            <span key={type} className="px-2 py-1 rounded-lg bg-surface-hover border border-border-subtle">
              {type}: <strong>{count}</strong>
            </span>
          ))}
          {Object.keys(localEvents).length === 0 && (
            <span className="text-text-muted">{el ? 'Κανένα event ακόμα.' : 'No events yet.'}</span>
          )}
        </div>
        <ul className="space-y-2 text-xs text-text-secondary">
          {recentEvents.map((e) => (
            <li key={e.id} className="flex justify-between gap-2 border-b border-border-subtle/50 pb-1">
              <span className="font-medium text-text-primary">{e.type}</span>
              <span className="text-text-muted shrink-0">{new Date(e.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      {!settings.authToken && (
        <div className="rounded-xl border border-border-subtle bg-surface-hover/40 p-4 text-sm text-text-secondary flex gap-3">
          <Shield className="w-5 h-5 text-brand-400 shrink-0" />
          <p>
            {el
              ? 'Συνδέσου στο proxy από τις Ρυθμίσεις για χρήση, quotas και βιβλιοθήκη server-side.'
              : 'Sign in via Settings → Proxy account to load server usage, quotas, and synced library stats.'}
          </p>
        </div>
      )}

      <div className="text-[10px] text-text-muted flex items-center gap-1.5">
        <Database className="w-3 h-3" />
        <Sparkles className="w-3 h-3" />
        {el ? 'Συγχρονίζεται με GET /v1/teacher/dashboard όταν υπάρχει auth token.' : 'Syncs with GET /v1/teacher/dashboard when an auth token is set.'}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
      <Icon className="w-5 h-5 text-brand-400 mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-text-muted">{label} · {sub}</p>
    </div>
  );
}

function FeaturePill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        'text-xs px-2.5 py-1 rounded-full border',
        on ? 'border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald' : 'border-border-subtle text-text-muted',
      )}
    >
      {on ? '✓' : '○'} {label}
    </span>
  );
}
