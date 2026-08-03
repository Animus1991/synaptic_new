/**
 * Daily check-in reminders via Capacitor Local Notifications (native)
 * with Web Notification API fallback (browser/PWA).
 */

import { Capacitor } from '@capacitor/core';
import type { Lang } from './i18n';
import { loadJson, saveJson } from './persistence';
import { isCheckInComplete, loadDailyCheckIn } from './dailyLearningCheckIn';

export const CHECKIN_NOTIF_ID = 42001;
const PREFS_KEY = 'daily-checkin-notif-prefs-v1';

export type CheckInNotifPrefs = {
  enabled: boolean;
  /** Local hour 0–23 for the soft morning nudge. */
  hour: number;
  minute: number;
};

const DEFAULT_PREFS: CheckInNotifPrefs = {
  enabled: true,
  hour: 9,
  minute: 0,
};

export function loadCheckInNotifPrefs(): CheckInNotifPrefs {
  const stored = loadJson<Partial<CheckInNotifPrefs> | null>(PREFS_KEY, null);
  return {
    enabled: stored?.enabled ?? DEFAULT_PREFS.enabled,
    hour: typeof stored?.hour === 'number' ? stored.hour : DEFAULT_PREFS.hour,
    minute: typeof stored?.minute === 'number' ? stored.minute : DEFAULT_PREFS.minute,
  };
}

export function saveCheckInNotifPrefs(patch: Partial<CheckInNotifPrefs>): CheckInNotifPrefs {
  const next = { ...loadCheckInNotifPrefs(), ...patch };
  saveJson(PREFS_KEY, next);
  return next;
}

function copy(lang: Lang): { title: string; body: string } {
  if (lang === 'el') {
    return {
      title: 'Ήπιο check-in μελέτης',
      body: 'Όποτε θες, στο chat κλείνουμε μαζί το σημερινό πλάνο — ένα tap αρκεί.',
    };
  }
  return {
    title: 'Gentle study check-in',
    body: 'Whenever you like, we can close today’s plan in chat together — one tap is enough.',
  };
}

function nextFireDate(hour: number, minute: number, now = new Date()): Date {
  const at = new Date(now);
  at.setHours(hour, minute, 0, 0);
  if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

async function scheduleNative(lang: Lang, prefs: CheckInNotifPrefs): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;

    await LocalNotifications.cancel({ notifications: [{ id: CHECKIN_NOTIF_ID }] });
    if (!prefs.enabled) return true;

    // Skip scheduling if today's check-in is already complete — still schedule tomorrow.
    const record = loadDailyCheckIn();
    const at = isCheckInComplete(record)
      ? (() => {
          const d = nextFireDate(prefs.hour, prefs.minute);
          // ensure at least tomorrow morning if already complete today before reminder hour
          if (d.getDate() === new Date().getDate()) d.setDate(d.getDate() + 1);
          return d;
        })()
      : nextFireDate(prefs.hour, prefs.minute);

    const { title, body } = copy(lang);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: CHECKIN_NOTIF_ID,
          title,
          body,
          schedule: { at, every: 'day', allowWhileIdle: true },
          extra: { kind: 'daily-checkin' },
          actionTypeId: 'OPEN_AGENT_CHECKIN',
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

async function scheduleWeb(lang: Lang, prefs: CheckInNotifPrefs): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (!prefs.enabled) {
    clearWebTimer();
    return true;
  }
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') return false;

  clearWebTimer();
  const delay = nextFireDate(prefs.hour, prefs.minute).getTime() - Date.now();
  const { title, body } = copy(lang);
  const timer = window.setTimeout(() => {
    if (isCheckInComplete(loadDailyCheckIn())) {
      void scheduleWeb(lang, prefs); // roll to next day
      return;
    }
    try {
      const n = new Notification(title, { body, tag: 'synapse-daily-checkin' });
      n.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('synapse:open-daily-checkin'));
        n.close();
      };
    } catch {
      /* ignore */
    }
    void scheduleWeb(lang, prefs);
  }, Math.max(delay, 1000));
  (window as unknown as { __synapseCheckInTimer?: number }).__synapseCheckInTimer = timer;
  return true;
}

function clearWebTimer(): void {
  const w = window as unknown as { __synapseCheckInTimer?: number };
  if (w.__synapseCheckInTimer) {
    clearTimeout(w.__synapseCheckInTimer);
    w.__synapseCheckInTimer = undefined;
  }
}

/** Request permission + schedule (or cancel) the daily check-in reminder. */
export async function syncDailyCheckInLocalNotifications(
  lang: Lang,
  prefs: CheckInNotifPrefs = loadCheckInNotifPrefs(),
): Promise<'native' | 'web' | 'disabled' | 'denied'> {
  if (!prefs.enabled) {
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.cancel({ notifications: [{ id: CHECKIN_NOTIF_ID }] });
      } catch { /* ignore */ }
    }
    clearWebTimer();
    return 'disabled';
  }

  if (await scheduleNative(lang, prefs)) return 'native';
  if (await scheduleWeb(lang, prefs)) return 'web';
  return 'denied';
}

/** Wire tap → open Agent check-in (native + custom web event). */
export function bindDailyCheckInNotificationOpen(
  onOpen: () => void,
): () => void {
  const onWeb = () => onOpen();
  window.addEventListener('synapse:open-daily-checkin', onWeb);

  let removeNative: (() => void) | undefined;
  if (Capacitor.isNativePlatform()) {
    void (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const handle = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (event) => {
            const kind = (event.notification.extra as { kind?: string } | undefined)?.kind;
            if (kind === 'daily-checkin' || event.notification.id === CHECKIN_NOTIF_ID) {
              onOpen();
            }
          },
        );
        removeNative = () => {
          void handle.remove();
        };
      } catch {
        /* plugin missing */
      }
    })();
  }

  return () => {
    window.removeEventListener('synapse:open-daily-checkin', onWeb);
    removeNative?.();
  };
}
