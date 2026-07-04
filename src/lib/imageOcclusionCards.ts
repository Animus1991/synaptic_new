import type { UploadedFile } from '../types';
import { t, type Lang } from './i18n';
import type { OcrStoredRegion } from './readerOcrOverlay';
import type { LeitnerCard } from './leitnerSessionModel';

export type ImageOcclusionPayload = {
  sourceFileId: string;
  sourceFileName: string;
  pageIndex: number;
  region: Pick<OcrStoredRegion, 'left' | 'top' | 'width' | 'height'>;
  hiddenLabel: string;
};

const MIN_LABEL_LEN = 2;
const MAX_LABEL_LEN = 40;

export function isOcclusionCandidate(region: OcrStoredRegion): boolean {
  const text = region.text.trim();
  if (text.length < MIN_LABEL_LEN || text.length > MAX_LABEL_LEN) return false;
  if (/^\d+([.,]\d+)?$/.test(text)) return false;
  if ((region.confidence ?? 1) < 0.45) return false;
  return true;
}

export function pickOcclusionCandidates(
  regions: OcrStoredRegion[],
  max = 6,
): OcrStoredRegion[] {
  const seen = new Set<string>();
  const picked: OcrStoredRegion[] = [];
  for (const region of regions) {
    if (!isOcclusionCandidate(region)) continue;
    const key = region.text.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(region);
    if (picked.length >= max) break;
  }
  return picked;
}

export function buildOcclusionCardFromRegion(
  file: UploadedFile,
  region: OcrStoredRegion,
  lang: Lang,
): LeitnerCard {
  const label = region.text.trim();
  return {
    front: t('leitnerOcclusionCardFront', lang).replace('{fileName}', file.name),
    back: label,
    cardType: 'occlusion',
    occlusion: {
      sourceFileId: file.id,
      sourceFileName: file.name,
      pageIndex: region.pageIndex,
      region: {
        left: region.left,
        top: region.top,
        width: region.width,
        height: region.height,
      },
      hiddenLabel: label,
    },
  };
}

export function buildOcclusionCardsFromFiles(
  files: UploadedFile[],
  lang: Lang,
  maxPerFile = 3,
): LeitnerCard[] {
  const cards: LeitnerCard[] = [];
  for (const file of files) {
    if (!file.ocrRegions?.length) continue;
    const candidates = pickOcclusionCandidates(file.ocrRegions, maxPerFile);
    for (const region of candidates) {
      cards.push(buildOcclusionCardFromRegion(file, region, lang));
    }
  }
  return cards;
}
