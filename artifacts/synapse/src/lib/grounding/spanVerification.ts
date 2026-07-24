/**
 * Span-level grounding: numeric, entity, and phrase verification against source text.
 */

import { splitSentences } from '../contentAnalysis';
import type { GroundingCheck, GroundingResult, GroundingSpan, VerifyGroundingOptions } from './types';

function normalizeNumber(value: string): string {
  return value
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function findNumberInText(value: string, text: string): GroundingSpan | null {
  const normalized = normalizeNumber(value);
  if (!/\d/.test(normalized)) return null;
  const cleanText = text.toLowerCase().replace(/,/g, '').replace(/\s+/g, '');

  const idx = cleanText.indexOf(normalized);
  if (idx >= 0) {
    return {
      type: 'number',
      value,
      charStart: idx,
      charEnd: idx + normalized.length,
      confidence: 0.95,
    };
  }

  const numMatch = normalized.match(/^\d+(?:\.\d+)?/);
  if (numMatch) {
    const numValue = parseFloat(numMatch[0]);
    const sourceNumbers = [...text.matchAll(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?|\b\d+(?:\.\d+)?\b/g)];
    for (const m of sourceNumbers) {
      const raw = m[0]!.replace(/,/g, '');
      const parsed = parseFloat(raw);
      if (Math.abs(parsed - numValue) < 0.001 * Math.max(1, numValue)) {
        return {
          type: 'number',
          value,
          charStart: m.index!,
          charEnd: m.index! + m[0].length,
          confidence: 0.8,
        };
      }
    }
  }

  return null;
}

function findEntityInText(value: string, text: string): GroundingSpan | null {
  const lowerValue = value.toLowerCase();
  const idx = text.toLowerCase().indexOf(lowerValue);
  if (idx >= 0) {
    return {
      type: 'entity',
      value,
      charStart: idx,
      charEnd: idx + value.length,
      confidence: 0.95,
    };
  }

  const words = lowerValue.split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 2) {
    for (const word of words) {
      const widx = text.toLowerCase().indexOf(word);
      if (widx >= 0) {
        return {
          type: 'entity',
          value,
          charStart: widx,
          charEnd: widx + word.length,
          confidence: 0.65,
        };
      }
    }
  }

  return null;
}

function findPhraseInText(value: string, text: string): GroundingSpan | null {
  const lowerValue = value.toLowerCase();
  const idx = text.toLowerCase().indexOf(lowerValue);
  if (idx >= 0) {
    return {
      type: 'phrase',
      value,
      charStart: idx,
      charEnd: idx + value.length,
      confidence: 0.85,
    };
  }
  return null;
}

function extractVerifiableSpans(claim: string): GroundingSpan[] {
  const spans: GroundingSpan[] = [];

  for (const m of claim.matchAll(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:%|percent|kg|km|m|cm|mm|ms|s|h|°C|°F|m²|m³)?\b/gi)) {
    spans.push({ type: 'number', value: m[0]!, charStart: -1, charEnd: -1, confidence: 0 });
  }

  for (const m of claim.matchAll(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\b/g)) {
    const value = m[0]!;
    if (value.length < 4) continue;
    spans.push({ type: 'entity', value, charStart: -1, charEnd: -1, confidence: 0 });
  }

  for (const m of claim.matchAll(/"([^"]{4,80})"/g)) {
    spans.push({ type: 'phrase', value: m[1]!, charStart: -1, charEnd: -1, confidence: 0 });
  }

  return spans;
}

function verifyClaim(claim: string, sourceText: string): GroundingCheck {
  const spans = extractVerifiableSpans(claim);
  if (spans.length === 0) {
    return { claim, spans: [], score: 0.5, grounded: true };
  }

  let totalScore = 0;
  const verified: GroundingSpan[] = [];

  for (const span of spans) {
    let found: GroundingSpan | null = null;
    if (span.type === 'number') found = findNumberInText(span.value, sourceText);
    else if (span.type === 'entity') found = findEntityInText(span.value, sourceText);
    else found = findPhraseInText(span.value, sourceText);

    if (found) {
      verified.push(found);
      totalScore += found.confidence;
    } else {
      verified.push({ ...span, charStart: -1, charEnd: -1, confidence: 0 });
    }
  }

  const score = totalScore / spans.length;
  return { claim, spans: verified, score, grounded: score >= 0.95 };
}

export function verifyGrounding(
  claims: string[],
  sourceText: string,
  options: VerifyGroundingOptions = {},
): GroundingResult {
  const { strict = false, minScore = 0.95 } = options;
  const checks = claims
    .map((c) => c.trim())
    .filter(Boolean)
    .map((claim) => verifyClaim(claim, sourceText));

  if (checks.length === 0) {
    return { checks: [], faithfulness: 0, groundedRatio: 0, strictPass: false };
  }

  const faithfulness = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
  const groundedRatio = checks.filter((c) => c.grounded).length / checks.length;
  const strictPass = strict ? groundedRatio === 1 : faithfulness >= minScore;

  return {
    checks,
    faithfulness,
    groundedRatio,
    strictPass,
  };
}

export function verifySentence(sentence: string, sourceText: string): GroundingCheck {
  return verifyClaim(sentence, sourceText);
}

export function verifyAnswer(answer: string, sourceText: string): GroundingResult {
  const claims = splitSentences(answer);
  return verifyGrounding(claims, sourceText);
}
