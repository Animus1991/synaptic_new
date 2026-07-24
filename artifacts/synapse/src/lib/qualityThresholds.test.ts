import { describe, expect, it } from 'vitest';
import {
  COURSE_PASS_THRESHOLD,
  EVAL_GROUNDING_FAITHFULNESS_MIN,
  GROUNDING_SPAN_RATIO_MIN,
  QUALITY_STAGE,
  STRICT_MIN_FAITHFULNESS,
} from './qualityThresholds';

describe('qualityThresholds stage 3', () => {
  it('is at final pre-launch stage', () => {
    expect(QUALITY_STAGE).toBe(3);
  });

  it('uses pre-launch span and faithfulness targets', () => {
    expect(GROUNDING_SPAN_RATIO_MIN).toBe(0.95);
    expect(EVAL_GROUNDING_FAITHFULNESS_MIN).toBe(0.95);
    expect(STRICT_MIN_FAITHFULNESS).toBe(0.95);
    expect(COURSE_PASS_THRESHOLD).toBe(75);
  });
});
