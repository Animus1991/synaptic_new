import { describe, expect, it } from 'vitest';
import { looksLikeUtf8Mojibake, repairUtf8Mojibake } from './utf8MojibakeRepair';

describe('utf8MojibakeRepair', () => {
  it('detects common mojibake markers', () => {
    expect(looksLikeUtf8Mojibake('intersect έΑΦ at')).toBe(true);
    expect(looksLikeUtf8Mojibake('Supply and Demand')).toBe(false);
  });

  it('fixes em-dash mojibake from demo seed corruption', () => {
    expect(repairUtf8Mojibake('curves intersect έΑΦ at the equilibrium')).toBe(
      'curves intersect — at the equilibrium',
    );
  });

  it('is idempotent on clean UTF-8', () => {
    const clean = 'Διανομή εισοδήματος — Market equilibrium';
    expect(repairUtf8Mojibake(clean)).toBe(clean);
  });
});
