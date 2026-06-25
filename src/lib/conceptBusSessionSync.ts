/**
 * Debounced background push of concept bus + step schedules during study.
 * Fails silently so the learner is never interrupted mid-session.
 */

export type DebouncedConceptBusPusher = {
  schedule: () => void;
  flush: () => Promise<void>;
  cancel: () => void;
};

export function createDebouncedConceptBusPusher(
  push: () => Promise<unknown>,
  opts?: {
    debounceMs?: number;
    isEnabled?: () => boolean;
  },
): DebouncedConceptBusPusher {
  const debounceMs = opts?.debounceMs ?? 2500;
  const isEnabled = opts?.isEnabled ?? (() => true);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<unknown> | null = null;
  let pendingAfterFlight = false;

  const runPush = async (): Promise<void> => {
    if (!isEnabled()) return;
    if (inFlight) {
      pendingAfterFlight = true;
      return;
    }
    try {
      inFlight = push();
      await inFlight;
    } catch {
      /* offline / auth — keep local state */
    } finally {
      inFlight = null;
      if (pendingAfterFlight) {
        pendingAfterFlight = false;
        await runPush();
      }
    }
  };

  return {
    schedule() {
      if (!isEnabled()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void runPush();
      }, debounceMs);
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await runPush();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
