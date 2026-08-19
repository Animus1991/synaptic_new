import { beforeAll, describe, it, expect } from 'vitest';

import { buildApkgBlob, parseApkgBuffer } from './ankiApkg';

const WASM_TIMEOUT_MS = 30_000;

describe('ankiApkg roundtrip', () => {
  beforeAll(async () => {
    await parseApkgBuffer(await (await buildApkgBlob([], 'warmup')).arrayBuffer());
  }, WASM_TIMEOUT_MS);

  it('exports and re-imports Basic cards', async () => {
    const cards = [
      { front: 'What is FSRS?', back: 'Free Spaced Repetition Scheduler', tags: ['synapse:fsrs'] },
      { front: 'Capital of Greece', back: 'Athens' },
    ];
    const blob = await buildApkgBlob(cards, 'Synapse Test');
    const parsed = await parseApkgBuffer(await blob.arrayBuffer());
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      front: 'What is FSRS?',
      back: 'Free Spaced Repetition Scheduler',
      tags: ['synapse:fsrs'],
    });
    expect(parsed[1]).toMatchObject({ front: 'Capital of Greece', back: 'Athens' });
  }, WASM_TIMEOUT_MS);
});
