import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedConceptBusPusher } from './conceptBusSessionSync';

describe('conceptBusSessionSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces multiple schedule calls into one push', async () => {
    const push = vi.fn().mockResolvedValue({});
    const pusher = createDebouncedConceptBusPusher(push, { debounceMs: 1000 });

    pusher.schedule();
    pusher.schedule();
    pusher.schedule();
    expect(push).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('flush runs immediately and clears pending debounce', async () => {
    const push = vi.fn().mockResolvedValue({});
    const pusher = createDebouncedConceptBusPusher(push, { debounceMs: 5000 });

    pusher.schedule();
    await pusher.flush();
    expect(push).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('skips push when disabled', async () => {
    const push = vi.fn().mockResolvedValue({});
    const pusher = createDebouncedConceptBusPusher(push, {
      debounceMs: 100,
      isEnabled: () => false,
    });

    pusher.schedule();
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();
    expect(push).not.toHaveBeenCalled();
  });

  it('swallows push errors', async () => {
    const push = vi.fn().mockRejectedValue(new Error('network'));
    const pusher = createDebouncedConceptBusPusher(push, { debounceMs: 100 });

    pusher.schedule();
    vi.advanceTimersByTime(100);
    await expect(vi.runAllTimersAsync()).resolves.not.toThrow();
  });
});
