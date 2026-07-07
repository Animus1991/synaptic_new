import { runRetentionSweep } from '../lib/retentionSweep';

const INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;

/** OPS-01/02 — daily retention sweep for audit logs and transcribe jobs. */
export function initRetentionCron(): void {
  if (process.env.NODE_ENV === 'test') return;

  const tick = () => {
    runRetentionSweep()
      .then((result) => {
        if (result.auditLogsPurged > 0 || result.transcribeJobsPurged > 0) {
          console.log(
            `[retention] purged audit=${result.auditLogsPurged} transcribe=${result.transcribeJobsPurged}`,
          );
        }
      })
      .catch((err) => {
        console.warn('[retention] sweep failed:', err instanceof Error ? err.message : err);
      });
  };

  setTimeout(tick, STARTUP_DELAY_MS).unref();
  setInterval(tick, INTERVAL_MS).unref();
}
