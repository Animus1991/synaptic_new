import { Capacitor } from '@capacitor/core';
import { NOTEBOOKLM_URL } from './platformFocus';

export type NotebookLmOpenOptions = {
  sourceTitle?: string;
  lang?: 'en' | 'el';
};

function buildClipboardHint(opts?: NotebookLmOpenOptions): string | undefined {
  if (!opts?.sourceTitle?.trim()) return undefined;
  const title = opts.sourceTitle.trim();
  return opts.lang === 'el'
    ? `Synapse → NotebookLM: ανέβασε ή επικόλλησε το υλικό «${title}» στο σημειωματάριό σου.`
    : `Synapse → NotebookLM: upload or paste material «${title}» into your notebook.`;
}

/** Open NotebookLM — in-app browser on native, new tab on web. Optionally copies source hint. */
export async function openNotebookLm(opts?: NotebookLmOpenOptions): Promise<void> {
  const hint = buildClipboardHint(opts);
  if (hint && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(hint);
    } catch {
      // Clipboard optional — opening NLM still succeeds.
    }
  }

  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: NOTEBOOKLM_URL, presentationStyle: 'fullscreen' });
    return;
  }

  window.open(NOTEBOOKLM_URL, '_blank', 'noopener,noreferrer');
}

export function notebookLmSourceLabel(fileName: string, ingestMethod?: string): string {
  if (ingestMethod === 'notebooklm-import' || ingestMethod === 'notebooklm-chat' || ingestMethod === 'notebooklm-audio-transcript') {
    return fileName.replace(/\.md$/i, '');
  }
  return fileName;
}
