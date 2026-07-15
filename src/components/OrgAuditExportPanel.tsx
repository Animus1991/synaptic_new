import { useState } from 'react';
import { ChevronDown, Download, Shield } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import { downloadAuditLogExport } from '../lib/orgClient';
import { cn } from '../utils/cn';

type Props = {
  orgId: string;
  settings: UserSettings;
  lang: 'en' | 'el';
};

const COPY = {
  en: {
    title: 'Compliance & audit export',
    hint: 'SOC2/FERPA audit bundle for org administrators. Includes mutating actions, IP, and timestamps.',
    toggle: 'Show export options',
    csv: 'Download CSV',
    json: 'Download JSON',
    exporting: 'Preparing…',
    error: 'Export failed — verify org_admin role.',
  },
  el: {
    title: 'Συμμόρφωση & εξαγωγή audit',
    hint: 'Πακέτο audit SOC2/FERPA για org administrators. Περιλαμβάνει ενέργειες, IP και χρονικές σφραγίδες.',
    toggle: 'Εμφάνιση επιλογών εξαγωγής',
    csv: 'Λήψη CSV',
    json: 'Λήψη JSON',
    exporting: 'Προετοιμασία…',
    error: 'Η εξαγωγή απέτυχε — επιβεβαιώστε ρόλο org_admin.',
  },
} as const;

export function OrgAuditExportPanel({ orgId, settings, lang }: Props) {
  const ui = COPY[lang];
  const token = settings.authToken?.trim();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!token) return null;

  const handleExport = async (format: 'csv' | 'json') => {
    setBusy(format);
    setError(null);
    try {
      const blob = await downloadAuditLogExport(token, settings, orgId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${orgId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(ui.error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pt-3 border-t border-border-subtle/50" data-testid="org-audit-export-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
        data-testid="org-audit-export-toggle"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-text-primary">
          <Shield className="w-3.5 h-3.5 text-brand-500" />
          {ui.title}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-5">
          <p className="text-[10px] text-text-muted">{ui.hint}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void handleExport('csv')}
              data-testid="org-audit-export-csv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] hover:border-brand-500/40 disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {busy === 'csv' ? ui.exporting : ui.csv}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void handleExport('json')}
              data-testid="org-audit-export-json"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] hover:border-brand-500/40 disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {busy === 'json' ? ui.exporting : ui.json}
            </button>
          </div>
          {error && (
            <p className="text-[10px] text-accent-rose" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
